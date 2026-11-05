# CompanyEnrich MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
[CompanyEnrich](https://companyenrich.com) API. It lets MCP clients such as
Claude, Codex, Cursor, and VS Code enrich companies, search companies and
people, and look up people.

The server exposes a curated set of high-value API actions. Bulk jobs, exports,
scroll endpoints, preview and count helpers, autocomplete, list management, and
catalog-style geo, industry, and keyword tools are left out on purpose.

Most tools spend credits from your CompanyEnrich account. See [Tools](#tools)
for what each one costs.

## Connecting

There are two ways to run the server. Both expose the same tools.

|                    | Hosted (Streamable HTTP)                       | Local (stdio)                            |
| ------------------ | ---------------------------------------------- | ---------------------------------------- |
| **Runs on**        | `https://mcp.companyenrich.com/mcp`            | Your machine, started by your MCP client |
| **Authentication** | OAuth sign-in, or an API key as a bearer token | API key in an environment variable       |
| **Requires**       | Nothing to install                             | Node.js 20 or newer                      |

### Hosted

Claude Code:

```bash
claude mcp add --transport http companyenrich https://mcp.companyenrich.com/mcp
```

Then open `/mcp` in Claude Code and complete the login flow.

Codex CLI:

```bash
codex mcp add companyenrich --url https://mcp.companyenrich.com/mcp
codex mcp login companyenrich
```

In other clients, add a remote or Streamable HTTP server with the URL
`https://mcp.companyenrich.com/mcp` and follow the sign-in prompt. To skip OAuth,
send a CompanyEnrich API key in the `Authorization: Bearer <key>` header instead.

### Local (stdio)

Create an API key at <https://app.companyenrich.com/access-keys>, then register
the server with your client.

Claude Code:

```bash
claude mcp add companyenrich --transport stdio \
  --env COMPANYENRICH_API_KEY=your-api-key -- npx -y companyenrich-mcp
```

Codex CLI:

```bash
codex mcp add companyenrich --env COMPANYENRICH_API_KEY=your-api-key \
  -- npx -y companyenrich-mcp
```

Claude Desktop, Cursor, and other clients with a JSON config:

```json
{
  "mcpServers": {
    "companyenrich": {
      "command": "npx",
      "args": ["-y", "companyenrich-mcp"],
      "env": {
        "COMPANYENRICH_API_KEY": "your-api-key"
      }
    }
  }
}
```

The server reads these environment variables:

| Variable                | Required | Description                                                |
| ----------------------- | -------- | ---------------------------------------------------------- |
| `COMPANYENRICH_API_KEY` | Yes      | Your CompanyEnrich API key.                                |
| `COMPANYENRICH_API_URL` | No       | API base URL. Defaults to `https://api.companyenrich.com`. |

To run from a checkout instead of npm, build it and use
`node /absolute/path/to/mcp-server/dist/stdio.js` as the command:

```bash
git clone https://github.com/CompanyEnrich/mcp-server.git
cd mcp-server
pnpm install
pnpm build
```

## Protocol Support

Both transports speak MCP `2026-07-28` and still serve 2025-era clients that open
with an `initialize` handshake. The deprecated HTTP+SSE transport is not served.

On the hosted server, OAuth clients can register through Client ID Metadata
Documents or, as a fallback, Dynamic Client Registration at `/register`.

## Tools

### Company Tools

#### `enrich_company`

Enriches a company by domain.

Inputs:

- `domain` (string, required): Company domain, for example `example.com`.
- `includeWorkforce` (boolean, optional, default `false`): Include expanded
  workforce insights.

Cost: 1 credit per call, plus 5 additional credits when `includeWorkforce` is
true.

#### `get_company_by_id`

Retrieves a company by CompanyEnrich company ID.

Inputs:

- `id` (UUID string, required): CompanyEnrich company ID.
- `includeWorkforce` (boolean, optional, default `false`): Include expanded
  workforce insights.

Cost: 1 credit per call, plus 5 additional credits when `includeWorkforce` is
true.

#### `enrich_company_by_properties`

Enriches a company from known properties such as name or social profile URL.
Provide at least one company property.

Inputs:

- `name` (string, optional): Company name.
- `linkedinUrl` (URL string, optional): Company LinkedIn URL.
- `linkedinId` (string, optional): Company LinkedIn ID.
- `twitterUrl` (URL string, optional): Company Twitter/X URL.
- `facebookUrl` (URL string, optional): Company Facebook URL.
- `instagramUrl` (URL string, optional): Company Instagram URL.
- `youtubeUrl` (URL string, optional): Company YouTube URL.
- `includeWorkforce` (boolean, optional, default `false`): Include expanded
  workforce insights.

Cost: 1 credit per call, plus 5 additional credits when `includeWorkforce` is
true.

#### `get_company_workforce`

Fetches workforce insights for one company. Provide exactly one lookup
parameter.

Inputs:

- `id` (UUID string, optional): CompanyEnrich company ID.
- `domain` (string, optional): Company domain.

Cost: 5 credits per successful call.

#### `search_companies`

Runs page-based company search. Use `semanticQuery` for natural-language
profile search and `query` for company name/domain search.

Inputs:

- `semanticQuery` (string, optional): Natural-language company profile query.
- `semanticWeight` (number, optional, 0 to 1): Weight for semantic matching.
- `query` (string, optional): Search against company name and domain.
- Common company filters: see [Company Filter Inputs](#company-filter-inputs).
- `includeWorkforce` (boolean, optional, default `false`): Include expanded
  workforce insights for returned companies.
- `page` (integer, optional, default `1`): 1-indexed page number.
- `pageSize` (integer, optional, default `20`, max `100`): Results per page.

Cost: 1 credit per company returned, with a 1-credit minimum.

#### `find_similar_companies`

Finds companies similar to one or more seed domains, with optional filters.

Inputs:

- `domains` (string array, required, 1 to 10 items): Seed company domains.
- `similarityWeight` (number, optional, -1 to 1): Higher favors similarity;
  lower favors more established companies.
- `minScore` (number, optional, 0 to 1): Minimum similarity score for results.
- `query` (string, optional): Search against company name and domain.
- Common company filters: see [Company Filter Inputs](#company-filter-inputs).
- `includeWorkforce` (boolean, optional, default `false`): Include expanded
  workforce insights for returned companies.
- `page` (integer, optional, default `1`): 1-indexed page number.
- `pageSize` (integer, optional, default `20`, max `100`): Results per page.

Cost: 5 credits per company returned, with a 5-credit minimum.

### People Tools

#### `get_person_by_id`

Retrieves a person by CompanyEnrich person ID.

Inputs:

- `id` (positive integer or numeric string, required): CompanyEnrich person ID.

Cost: 2 credits per call.

#### `lookup_person_by_email`

Looks up a person by email address. The API resolves the company from the email
domain and matches the local part.

Inputs:

- `email` (email string, required): Email address to look up.

Cost: 5 credits per successful call.

#### `enrich_person_email`

Beta endpoint that resolves a work email address for a single person.

Inputs:

- `id` (positive integer or numeric string, required): CompanyEnrich person ID.
- `domain` (string, optional): Company domain to resolve the email on. If
  omitted, current experience domains are tried by the API.

Cost: 10 credits per newly accessed found email.

#### `search_people`

Runs page-based people search.

Inputs:

- `query` (string, optional): Name search query. This is not semantic search.
- `positionQuery` (string or string array, optional): Current job title query or
  queries.
- `atCurrentCompanyAfter` (UTC datetime string, optional): Joined current
  company after this datetime.
- `atCurrentCompanyBefore` (UTC datetime string, optional): Joined current
  company before this datetime.
- `atCurrentPositionAfter` (UTC datetime string, optional): Started current
  position after this datetime.
- `atCurrentPositionBefore` (UTC datetime string, optional): Started current
  position before this datetime.
- `countries` (string array, optional): 2-letter country codes.
- `domains` (string array, optional, max 100): Current company domains.
- `seniority` (string array, optional): Person seniority values.
- `department` (string array, optional): Person department values.
- `exclude` (object, optional): Exclusion filters with `positionQuery`,
  `countries`, `domains`, `seniority`, and `department`.
- `companyFilter` (object, optional): Scope people by company filters:
  `{ search?: CompanySearchFilter, similar?: CompanySimilarFilter }`.
- `page` (integer, optional, default `1`): 1-indexed page number.
- `pageSize` (integer, optional, default `20`, max `100`): Results per page.

Cost: 2 credits per person returned, with a 2-credit minimum.

### Account Tool

#### `get_current_user`

Fetches the authenticated user's credit balance and account capabilities.

Inputs: none.

Cost: free.

## Shared Input Reference

### Company Filter Inputs

These inputs are available on `search_companies`, `find_similar_companies`, and
nested `companyFilter` values in `search_people`.

- `exclude` (object, optional): Excludes companies matching any supplied
  filters. Supports `domains`, `regions`, `countries`, `states`, `cities`,
  `type`, `categories`, `employees`, `revenue`, `naicsCode`, `keywords`,
  `technologies`, and `fundingRounds`.
- `foundedYear` (object, optional): `{ min?: number, max?: number }`.
- `fundingAmount` (object, optional): `{ min?: number, max?: number }`.
- `fundingYear` (object, optional): `{ min?: number, max?: number }`.
- `categoryOperator` (string, optional): `And` or `Or`.
- `keywordsOperator` (string, optional): `And` or `Or`.
- `technologiesOperator` (string, optional): `And` or `Or`.
- `workforceGrowth` (object, optional): `period`, `department`, `minPercent`,
  and `maxPercent`.
- `workforceSize` (object array, optional): Each item has `department`, `min`,
  and `max`.
- `require` (string array, optional): Required company features such as
  `linkedin`, `twitter`, `facebook`, `instagram`, `angellist`, `crunchbase`,
  `youtube`, `country`, `city`, `state`, `revenue`, `foundedYear`, or
  `anyFunding`.
- `regions` (string array, optional): Region IDs.
- `country` (string, optional): Deprecated single-country alias.
- `countries` (string array, optional): 2-letter country codes.
- `states` (integer array, optional): State IDs.
- `cities` (integer array, optional): City IDs.
- `type` (string array, optional): Company types.
- `categories` (string array, optional): Company categories.
- `employees` (string array, optional): Employee count ranges.
- `revenue` (string array, optional): Revenue ranges.
- `naicsCode` (integer array, optional): NAICS codes.
- `keywords` (string array, optional): Company keywords.
- `technologies` (string array, optional): Company technologies.
- `fundingRounds` (string array, optional): Funding round values.

Common company enum values:

- `type`: `private`, `public`, `self-employed`, `self-owned`, `partnership`,
  `nonprofit`, `educational`, `government`.
- `categories`: `b2b`, `b2c`, `b2g`, `e-commerce`, `media`,
  `service-provider`, `mobile`, `saas`.
- `employees`: `1-10`, `11-50`, `51-200`, `201-500`, `501-1K`, `1K-5K`,
  `5K-10K`, `over-10K`.
- `revenue`: `under-1m`, `1m-10m`, `10m-50m`, `50m-100m`, `100m-200m`,
  `200m-1b`, `over-1b`.
- `fundingRounds`: `seed`, `debt_financing`, `angel`, `venture`, `series_a`,
  `series_b`, `series_c`, `series_d`, `series_e`, `series_f`, `series_g`,
  `series_h`, `other`.
- Workforce departments: `overall`, `c_suite`, `product_management`,
  `engineering_technical`, `design`, `education`, `finance`,
  `human_resources`, `information_technology`, `legal`, `marketing`,
  `medical_health`, `operations`, `sales`, `consulting`.
- Workforce growth periods: `m6`, `y1`, `y2`.

### People Filter Values

- Seniority values: `owner`, `founder`, `c-suite`, `partner`, `vp`, `head`,
  `director`, `manager`, `senior`, `entry`, `intern`.
- Department values include root departments and sub-departments such as
  `c-suite`, `engineering-technical`, `engineering-technical/software-development`,
  `finance`, `human-resources`, `information-technology`, `legal`, `marketing`,
  `operations`, `sales`, and `consulting`. The full enum is defined in
  `src/schema.ts`.

## Credit Notes

Tool descriptions include the API credit costs where the public API documents
them. In short:

- Company enrichment and company search consume company credits.
- Similar-company search is more expensive than regular company search.
- People search and person lookup consume people credits.
- `enrich_person_email` is beta and can cost 10 credits for a newly accessed
  found email.
- `get_current_user` is free.

The MCP response includes any `x-credit-balance`, `x-credit-cost`, and
`x-credit-remaining` headers returned by the API under `creditInfo`.

## Privacy and Security

- Tool calls go to the CompanyEnrich API with your API key and an
  `x-companyenrich-app: mcp` header, which attributes the usage to MCP. The local
  server talks to nothing else, stores nothing, and has no telemetry.
- The hosted server does not store an API key sent directly as a bearer token.
  For OAuth sign-ins it keeps your grant in Cloudflare KV with the API key
  encrypted.

Please report security vulnerabilities privately to
[support@companyenrich.com](mailto:support@companyenrich.com) rather than in a
public issue.

## Development

You need Node.js 20 or newer and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm type-check
pnpm build       # bundles the stdio server into dist/stdio.js
```

Try the stdio server in the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector -e COMPANYENRICH_API_KEY=your-api-key node dist/stdio.js
```

Run the Worker locally at `http://localhost:8787/mcp`. You can leave the OAuth
values in `.dev.vars` empty if you send an API key as a bearer token:

```bash
cp .dev.vars.example .dev.vars
pnpm dev
```

| Path                   | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `src/mcp.ts`           | Tool definitions, shared by both transports              |
| `src/schema.ts`        | Tool input schemas                                       |
| `src/utils.ts`         | CompanyEnrich API client and response handling           |
| `src/stdio.ts`         | stdio entry point (Node.js)                              |
| `src/http.ts`          | Streamable HTTP handler (Cloudflare Workers)             |
| `src/index.ts`         | Worker entry point, puts the OAuth provider before `/mcp` |
| `src/clerk-handler.ts` | OAuth sign-in through Clerk                              |

Run `pnpm cf-typegen` after changing `wrangler.jsonc`.

## Deploying

The hosted server runs on Cloudflare Workers. Its OAuth flow is tied to
CompanyEnrich's Clerk instance and internal API endpoints, so a fork needs to
adapt `src/clerk-handler.ts` to offer sign-in. Direct API key access works
without it.

Keep secrets out of `wrangler.jsonc`, since its `vars` are stored in plain text.
Set them as Worker secrets instead. A deploy fails if a secret listed in
`secrets.required` is missing.

```bash
pnpm exec wrangler secret put OAUTH_CLIENT_ID -e production
pnpm exec wrangler secret put OAUTH_CLIENT_SECRET -e production
pnpm run deploy
```

If your Cloudflare login can access several accounts, set
`CLOUDFLARE_ACCOUNT_ID`, for example in a local `.env` file, which git ignores.

## License

[MIT](LICENSE)
