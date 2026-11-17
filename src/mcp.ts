import { McpServer, type ToolAnnotations } from "@modelcontextprotocol/server";
import { z } from "zod";
import { version } from "../package.json";
import {
    CompanyExpandEnum,
    CompanyQuerySchema,
    CompanyQueryShape,
    EnrichCompanyByPropertiesShape,
    explainIssues,
    PersonExpandEnum,
    PersonIdSchema,
    PersonQuerySchema,
    PersonQueryShape,
} from "./schema";
import { type ApiRequestOptions, apiRequest, toolError } from "./utils";

/** All tools call version 2 of the CompanyEnrich API. */
const API_PREFIX = "/v2";

const FILTER_RULES_HELP =
    "Each value filter is an object: `in` matches any listed value, `notIn` excludes matches, and `all` (keywords, technologies, naicsCodes and categories only) requires every listed value.";

const COMPANY_EXPAND_HELP =
    "Each expansion (financial, keywords, naicsCodes, technologies, workforce) adds 1 credit per returned company.";

const PERSON_EXPAND_HELP =
    "Expansions: education adds 1 credit per returned person; company adds 1 credit per unique company whose profile is included.";

const CURSOR_HELP =
    "Results are paged with a cursor: pass `nextCursor` from the previous response as `cursor` and keep the rest of the query the same. Cursors expire after 24 hours.";

const SEMANTIC_AND_LOOKALIKE_ERROR =
    "A company query can use semantic or lookalike, not both. Remove one of them.";

const COUNT_RESULT_HELP =
    "Returns `count`, the matches your plan can access, and `total`, all matches. A semantic query also returns `interpretation`, the filters inferred from it.";

/**
 * A query argument of a count tool. The count tools take the same query as
 * the search tools, and those schemas are large, so here they are published
 * as plain objects and checked against the real schema when the tool runs.
 * Publishing them in full would nearly double the tools/list payload.
 */
function sameAs(tool: string, argument: string) {
    return z
        .looseObject({})
        .optional()
        .describe(`Same as \`${argument}\` in ${tool}.`);
}

const companyExpandShape = {
    expand: z
        .array(CompanyExpandEnum)
        .min(1)
        .optional()
        .describe(`Extra company data to include. ${COMPANY_EXPAND_HELP}`),
};

const personExpandShape = {
    expand: z
        .array(PersonExpandEnum)
        .min(1)
        .optional()
        .describe(`Extra person data to include. ${PERSON_EXPAND_HELP}`),
};

const cursorPageShape = {
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of results to return, from 1 to 100."),
    cursor: z
        .string()
        .min(1)
        .max(1024)
        .optional()
        .describe("`nextCursor` from the previous response. Omit for the first page."),
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
    /** Base URL of the CompanyEnrich API, without a version path. */
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
        apiRequest(apiEndpoint, getAccessToken(), `${API_PREFIX}${path}`, options);

    server.registerTool(
        "enrich_company",
        paidTool({
            title: "Enrich Company Information",
            description: `Enriches a company by domain. Costs 1 credit per successful enrichment. ${COMPANY_EXPAND_HELP} A company that cannot be found costs nothing.`,
            inputSchema: z.strictObject({
                domain: z
                    .string()
                    .min(1)
                    .max(1024)
                    .describe(
                        "The domain name of the company to enrich, for example example.com.",
                    ),
                ...companyExpandShape,
                waitForEnrichment: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether to wait for on-demand enrichment when the company is not stored yet. Defaults to true. Set false to return only stored data right away; a miss then schedules enrichment in the background.",
                    ),
            }),
        }),
        async ({ domain, expand, waitForEnrichment }) =>
            request("/companies/enrich", {
                query: { domain, expand, waitForEnrichment },
                notFoundMessage:
                    waitForEnrichment === false
                        ? `Company with domain "${domain}" is not stored yet. Enrichment was scheduled in the background where eligible, so try again later. No credits were charged.`
                        : `Company with domain "${domain}" was not found. No credits were charged.`,
            }),
    );

    server.registerTool(
        "get_company_by_id",
        paidTool({
            title: "Get Company By ID",
            description: `Retrieves a stored company by CompanyEnrich company ID. Costs 1 credit per company returned. ${COMPANY_EXPAND_HELP} A company that cannot be found costs nothing.`,
            inputSchema: z.strictObject({
                id: z.guid().describe("CompanyEnrich company ID."),
                ...companyExpandShape,
            }),
        }),
        async ({ id, expand }) =>
            request(`/companies/${encodeURIComponent(id)}`, {
                query: { expand },
                notFoundMessage: `Company with ID "${id}" was not found. No credits were charged.`,
            }),
    );

    server.registerTool(
        "enrich_company_by_properties",
        paidTool({
            title: "Enrich Company By Properties",
            description: `Resolves and enriches a company from identifying properties such as its name or a social profile URL. When several properties are given, all of them must match. Prefer enrich_company when the domain is known. Costs 1 credit when a company is returned or when the properties cannot be resolved to a company domain. ${COMPANY_EXPAND_HELP}`,
            inputSchema: z.strictObject({
                ...EnrichCompanyByPropertiesShape,
                ...companyExpandShape,
            }),
        }),
        async ({ expand, ...properties }) => {
            if (Object.values(properties).every((value) => value === undefined)) {
                return toolError(
                    `Provide at least one company property: ${Object.keys(EnrichCompanyByPropertiesShape).join(", ")}.`,
                );
            }

            return request("/companies/enrich", {
                method: "POST",
                body: { ...properties, expand },
                notFoundMessage:
                    "No company matched the provided properties.",
            });
        },
    );

    server.registerTool(
        "get_company_workforce",
        paidTool({
            title: "Get Company Workforce Insights",
            description:
                "Returns the current employee count, department headcounts and the latest 12 months of workforce history for one company, looked up by CompanyEnrich company ID or domain. Pass `nextCursor` from the response as `cursor`, with the same company, to get the preceding 12 months. Costs 1 credit per successful page. Cursors expire after 30 minutes.",
            inputSchema: z.strictObject({
                id: z
                    .guid()
                    .optional()
                    .describe(
                        "CompanyEnrich company ID. Provide either id or domain.",
                    ),
                domain: z
                    .string()
                    .min(1)
                    .max(1024)
                    .optional()
                    .describe("Company domain. Provide either id or domain."),
                cursor: z
                    .string()
                    .min(1)
                    .max(1024)
                    .optional()
                    .describe(
                        "`nextCursor` from a previous workforce response or from a company's workforce expansion. Omit for the latest 12 months.",
                    ),
            }),
        }),
        async ({ id, domain, cursor }) => {
            if ((id && domain) || (!id && !domain)) {
                return toolError(
                    "Provide exactly one lookup parameter: id or domain.",
                );
            }

            return request("/companies/workforce", {
                query: { id, domain, cursor },
                notFoundMessage: `Workforce insights for "${id ?? domain}" were not found. No credits were charged.`,
            });
        },
    );

    server.registerTool(
        "search_companies",
        paidTool({
            title: "Search Companies",
            description: `Searches companies in one of three ways: by filters alone, by a natural-language \`semantic\` query, or by \`lookalike\` seed domains (companies similar to the ones given). Filters can be combined with either; semantic and lookalike cannot be combined. A semantic query infers filters such as location, size and funding by default and reports them in \`interpretation\`. Costs per returned company: 1 credit for a filter search, 2 for semantic, 5 for lookalike; an empty result costs one result's price. ${COMPANY_EXPAND_HELP} ${FILTER_RULES_HELP} ${CURSOR_HELP}`,
            inputSchema: z.strictObject({
                ...CompanyQueryShape,
                ...companyExpandShape,
                ...cursorPageShape,
            }),
        }),
        async ({ filter, semantic, lookalike, expand, pageSize = 20, cursor }) => {
            if (semantic && lookalike) {
                return toolError(SEMANTIC_AND_LOOKALIKE_ERROR);
            }

            return request("/companies/search", {
                method: "POST",
                body: { filter, semantic, lookalike, expand, pageSize, cursor },
            });
        },
    );

    server.registerTool(
        "count_companies",
        readOnlyTool({
            title: "Count Companies",
            description: `Counts the companies a search_companies query would match, without returning them. Free; no credits deducted. Use it to size or check a query before running the paid search. Takes the same \`filter\`, \`semantic\` and \`lookalike\` arguments as search_companies. ${COUNT_RESULT_HELP}`,
            inputSchema: z.strictObject({
                filter: sameAs("search_companies", "filter"),
                semantic: sameAs("search_companies", "semantic"),
                lookalike: sameAs("search_companies", "lookalike"),
            }),
        }),
        async (input) => {
            const query = CompanyQuerySchema.safeParse(input);
            if (!query.success) {
                return toolError(
                    `Invalid arguments for tool count_companies: ${explainIssues(CompanyQuerySchema, query.error)}`,
                );
            }
            if (query.data.semantic && query.data.lookalike) {
                return toolError(SEMANTIC_AND_LOOKALIKE_ERROR);
            }

            return request("/companies/search/count", {
                method: "POST",
                body: query.data,
            });
        },
    );

    server.registerTool(
        "get_person_by_id",
        paidTool({
            title: "Get Person By ID",
            description: `Retrieves a stored person by CompanyEnrich person ID. Costs 2 credits per person returned. ${PERSON_EXPAND_HELP} A person that cannot be found costs nothing.`,
            inputSchema: z.strictObject({
                id: PersonIdSchema.describe("CompanyEnrich person ID."),
                ...personExpandShape,
            }),
        }),
        async ({ id, expand }) =>
            request(`/people/${encodeURIComponent(String(id))}`, {
                query: { expand },
                notFoundMessage: `Person with ID "${id}" was not found. No credits were charged.`,
            }),
    );

    server.registerTool(
        "lookup_person_by_email",
        paidTool({
            title: "Lookup Person By Email",
            description: `Identifies a person from an email address. The API resolves the company from the email domain and matches the person by common address patterns. Costs 5 credits when a person is returned. ${PERSON_EXPAND_HELP} No match costs nothing.`,
            inputSchema: z.strictObject({
                email: z
                    .email()
                    .max(320)
                    .describe("The email address of the person to look up."),
                ...personExpandShape,
            }),
        }),
        async ({ email, expand }) =>
            request("/people/enrich", {
                method: "POST",
                body: { email, expand },
                notFoundMessage: `No person matched the email "${email}". No credits were charged.`,
            }),
    );

    server.registerTool(
        "enrich_person_email",
        paidTool({
            title: "Find Person Work Email",
            description:
                "Finds the work email address of a person on a company domain. The response `status` is found, not-found, unavailable or pending; `email` is present only when found, and a pending lookup is still running, so call again later. Costs 10 credits when it finds an email your account has not accessed before; every other outcome is free.",
            inputSchema: z.strictObject({
                id: PersonIdSchema.describe("CompanyEnrich person ID."),
                domain: z
                    .string()
                    .min(1)
                    .max(1024)
                    .optional()
                    .describe(
                        "Company domain to find the email on. It must belong to one of the person's companies. If omitted, the person's current companies are tried.",
                    ),
            }),
        }),
        async ({ id, domain }) =>
            request(`/people/${encodeURIComponent(String(id))}/email`, {
                query: { domain },
                notFoundMessage: `Person with ID "${id}" was not found. No credits were charged.`,
            }),
    );

    server.registerTool(
        "search_people",
        paidTool({
            title: "Search People",
            description: `Searches people by person filters, a natural-language \`semantic\` query, and an optional \`company\` query that limits results to people whose current company matches. \`company\` takes the same filter, semantic and lookalike inputs as search_companies. A semantic query infers person filters and the kind of company to look in, and reports them in \`interpretation\`; it is rejected when nothing can be inferred. Top-level filters match current roles; use \`filter.pastExperience\` for previous jobs. Costs 2 credits per returned person; an empty result costs one result's price. ${PERSON_EXPAND_HELP} ${FILTER_RULES_HELP} ${CURSOR_HELP}`,
            inputSchema: z.strictObject({
                ...PersonQueryShape,
                ...personExpandShape,
                ...cursorPageShape,
            }),
        }),
        async ({ filter, semantic, company, expand, pageSize = 20, cursor }) => {
            if (company?.semantic && company.lookalike) {
                return toolError(SEMANTIC_AND_LOOKALIKE_ERROR);
            }

            return request("/people/search", {
                method: "POST",
                body: { filter, semantic, company, expand, pageSize, cursor },
            });
        },
    );

    server.registerTool(
        "count_people",
        readOnlyTool({
            title: "Count People",
            description: `Counts the people a search_people query would match, without returning them. Free; no credits deducted. Use it to size or check a query before running the paid search. Takes the same \`filter\`, \`semantic\` and \`company\` arguments as search_people. ${COUNT_RESULT_HELP}`,
            inputSchema: z.strictObject({
                filter: sameAs("search_people", "filter"),
                semantic: sameAs("search_people", "semantic"),
                company: sameAs("search_people", "company"),
            }),
        }),
        async (input) => {
            const query = PersonQuerySchema.safeParse(input);
            if (!query.success) {
                return toolError(
                    `Invalid arguments for tool count_people: ${explainIssues(PersonQuerySchema, query.error)}`,
                );
            }
            if (query.data.company?.semantic && query.data.company.lookalike) {
                return toolError(SEMANTIC_AND_LOOKALIKE_ERROR);
            }

            return request("/people/search/count", {
                method: "POST",
                body: query.data,
            });
        },
    );

    server.registerTool(
        "get_current_user",
        readOnlyTool({
            title: "Get Current User",
            description:
                "Returns the authenticated user's credit usage and allowance and the account's capabilities and limits. Free; no credits deducted.",
            inputSchema: z.strictObject({}),
        }),
        async () => request("/me"),
    );

    return server;
}
