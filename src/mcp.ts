import { McpServer, type ToolAnnotations } from "@modelcontextprotocol/server";
import { z } from "zod";
import { version } from "../package.json";
import {
    CompanyExcludeFiltersSchema,
    CompanyLookupInputSchema,
    CompanySearchFilterShape,
    CompanySimilarFilterShape,
    EnrichCompanyByPropertiesShape,
    PersonIdSchema,
    PersonSearchFilterShape,
} from "./schema";
import {
    type ApiRequestOptions,
    apiRequest,
    type QueryValue,
    toolError,
} from "./utils";

type UnknownRecord = Record<string, unknown>;
type QueryParams = Record<string, QueryValue>;

const companyCommonFilterKeys = [
    "foundedYear",
    "fundingAmount",
    "fundingYear",
    "categoryOperator",
    "keywordsOperator",
    "technologiesOperator",
    "workforceGrowth",
    "workforceSize",
    "require",
    "regions",
    "states",
    "cities",
    "type",
    "employees",
    "revenue",
    "naicsCode",
    "keywords",
    "technologies",
    "fundingRounds",
];

const personSearchFilterKeys = [
    "query",
    "atCurrentCompanyAfter",
    "atCurrentCompanyBefore",
    "atCurrentPositionAfter",
    "atCurrentPositionBefore",
    "countries",
    "domains",
    "seniority",
    "department",
];

const pageInputShape = {
    page: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number, 1-indexed."),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Number of results per page, from 1 to 100."),
};

const includeWorkforceShape = {
    includeWorkforce: z
        .boolean()
        .optional()
        .default(false)
        .describe(
            "When true, requests expanded workforce insights. Costs 5 additional credits per company.",
        ),
};

const serverInfo = {
    name: "CompanyEnrich MCP Server",
    version,
};

// The tool set is static, so clients speaking MCP 2026-07-28 may cache the
// tools/list result for an hour before asking again.
const toolsListCacheHint = {
    ttlMs: 60 * 60 * 1000,
    cacheScope: "private",
} as const;

function withToolAnnotations<TConfig extends { title: string }>(
    config: TConfig,
    annotations: Omit<ToolAnnotations, "title">,
) {
    return {
        ...config,
        annotations: {
            title: config.title,
            ...annotations,
        },
    };
}

function paidTool<TConfig extends { title: string }>(config: TConfig) {
    return withToolAnnotations(config, {
        readOnlyHint: false,
        destructiveHint: false,
    });
}

function readOnlyTool<TConfig extends { title: string }>(config: TConfig) {
    return withToolAnnotations(config, { readOnlyHint: true });
}

export type CompanyEnrichServerOptions = {
    /** Base URL of the CompanyEnrich API. */
    apiEndpoint: string;
    /** Returns the API key to use for the tool call being served. */
    getAccessToken: () => string | undefined;
};

/**
 * Builds the MCP server. This module stays free of runtime-specific imports
 * because both the Worker (`http.ts`) and the Node.js CLI (`stdio.ts`) use it.
 */
export function createCompanyEnrichMcpServer({
    apiEndpoint,
    getAccessToken,
}: CompanyEnrichServerOptions) {
    const server = new McpServer(serverInfo, {
        cacheHints: { "tools/list": toolsListCacheHint },
    });
    const request = (path: string, options: ApiRequestOptions = {}) =>
        apiRequest(apiEndpoint, getAccessToken(), path, options);

    server.registerTool(
        "enrich_company",
        paidTool({
            title: "Enrich Company Information",
            description:
                "Enriches a company by domain. Costs 1 credit per call, plus 5 additional credits when includeWorkforce is true.",
            inputSchema: z.object({
                domain: z
                    .string()
                    .describe(
                        "The domain name of the company to enrich, for example example.com.",
                    ),
                ...includeWorkforceShape,
            }),
        }),
        async ({ domain, includeWorkforce = false }) =>
            request("/companies/enrich", {
                query: {
                    domain,
                    ...workforceQuery(includeWorkforce),
                },
                notFoundMessage: `Company with domain "${domain}" not found in the database.`,
            }),
    );

    server.registerTool(
        "get_company_by_id",
        paidTool({
            title: "Get Company By ID",
            description:
                "Retrieves a company by CompanyEnrich company ID. Costs 1 credit per call, plus 5 additional credits when includeWorkforce is true.",
            inputSchema: z.object({
                id: z.string().uuid().describe("CompanyEnrich company ID."),
                ...includeWorkforceShape,
            }),
        }),
        async ({ id, includeWorkforce = false }) =>
            request("/companies", {
                query: {
                    id,
                    ...workforceQuery(includeWorkforce),
                },
                notFoundMessage: `Company with ID "${id}" not found in the database.`,
            }),
    );

    server.registerTool(
        "enrich_company_by_properties",
        paidTool({
            title: "Enrich Company By Properties",
            description:
                "Enriches a company by known properties such as name or social profile URL. Costs 1 credit per call, plus 5 additional credits when includeWorkforce is true.",
            inputSchema: z.object({
                ...EnrichCompanyByPropertiesShape,
                ...includeWorkforceShape,
            }),
        }),
        async ({ includeWorkforce = false, ...input }) => {
            const body = buildEnrichCompanyBody(input);
            if (Object.keys(body).length === 0) {
                return toolError(
                    "Provide at least one company property: name, linkedinUrl, linkedinId, twitterUrl, facebookUrl, instagramUrl, or youtubeUrl.",
                );
            }

            return request("/companies/enrich", {
                method: "POST",
                query: workforceQuery(includeWorkforce),
                body,
                notFoundMessage:
                    "Company matching the provided properties was not found in the database.",
            });
        },
    );

    server.registerTool(
        "get_company_workforce",
        paidTool({
            title: "Get Company Workforce Insights",
            description:
                "Returns workforce insights for a single company by CompanyEnrich company ID or domain. Costs 5 credits per successful call.",
            inputSchema: z.object({
                id: z
                    .string()
                    .uuid()
                    .optional()
                    .describe(
                        "CompanyEnrich company ID. Provide either id or domain.",
                    ),
                domain: z
                    .string()
                    .optional()
                    .describe(
                        "Company domain. Provide either id or domain.",
                    ),
            }),
        }),
        async ({ id, domain }) => {
            if ((id && domain) || (!id && !domain)) {
                return toolError(
                    "Provide exactly one lookup parameter: id or domain.",
                );
            }

            return request("/companies/workforce", {
                query: { id, domain },
                notFoundMessage: `Workforce insights for "${id ?? domain}" were not found in the database.`,
            });
        },
    );

    server.registerTool(
        "search_companies",
        paidTool({
            title: "Search Companies",
            description:
                "Searches companies with page-based pagination. semanticQuery is optional; use it for natural-language profile search, and use query for name/domain focused searches. Costs 1 credit per company returned, with a 1-credit minimum.",
            inputSchema: z.object({
                ...CompanySearchFilterShape,
                ...includeWorkforceShape,
                ...pageInputShape,
            }),
        }),
        async (input) => {
            const {
                includeWorkforce = false,
                page = 1,
                pageSize = 20,
            } = input;

            return request("/companies/search", {
                method: "POST",
                query: workforceQuery(includeWorkforce),
                body: {
                    ...buildCompanySearchBody(input),
                    page,
                    pageSize,
                },
            });
        },
    );

    server.registerTool(
        "find_similar_companies",
        paidTool({
            title: "Find Similar Companies",
            description:
                "Finds companies similar to one or more seed domains, with optional filters. Costs 5 credits per company returned, with a 5-credit minimum.",
            inputSchema: z.object({
                ...CompanySimilarFilterShape,
                ...includeWorkforceShape,
                ...pageInputShape,
            }),
        }),
        async (input) => {
            const {
                includeWorkforce = false,
                page = 1,
                pageSize = 20,
            } = input;

            return request("/companies/similar", {
                method: "POST",
                query: workforceQuery(includeWorkforce),
                body: {
                    ...buildCompanySimilarBody(input),
                    page,
                    pageSize,
                },
            });
        },
    );

    server.registerTool(
        "get_person_by_id",
        paidTool({
            title: "Get Person By ID",
            description:
                "Retrieves a person by CompanyEnrich person ID. Costs 2 credits per call.",
            inputSchema: z.object({
                id: PersonIdSchema.describe("CompanyEnrich person ID."),
            }),
        }),
        async ({ id }) =>
            request("/people", {
                query: { id },
                notFoundMessage: `Person with ID "${id}" not found in the database.`,
            }),
    );

    server.registerTool(
        "lookup_person_by_email",
        paidTool({
            title: "Lookup Person By Email",
            description:
                "Looks up a person by email address. The API resolves the company from the email domain and matches the local part. Costs 5 credits per successful call.",
            inputSchema: z.object({
                email: z
                    .string()
                    .email()
                    .describe(
                        "The email address of the person to look up.",
                    ),
            }),
        }),
        async ({ email }) =>
            request("/people/lookup", {
                method: "POST",
                body: { email },
                notFoundMessage: `Person with email "${email}" not found in the database.`,
            }),
    );

    server.registerTool(
        "enrich_person_email",
        paidTool({
            title: "Enrich Person Email",
            description:
                "BETA: Resolves a work email address for a single person ID and optional company domain. Costs 10 credits per newly accessed found email.",
            inputSchema: z.object({
                id: PersonIdSchema.describe("CompanyEnrich person ID."),
                domain: z
                    .string()
                    .optional()
                    .describe(
                        "Optional company domain. If omitted, current experience domains are tried.",
                    ),
            }),
        }),
        async ({ id, domain }) =>
            request("/people/email", {
                query: { id, domain },
                notFoundMessage: `Email enrichment target person "${id}" was not found in the database.`,
            }),
    );

    server.registerTool(
        "search_people",
        paidTool({
            title: "Search People",
            description:
                "Searches people with page-based pagination. positionQuery accepts either one string or an array of strings. Costs 2 credits per person returned, with a 2-credit minimum.",
            inputSchema: z.object({
                ...PersonSearchFilterShape,
                ...pageInputShape,
            }),
        }),
        async (input) => {
            const { page = 1, pageSize = 20 } = input;

            return request("/people/search", {
                method: "POST",
                body: {
                    ...buildPersonSearchBody(input),
                    page,
                    pageSize,
                },
            });
        },
    );

    server.registerTool(
        "get_current_user",
        readOnlyTool({
            title: "Get Current User",
            description:
                "Returns authenticated user credit balance and account capabilities. Free; no credits deducted.",
            inputSchema: z.object({}),
        }),
        async () => request("/me"),
    );

    return server;
}

function workforceQuery(includeWorkforce: boolean): QueryParams | undefined {
    return includeWorkforce ? { expand: "workforce" } : undefined;
}

function buildEnrichCompanyBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    copyDefined(body, input, [
        "name",
        "linkedinUrl",
        "linkedinId",
        "twitterUrl",
        "facebookUrl",
        "instagramUrl",
    ]);

    if (input.youtubeUrl !== undefined) {
        body.youTubeUrl = input.youtubeUrl;
    }

    return body;
}

function buildCompanySearchBody(input: UnknownRecord) {
    const body = buildCompanyCommonFilterBody(input);
    copyDefined(body, input, ["semanticQuery", "semanticWeight", "query"]);
    return body;
}

function buildCompanySimilarBody(input: UnknownRecord) {
    const body = buildCompanyCommonFilterBody(input);
    copyDefined(body, input, [
        "domains",
        "similarityWeight",
        "minScore",
        "query",
    ]);
    return body;
}

function buildCompanyCommonFilterBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    copyDefined(body, input, companyCommonFilterKeys);

    const countries = uniqueDefinedStrings([
        ...(Array.isArray(input.countries) ? input.countries : []),
        input.country,
    ]);
    if (countries.length > 0) {
        body.countries = countries;
    }

    if (input.categories !== undefined) {
        body.category = input.categories;
    }

    if (isRecord(input.exclude)) {
        body.exclude = buildCompanyExcludeBody(input.exclude);
    }

    return body;
}

function buildCompanyExcludeBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    const excludeKeys = Object.keys(CompanyExcludeFiltersSchema.shape).filter(
        (key) => key !== "categories",
    );
    copyDefined(body, input, excludeKeys);

    if (input.categories !== undefined) {
        body.category = input.categories;
    }

    return body;
}

function buildPersonSearchBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    copyDefined(body, input, personSearchFilterKeys);

    if (input.positionQuery !== undefined) {
        body.positionQuery = normalizeStringArray(input.positionQuery);
    }

    if (isRecord(input.exclude)) {
        body.exclude = buildPersonExcludeBody(input.exclude);
    }

    if (isRecord(input.companyFilter)) {
        body.companyFilter = buildCompanyLookupBody(input.companyFilter);
    }

    return body;
}

function buildPersonExcludeBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    copyDefined(body, input, [
        "countries",
        "domains",
        "seniority",
        "department",
    ]);

    if (input.positionQuery !== undefined) {
        body.positionQuery = normalizeStringArray(input.positionQuery);
    }

    return body;
}

function buildCompanyLookupBody(input: UnknownRecord) {
    const body: UnknownRecord = {};
    const parsed = CompanyLookupInputSchema.parse(input);

    if (parsed.search !== undefined) {
        body.search = buildCompanySearchBody(parsed.search);
    }

    if (parsed.similar !== undefined) {
        body.similar = buildCompanySimilarBody(parsed.similar);
    }

    return body;
}

function copyDefined(
    target: UnknownRecord,
    source: UnknownRecord,
    keys: string[],
) {
    for (const key of keys) {
        if (source[key] !== undefined) {
            target[key] = source[key];
        }
    }
}

function normalizeStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string");
    }

    return typeof value === "string" ? [value] : [];
}

function uniqueDefinedStrings(values: unknown[]) {
    return [
        ...new Set(
            values.filter(
                (value): value is string => typeof value === "string",
            ),
        ),
    ];
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
