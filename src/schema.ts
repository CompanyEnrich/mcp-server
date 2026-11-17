import { z } from "zod";

/*
 * Input schemas for the CompanyEnrich API v2.
 *
 * Every object is strict: an unknown key is rejected instead of being dropped,
 * so a mistyped filter never turns into a broader, paid search.
 *
 * The API accepts a value filter as a single value, an array, or a rules
 * object. The tools expose only the rules object (`in`, `all`, `notIn`). One
 * explicit shape is easier for a model to fill in than a three-way union, and
 * it keeps the tools/list payload small.
 */

export const CompanyCategoryEnum = z.enum([
	"b2b",
	"b2c",
	"b2g",
	"e-commerce",
	"media",
	"service-provider",
	"mobile",
	"saas",
	"local-business",
]);

export const CompanyEmployeesEnum = z.enum([
	"1-10",
	"11-50",
	"51-200",
	"201-500",
	"501-1K",
	"1K-5K",
	"5K-10K",
	"over-10K",
]);

export const CompanyRevenueEnum = z.enum([
	"under-1m",
	"1m-10m",
	"10m-50m",
	"50m-100m",
	"100m-200m",
	"200m-1b",
	"over-1b",
]);

export const CompanyTypeEnum = z.enum([
	"private",
	"public",
	"self-employed",
	"self-owned",
	"partnership",
	"nonprofit",
	"educational",
	"government",
]);

export const CompanyFundingRoundEnum = z.enum([
	"seed",
	"debt_financing",
	"angel",
	"venture",
	"series_a",
	"series_b",
	"series_c",
	"series_d",
	"series_e",
	"series_f",
	"series_g",
	"series_h",
	"other",
]);

export const FeatureRequirementEnum = z.enum([
	"linkedin",
	"twitter",
	"facebook",
	"instagram",
	"angellist",
	"crunchbase",
	"youtube",
	"country",
	"city",
	"state",
	"revenue",
	"foundedYear",
	"anyFunding",
]);

export const WorkforceDepartmentEnum = z.enum([
	"overall",
	"c_suite",
	"product_management",
	"engineering_technical",
	"design",
	"education",
	"finance",
	"human_resources",
	"information_technology",
	"legal",
	"marketing",
	"medical_health",
	"operations",
	"sales",
	"consulting",
]);

export const WorkforceGrowthPeriodEnum = z.enum(["m6", "y1", "y2"]);

export const CompanyExpandEnum = z.enum([
	"financial",
	"keywords",
	"naicsCodes",
	"technologies",
	"workforce",
]);

export const PersonExpandEnum = z.enum(["education", "company"]);

export const PersonSeniorityEnum = z.enum([
	"owner",
	"founder",
	"c-suite",
	"partner",
	"vp",
	"head",
	"director",
	"manager",
	"senior",
	"entry",
	"intern",
]);

export const PersonDepartmentEnum = z.enum([
	"c-suite",
	"c-suite/executive",
	"c-suite/finance-executive",
	"c-suite/founder",
	"c-suite/human-resources-executive",
	"c-suite/information-technology-executive",
	"c-suite/legal-executive",
	"c-suite/marketing-executive",
	"c-suite/medical-health-executive",
	"c-suite/operations-executive",
	"c-suite/sales-executive",
	"product-management",
	"product-management/product-development",
	"product-management/product-management",
	"engineering-technical",
	"engineering-technical/artificial-intelligence-machine-learning",
	"engineering-technical/bioengineering",
	"engineering-technical/biometrics",
	"engineering-technical/business-intelligence",
	"engineering-technical/chemical-engineering",
	"engineering-technical/cloud-mobility",
	"engineering-technical/data-science",
	"engineering-technical/devops",
	"engineering-technical/digital-transformation",
	"engineering-technical/emerging-technology-innovation",
	"engineering-technical/engineering-technical",
	"engineering-technical/industrial-engineering",
	"engineering-technical/mechanic",
	"engineering-technical/mobile-development",
	"engineering-technical/project-management",
	"engineering-technical/research-development",
	"engineering-technical/scrum-master-agile-coach",
	"engineering-technical/software-development",
	"engineering-technical/support-technical-services",
	"engineering-technical/technician",
	"engineering-technical/technology-operations",
	"engineering-technical/test-quality-assurance",
	"engineering-technical/ui-ux",
	"engineering-technical/web-development",
	"design",
	"design/all-design",
	"design/product-ui-ux-design",
	"design/graphic-design",
	"education",
	"education/teacher",
	"education/principal",
	"education/superintendent",
	"education/professor",
	"finance",
	"finance/accounting",
	"finance/finance",
	"finance/financial-planning-analysis",
	"finance/financial-reporting",
	"finance/financial-strategy",
	"finance/financial-systems",
	"finance/internal-audit-control",
	"finance/investor-relations",
	"finance/mergers-acquisitions",
	"finance/real-estate-finance",
	"finance/financial-risk",
	"finance/shared-services",
	"finance/sourcing-procurement",
	"finance/tax",
	"finance/treasury",
	"human-resources",
	"human-resources/compensation-benefits",
	"human-resources/culture-diversity-inclusion",
	"human-resources/employee-labor-relations",
	"human-resources/health-safety",
	"human-resources/human-resource-information-system",
	"human-resources/human-resources",
	"human-resources/hr-business-partner",
	"human-resources/learning-development",
	"human-resources/organizational-development",
	"human-resources/recruiting-talent-acquisition",
	"human-resources/talent-management",
	"human-resources/workforce-management",
	"human-resources/people-operations",
	"information-technology",
	"information-technology/application-development",
	"information-technology/business-service-management-itsm",
	"information-technology/collaboration-web-app",
	"information-technology/data-center",
	"information-technology/data-warehouse",
	"information-technology/database-administration",
	"information-technology/ecommerce-development",
	"information-technology/enterprise-architecture",
	"information-technology/help-desk-desktop-services",
	"information-technology/hr-financial-erp-systems",
	"information-technology/information-security",
	"information-technology/information-technology",
	"information-technology/infrastructure",
	"information-technology/it-asset-management",
	"information-technology/it-audit-it-compliance",
	"information-technology/it-operations",
	"information-technology/it-procurement",
	"information-technology/it-strategy",
	"information-technology/it-training",
	"information-technology/networking",
	"information-technology/project-program-management",
	"information-technology/quality-assurance",
	"information-technology/retail-store-systems",
	"information-technology/servers",
	"information-technology/storage-disaster-recovery",
	"information-technology/telecommunications",
	"information-technology/virtualization",
	"legal",
	"legal/acquisitions",
	"legal/compliance",
	"legal/contracts",
	"legal/corporate-secretary",
	"legal/ediscovery",
	"legal/ethics",
	"legal/governance",
	"legal/governmental-affairs-regulatory-law",
	"legal/intellectual-property-patent",
	"legal/labor-employment",
	"legal/lawyer-attorney",
	"legal/legal",
	"legal/legal-counsel",
	"legal/legal-operations",
	"legal/litigation",
	"legal/privacy",
	"marketing",
	"marketing/advertising",
	"marketing/brand-management",
	"marketing/content-marketing",
	"marketing/customer-experience",
	"marketing/customer-marketing",
	"marketing/demand-generation",
	"marketing/digital-marketing",
	"marketing/ecommerce-marketing",
	"marketing/event-marketing",
	"marketing/field-marketing",
	"marketing/lead-generation",
	"marketing/marketing",
	"marketing/marketing-analytics-insights",
	"marketing/marketing-communications",
	"marketing/marketing-operations",
	"marketing/product-marketing",
	"marketing/public-relations",
	"marketing/search-engine-optimization-pay-per-click",
	"marketing/social-media-marketing",
	"marketing/strategic-communications",
	"marketing/technical-marketing",
	"medical-health",
	"medical-health/anesthesiology",
	"medical-health/chiropractics",
	"medical-health/clinical-systems",
	"medical-health/dentistry",
	"medical-health/dermatology",
	"medical-health/doctors-physicians",
	"medical-health/epidemiology",
	"medical-health/first-responder",
	"medical-health/infectious-disease",
	"medical-health/medical-administration",
	"medical-health/medical-education-training",
	"medical-health/medical-research",
	"medical-health/medicine",
	"medical-health/neurology",
	"medical-health/nursing",
	"medical-health/nutrition-dietetics",
	"medical-health/obstetrics-gynecology",
	"medical-health/oncology",
	"medical-health/opthalmology",
	"medical-health/optometry",
	"medical-health/orthopedics",
	"medical-health/pathology",
	"medical-health/pediatrics",
	"medical-health/pharmacy",
	"medical-health/physical-therapy",
	"medical-health/psychiatry",
	"medical-health/psychology",
	"medical-health/public-health",
	"medical-health/radiology",
	"medical-health/social-work",
	"operations",
	"operations/call-center",
	"operations/construction",
	"operations/corporate-strategy",
	"operations/customer-service-support",
	"operations/enterprise-resource-planning",
	"operations/facilities-management",
	"operations/leasing",
	"operations/logistics",
	"operations/office-operations",
	"operations/operations",
	"operations/physical-security",
	"operations/project-development",
	"operations/quality-management",
	"operations/real-estate",
	"operations/safety",
	"operations/store-operations",
	"operations/supply-chain",
	"sales",
	"sales/account-management",
	"sales/business-development",
	"sales/channel-sales",
	"sales/customer-retention-development",
	"sales/customer-success",
	"sales/field-outside-sales",
	"sales/inside-sales",
	"sales/partnerships",
	"sales/revenue-operations",
	"sales/sales",
	"sales/sales-enablement",
	"sales/sales-engineering",
	"sales/sales-operations",
	"sales/sales-training",
	"consulting",
	"consulting/consultant",
]);

const DEPARTMENT_VALUES_HINT =
	"Same values as filter.department.in: a root such as `sales`, or `root/sub-department`.";

const personDepartments = new Set<string>(PersonDepartmentEnum.options);

/**
 * A department value that is checked against the full list at call time but
 * published as a plain string. The list has more than 200 entries, so it is
 * published once (on `filter.department.in`) rather than at every position
 * that takes a department.
 */
const PersonDepartmentValue = z
	.string()
	.refine((value) => personDepartments.has(value), {
		error: `Unknown department. ${DEPARTMENT_VALUES_HINT}`,
	});

function hasDefinedValue(value: Record<string, unknown>) {
	return Object.values(value).some((entry) => entry !== undefined);
}

function valueList<T extends z.ZodType>(item: T) {
	return z.array(item).min(1).optional();
}

/**
 * Wraps a rules object so that `{}` is rejected. The API does not document
 * what an empty rule set matches, so it is never sent.
 */
function rules<T extends z.ZodRawShape>(shape: T) {
	return z.strictObject(shape).refine(hasDefinedValue, {
		error: `Provide at least one of: ${Object.keys(shape).join(", ")}.`,
	});
}

/** `in` matches any of the values, `notIn` excludes matches. */
function valueFilter<T extends z.ZodType>(item: T, exclude: z.ZodType = item) {
	return rules({ in: valueList(item), notIn: valueList(exclude) });
}

/** Like `valueFilter`, plus `all`, which requires every listed value. */
function multiValueFilter<T extends z.ZodType>(item: T) {
	return rules({
		in: valueList(item),
		all: valueList(item),
		notIn: valueList(item),
	});
}

/** A filter that only supports inclusion. */
function includeFilter<T extends z.ZodType>(item: T) {
	return z.strictObject({ in: z.array(item).min(1) });
}

const searchText = z.string().min(1).max(250);
const domainName = z.string().min(1).max(1024);
const companyId = z.guid();
const countryCode = z.string().length(2);
const integerId = z.number().int().positive();
const naicsCode = z
	.string()
	.regex(/^[1-9]\d{1,5}$/, "A NAICS code has 2 to 6 digits and no leading zero.");

const YearRangeSchema = z.strictObject({
	min: z.number().int().optional(),
	max: z.number().int().optional(),
});

const AmountRangeSchema = z.strictObject({
	min: z.number().optional(),
	max: z.number().optional(),
});

const DateRangeSchema = z.strictObject({
	after: z.iso.datetime({ offset: true }).optional(),
	before: z.iso.datetime({ offset: true }).optional(),
});

const WorkforceGrowthFilterSchema = z.strictObject({
	period: WorkforceGrowthPeriodEnum.optional().describe(
		"Period to measure growth over: m6, y1 or y2.",
	),
	department: WorkforceDepartmentEnum.optional().describe(
		"Department to measure. Use overall for the whole company.",
	),
	min: z
		.number()
		.optional()
		.describe("Minimum growth ratio, inclusive. 0.15 is 15% growth; negative values are declines."),
	max: z.number().optional().describe("Maximum growth ratio, inclusive."),
});

const WorkforceSizeFilterSchema = z.strictObject({
	department: WorkforceDepartmentEnum.optional().describe(
		"Department to count. Use overall for the whole company.",
	),
	min: z.number().int().min(0).optional().describe("Minimum headcount, inclusive."),
	max: z.number().int().min(0).optional().describe("Maximum headcount, inclusive."),
});

export const CompanySearchFilterSchema = z.strictObject({
	query: valueFilter(searchText)
		.optional()
		.describe("Text matched against company names, keywords and domain prefixes."),
	id: valueFilter(companyId).optional().describe("CompanyEnrich company IDs."),
	domain: valueFilter(domainName).optional().describe("Company domains."),
	keywords: multiValueFilter(z.string().min(1)).optional().describe("Company keywords."),
	technologies: multiValueFilter(z.string().min(1))
		.optional()
		.describe("Technologies the company uses."),
	region: valueFilter(z.string().min(1)).optional().describe("Region IDs."),
	country: valueFilter(countryCode).optional().describe("2-letter country codes."),
	state: valueFilter(integerId).optional().describe("State IDs."),
	city: valueFilter(integerId).optional().describe("City IDs."),
	type: valueFilter(CompanyTypeEnum).optional().describe("Company types."),
	employees: valueFilter(CompanyEmployeesEnum).optional().describe("Employee count ranges."),
	reportedEmployees: valueFilter(CompanyEmployeesEnum)
		.optional()
		.describe("Employee count ranges as reported by external sources."),
	revenue: valueFilter(CompanyRevenueEnum).optional().describe("Revenue ranges in USD."),
	workforceGrowth: WorkforceGrowthFilterSchema.optional().describe(
		"Workforce growth over a period.",
	),
	workforceSize: z
		.array(WorkforceSizeFilterSchema)
		.min(1)
		.optional()
		.describe("Headcount ranges, one entry per department."),
	naicsCodes: multiValueFilter(naicsCode)
		.optional()
		.describe("NAICS codes as strings of 2 to 6 digits, for example \"5112\"."),
	categories: multiValueFilter(CompanyCategoryEnum).optional().describe("Company categories."),
	foundedYear: YearRangeSchema.optional().describe("Founded year range, inclusive."),
	fundingRounds: valueFilter(CompanyFundingRoundEnum).optional().describe("Funding rounds."),
	fundingAmount: AmountRangeSchema.optional().describe("Funding amount range, inclusive."),
	fundingYear: YearRangeSchema.optional().describe("Latest funding year range, inclusive."),
	require: z
		.strictObject({ all: z.array(FeatureRequirementEnum).min(1) })
		.optional()
		.describe("Data the company must have, for example a LinkedIn profile."),
});

export const CompanySemanticQuerySchema = z.strictObject({
	query: z
		.string()
		.min(1)
		.max(500)
		.describe("Natural-language description of the companies to find, for example \"saas companies in Turkey\"."),
	weight: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe("Semantic relevance weight from 0 to 1. Larger values favor semantic similarity."),
	autoFilter: z
		.boolean()
		.optional()
		.describe(
			"Whether to infer filters such as location, size and funding from the query. Defaults to true. The response `interpretation` reports what was inferred.",
		),
});

export const CompanyLookalikeQuerySchema = z.strictObject({
	domains: z
		.array(domainName)
		.min(1)
		.max(10)
		.describe("Seed company domains to find lookalikes for. Up to 10."),
	weight: z
		.number()
		.min(-1)
		.max(1)
		.optional()
		.describe("Ranking weight from -1 to 1. Larger values favor more similar companies."),
	minScore: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe("Minimum similarity score from 0 to 1."),
});

export const CompanyQueryShape = {
	filter: CompanySearchFilterSchema.optional().describe("Company filters."),
	semantic: CompanySemanticQuerySchema.optional().describe(
		"Natural-language company search. Cannot be combined with lookalike.",
	),
	lookalike: CompanyLookalikeQuerySchema.optional().describe(
		"Finds companies similar to seed companies. Cannot be combined with semantic.",
	),
};

export const CompanyQuerySchema = z.strictObject(CompanyQueryShape);

export const EnrichCompanyByPropertiesShape = {
	name: z.string().min(1).max(250).optional().describe("Company name."),
	linkedinUrl: z.url().max(2048).optional().describe("Company LinkedIn URL."),
	linkedinId: z.string().min(1).max(100).optional().describe("Company LinkedIn ID."),
	twitterUrl: z.url().max(2048).optional().describe("Company Twitter/X URL."),
	facebookUrl: z.url().max(2048).optional().describe("Company Facebook URL."),
	instagramUrl: z.url().max(2048).optional().describe("Company Instagram URL."),
	youtubeUrl: z.url().max(2048).optional().describe("Company YouTube URL."),
};

const PersonEducationFilterSchema = z.strictObject({
	institutionLinkedinHandle: valueFilter(z.string().min(1))
		.optional()
		.describe("LinkedIn handles or URLs of schools."),
	institutionName: valueFilter(z.string().min(1))
		.optional()
		.describe("Phrases matched against school names."),
});

const PersonPastExperienceFilterSchema = z.strictObject({
	companyId: valueFilter(companyId).optional().describe("Past company IDs."),
	domain: valueFilter(domainName).optional().describe("Past company domains."),
	companyLinkedinHandle: valueFilter(z.string().min(1))
		.optional()
		.describe("LinkedIn handles or URLs of past companies."),
	seniority: includeFilter(PersonSeniorityEnum).optional().describe("Seniority in the past role."),
	department: includeFilter(PersonDepartmentValue)
		.optional()
		.describe(`Department of the past role. ${DEPARTMENT_VALUES_HINT}`),
	position: includeFilter(z.string().min(1))
		.optional()
		.describe("Phrases matched against the past job title."),
	startDate: DateRangeSchema.optional().describe("When the past role started."),
	endDate: DateRangeSchema.optional().describe("When the past role ended."),
});

export const PersonSearchFilterSchema = z.strictObject({
	query: valueFilter(searchText).optional().describe("Text matched against person names."),
	companyId: valueFilter(companyId).optional().describe("Current company IDs."),
	domain: valueFilter(domainName).optional().describe("Current company domains."),
	companyLinkedinHandle: valueFilter(z.string().min(1))
		.optional()
		.describe("LinkedIn handles or URLs of current companies."),
	seniority: valueFilter(PersonSeniorityEnum).optional().describe("Current seniority levels."),
	department: valueFilter(PersonDepartmentEnum, PersonDepartmentValue)
		.optional()
		.describe("Current departments. A root department includes its sub-departments."),
	country: valueFilter(countryCode).optional().describe("2-letter country codes of the person."),
	position: valueFilter(z.string().min(1))
		.optional()
		.describe("Phrases matched against current job titles."),
	currentCompanyStartDate: DateRangeSchema.optional().describe(
		"When the person joined their current company.",
	),
	currentPositionStartDate: DateRangeSchema.optional().describe(
		"When the person started their current position.",
	),
	education: PersonEducationFilterSchema.optional().describe("Education history filters."),
	pastExperience: PersonPastExperienceFilterSchema.optional().describe(
		"Finds people by a previous job. All rules must match the same past role, and people still at an included company are left out.",
	),
});

export const PersonSemanticQuerySchema = z.strictObject({
	query: z
		.string()
		.min(1)
		.max(500)
		.describe(
			"Natural-language description of the people to find, for example \"VP of sales at Series A SaaS startups in Germany\".",
		),
});

export const PersonQueryShape = {
	filter: PersonSearchFilterSchema.optional().describe("Person filters."),
	semantic: PersonSemanticQuerySchema.optional().describe(
		"Natural-language people search.",
	),
	company: CompanyQuerySchema.optional().describe(
		"Limits results to people whose current company matches this company query.",
	),
};

export const PersonQuerySchema = z.strictObject(PersonQueryShape);

export const PersonIdSchema = z.union([
	z.number().int().positive(),
	z.string().regex(/^[1-9]\d*$/, "Person ID must be a positive integer."),
]);

function unwrapSchema(schema: unknown): unknown {
	let current = schema;
	while (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
		current = current.unwrap();
	}
	return current;
}

/** The keys accepted by the object at `path` inside `schema`, if it is one. */
function keysAt(schema: z.ZodType, path: PropertyKey[]): string[] {
	let current = unwrapSchema(schema);
	for (const key of path) {
		if (current instanceof z.ZodObject) {
			current = unwrapSchema(current.shape[String(key)]);
		} else if (current instanceof z.ZodArray) {
			current = unwrapSchema(current.element);
		} else {
			return [];
		}
	}
	return current instanceof z.ZodObject ? Object.keys(current.shape) : [];
}

/**
 * Turns a validation failure into a message a model can act on without the
 * schema in front of it: each problem names its path, and an unknown key is
 * followed by the keys that are accepted there.
 */
export function explainIssues(schema: z.ZodType, error: z.ZodError) {
	return error.issues
		.map((issue) => {
			const where = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
			if (issue.code !== "unrecognized_keys") {
				return `${where}${issue.message}`;
			}
			const accepted = keysAt(schema, issue.path);
			const hint = accepted.length > 0 ? ` Accepted keys: ${accepted.join(", ")}.` : "";
			return `${where}${issue.message}.${hint}`;
		})
		.join(" ");
}
