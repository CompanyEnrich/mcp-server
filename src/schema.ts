import { z } from "zod";

export const CompanyCategoryEnum = z.enum([
	"b2b",
	"b2c",
	"b2g",
	"e-commerce",
	"media",
	"service-provider",
	"mobile",
	"saas",
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

export const FilterOperatorEnum = z.enum(["And", "Or"]);

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

export const YearRangeSchema = z
	.object({
		min: z.number().int().optional().describe("Minimum year, inclusive."),
		max: z.number().int().optional().describe("Maximum year, inclusive."),
	})
	.strict();

export const CompanyFundingAmountRangeSchema = z
	.object({
		min: z.number().optional().describe("Minimum funding amount, inclusive."),
		max: z.number().optional().describe("Maximum funding amount, inclusive."),
	})
	.strict();

export const WorkforceGrowthInputSchema = z
	.object({
		period: WorkforceGrowthPeriodEnum.optional().describe(
			"Period to measure workforce growth over.",
		),
		department: WorkforceDepartmentEnum.optional().describe(
			"Department to measure workforce growth for. Use overall for total workforce.",
		),
		minPercent: z
			.number()
			.optional()
			.describe(
				"Minimum workforce growth percentage, inclusive. Use negative values for declines.",
			),
		maxPercent: z
			.number()
			.optional()
			.describe(
				"Maximum workforce growth percentage, inclusive. Use negative values for declines.",
			),
	})
	.strict();

export const WorkforceSizeInputSchema = z
	.object({
		department: WorkforceDepartmentEnum.optional().describe(
			"Department to filter by. Use overall for total workforce.",
		),
		min: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe("Minimum headcount, inclusive."),
		max: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe("Maximum headcount, inclusive."),
	})
	.strict();

export const CompanyExcludeFiltersSchema = z
	.object({
		domains: z
			.array(z.string())
			.optional()
			.describe("Company domains to exclude."),
		regions: z.array(z.string()).optional().describe("Region IDs to exclude."),
		countries: z
			.array(z.string())
			.optional()
			.describe("2-letter country codes to exclude."),
		states: z
			.array(z.number().int())
			.optional()
			.describe("State IDs to exclude."),
		cities: z
			.array(z.number().int())
			.optional()
			.describe("City IDs to exclude."),
		type: z
			.array(CompanyTypeEnum)
			.optional()
			.describe("Company types to exclude."),
		categories: z
			.array(CompanyCategoryEnum)
			.optional()
			.describe("Company categories to exclude."),
		employees: z
			.array(CompanyEmployeesEnum)
			.optional()
			.describe("Employee ranges to exclude."),
		revenue: z
			.array(CompanyRevenueEnum)
			.optional()
			.describe("Revenue ranges to exclude."),
		naicsCode: z
			.array(z.number().int())
			.optional()
			.describe("NAICS codes to exclude."),
		keywords: z.array(z.string()).optional().describe("Keywords to exclude."),
		technologies: z
			.array(z.string())
			.optional()
			.describe("Technologies to exclude."),
		fundingRounds: z
			.array(CompanyFundingRoundEnum)
			.optional()
			.describe("Funding rounds to exclude."),
	})
	.strict();

export const CompanyCommonFilterShape = {
	exclude: CompanyExcludeFiltersSchema.optional().describe(
		"Exclude companies matching any of these filters.",
	),
	foundedYear: YearRangeSchema.optional().describe("Founded year range."),
	fundingAmount: CompanyFundingAmountRangeSchema.optional().describe(
		"Funding amount range.",
	),
	fundingYear: YearRangeSchema.optional().describe("Funding year range."),
	categoryOperator: FilterOperatorEnum.optional().describe(
		"Operator for category filters. Defaults to And in the API.",
	),
	keywordsOperator: FilterOperatorEnum.optional().describe(
		"Operator for keyword filters. Defaults to And in the API.",
	),
	technologiesOperator: FilterOperatorEnum.optional().describe(
		"Operator for technology filters. Defaults to And in the API.",
	),
	workforceGrowth: WorkforceGrowthInputSchema.optional().describe(
		"Filter by workforce growth percentage.",
	),
	workforceSize: z
		.array(WorkforceSizeInputSchema)
		.optional()
		.describe("Filter by absolute workforce headcount."),
	require: z
		.array(FeatureRequirementEnum)
		.optional()
		.describe("Company features that must exist."),
	regions: z.array(z.string()).optional().describe("Region IDs to filter by."),
	country: z
		.string()
		.optional()
		.describe("Deprecated single-country alias. Prefer countries."),
	countries: z
		.array(z.string())
		.optional()
		.describe("2-letter country codes to filter by."),
	states: z
		.array(z.number().int())
		.optional()
		.describe("State IDs to filter by."),
	cities: z
		.array(z.number().int())
		.optional()
		.describe("City IDs to filter by."),
	type: z
		.array(CompanyTypeEnum)
		.optional()
		.describe("Company types to filter by."),
	categories: z
		.array(CompanyCategoryEnum)
		.optional()
		.describe("Company categories to filter by."),
	employees: z
		.array(CompanyEmployeesEnum)
		.optional()
		.describe("Employee count ranges."),
	revenue: z
		.array(CompanyRevenueEnum)
		.optional()
		.describe("Revenue ranges in USD."),
	naicsCode: z
		.array(z.number().int())
		.optional()
		.describe("NAICS codes to filter by."),
	keywords: z.array(z.string()).optional().describe("Keywords to filter by."),
	technologies: z
		.array(z.string())
		.optional()
		.describe("Technologies to filter by."),
	fundingRounds: z
		.array(CompanyFundingRoundEnum)
		.optional()
		.describe("Funding rounds to filter by."),
};

export const CompanySearchFilterShape = {
	semanticQuery: z
		.string()
		.min(1)
		.max(500)
		.optional()
		.describe(
			"Natural-language query describing the kinds of companies to find.",
		),
	semanticWeight: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe("Semantic weight from 0 to 1. Defaults to 0.7 in the API."),
	query: z
		.string()
		.max(250)
		.optional()
		.describe("Search query applied to company name and domain."),
	...CompanyCommonFilterShape,
};

export const CompanySimilarFilterShape = {
	domains: z
		.array(z.string())
		.min(1)
		.max(10)
		.describe(
			"Company domain names to find similar companies for. Up to 10 domains.",
		),
	similarityWeight: z
		.number()
		.min(-1)
		.max(1)
		.optional()
		.describe(
			"Similarity weight from -1 to 1. Higher favors similarity, lower favors established companies.",
		),
	minScore: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe("Minimum similarity score required for returned companies."),
	query: z
		.string()
		.max(250)
		.optional()
		.describe("Search query applied to company name and domain."),
	...CompanyCommonFilterShape,
};

export const CompanySearchFilterSchema = z
	.object(CompanySearchFilterShape)
	.strict();
export const CompanySimilarFilterSchema = z
	.object(CompanySimilarFilterShape)
	.strict();

export const CompanyLookupInputSchema = z
	.object({
		search: CompanySearchFilterSchema.optional().describe(
			"Company search filter.",
		),
		similar: CompanySimilarFilterSchema.optional().describe(
			"Similar-company filter.",
		),
	})
	.strict();

export const EnrichCompanyByPropertiesShape = {
	name: z.string().optional().describe("Company name to enrich."),
	linkedinUrl: z.string().url().optional().describe("Company LinkedIn URL."),
	linkedinId: z.string().optional().describe("Company LinkedIn ID."),
	twitterUrl: z.string().url().optional().describe("Company Twitter/X URL."),
	facebookUrl: z.string().url().optional().describe("Company Facebook URL."),
	instagramUrl: z.string().url().optional().describe("Company Instagram URL."),
	youtubeUrl: z.string().url().optional().describe("Company YouTube URL."),
};

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

export const PositionQueryInputSchema = z.union([
	z.string(),
	z.array(z.string()).min(1),
]);

export const PersonExcludeFiltersSchema = z
	.object({
		positionQuery: z
			.array(z.string())
			.optional()
			.describe("Current job title queries to exclude."),
		countries: z
			.array(z.string())
			.optional()
			.describe("2-letter country codes to exclude."),
		domains: z
			.array(z.string())
			.optional()
			.describe("Company domains to exclude."),
		seniority: z
			.array(PersonSeniorityEnum)
			.optional()
			.describe("Seniority levels to exclude."),
		department: z
			.array(PersonDepartmentEnum)
			.optional()
			.describe("Departments to exclude."),
	})
	.strict();

export const PersonSearchFilterShape = {
	companyFilter: CompanyLookupInputSchema.optional().describe(
		"Company filters to scope people results.",
	),
	query: z
		.string()
		.max(250)
		.optional()
		.describe("Name search query. This is not semantic search."),
	positionQuery: PositionQueryInputSchema.optional().describe(
		"Current job title query or queries. A string is accepted for backward compatibility.",
	),
	atCurrentCompanyAfter: z
		.string()
		.datetime()
		.optional()
		.describe(
			"Only include people who joined their current company after this UTC datetime.",
		),
	atCurrentCompanyBefore: z
		.string()
		.datetime()
		.optional()
		.describe(
			"Only include people who joined their current company before this UTC datetime.",
		),
	atCurrentPositionAfter: z
		.string()
		.datetime()
		.optional()
		.describe(
			"Only include people who started their current position after this UTC datetime.",
		),
	atCurrentPositionBefore: z
		.string()
		.datetime()
		.optional()
		.describe(
			"Only include people who started their current position before this UTC datetime.",
		),
	exclude: PersonExcludeFiltersSchema.optional().describe(
		"People exclusion filters.",
	),
	countries: z
		.array(z.string())
		.optional()
		.describe("2-letter country codes to filter by."),
	domains: z
		.array(z.string())
		.max(100)
		.optional()
		.describe("Company domains to filter by."),
	seniority: z
		.array(PersonSeniorityEnum)
		.optional()
		.describe("Seniority levels to filter by."),
	department: z
		.array(PersonDepartmentEnum)
		.optional()
		.describe("Departments to filter by."),
};

export const PersonIdSchema = z.union([
	z.number().int().positive(),
	z.string().regex(/^\d+$/, "Person ID must be a positive integer."),
]);
