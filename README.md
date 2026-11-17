# CompanyEnrich MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
[CompanyEnrich](https://companyenrich.com) API. It lets MCP clients such as
Claude, Codex, Cursor, and VS Code enrich companies, search companies and
people, and look up people.

The server exposes a curated set of high-value actions from version 2 of the
CompanyEnrich API. Batch and bulk jobs, exports, previews, autocomplete, and
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
  --env COMPANYENRICH_API_KEY=your-api-key -- npx -y @companyenrich/mcp
```

Codex CLI:

```bash
codex mcp add companyenrich --env COMPANYENRICH_API_KEY=your-api-key \
  -- npx -y @companyenrich/mcp
```

Claude Desktop, Cursor, and other clients with a JSON config:

```json
{
  "mcpServers": {
    "companyenrich": {
      "command": "npx",
      "args": ["-y", "@companyenrich/mcp"],
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

All tools call [version 2 of the CompanyEnrich API](https://api.companyenrich.com/openapi/v2.json).
Tool inputs are strict: an argument the tool does not define is rejected instead
of being ignored, so a mistyped filter never runs as a broader, paid search.

### Company Tools

#### `enrich_company`

Enriches a company by domain.

Inputs:

- `domain` (string, required): Company domain, for example `example.com`.
- `expand` (string array, optional): Extra data to include. See
  [Company expansions](#company-expansions).
- `waitForEnrichment` (boolean, optional, default `true`): Set `false` to return
  only stored data right away. A miss then schedules enrichment in the
  background.

Cost: 1 credit per successful enrichment, plus expansions. A company that
cannot be found costs nothing.

#### `get_company_by_id`

Retrieves a stored company by CompanyEnrich company ID.

Inputs:

- `id` (UUID string, required): CompanyEnrich company ID.
- `expand` (string array, optional): See
  [Company expansions](#company-expansions).

Cost: 1 credit per company returned, plus expansions.

#### `enrich_company_by_properties`

Resolves and enriches a company from identifying properties such as its name or
a social profile URL. Provide at least one property. When several are given,
all of them must match.

Inputs:

- `name` (string, optional): Company name.
- `linkedinUrl` (URL string, optional): Company LinkedIn URL.
- `linkedinId` (string, optional): Company LinkedIn ID.
- `twitterUrl` (URL string, optional): Company Twitter/X URL.
- `facebookUrl` (URL string, optional): Company Facebook URL.
- `instagramUrl` (URL string, optional): Company Instagram URL.
- `youtubeUrl` (URL string, optional): Company YouTube URL.
- `expand` (string array, optional): See
  [Company expansions](#company-expansions).

Cost: 1 credit when a company is returned or when the properties cannot be
resolved to a company domain, plus expansions.

#### `get_company_workforce`

Returns the current employee count, department headcounts, and the latest 12
months of workforce history for one company. Provide exactly one of `id` and
`domain`.

Inputs:

- `id` (UUID string, optional): CompanyEnrich company ID.
- `domain` (string, optional): Company domain.
- `cursor` (string, optional): `nextCursor` from a previous response, to get
  the preceding 12 months. Cursors expire after 30 minutes.

Cost: 1 credit per successful page.

#### `search_companies`

Searches companies in one of three ways:

- by filters alone,
- by a natural-language `semantic` query, or
- by `lookalike` seed domains, which finds companies similar to the ones given.

Filters can be combined with either of the other two. `semantic` and
`lookalike` cannot be combined with each other.

Inputs:

- `filter` (object, optional): See
  [Company filters](#company-filters).
- `semantic` (object, optional):
  - `query` (string, required, max 500 characters): For example
    `saas companies in Turkey`.
  - `weight` (number, optional, 0 to 1): Larger values favor semantic
    similarity.
  - `autoFilter` (boolean, optional, default `true`): Infers filters such as
    location, size, and funding from the query. The response `interpretation`
    reports what was inferred.
- `lookalike` (object, optional):
  - `domains` (string array, required, 1 to 10 items): Seed company domains.
  - `weight` (number, optional, -1 to 1): Larger values favor more similar
    companies.
  - `minScore` (number, optional, 0 to 1): Minimum similarity score.
- `expand` (string array, optional): See
  [Company expansions](#company-expansions).
- `pageSize` (integer, optional, default `20`, max `100`): Results per page.
- `cursor` (string, optional): `nextCursor` from the previous response. Keep
  the rest of the query the same. Cursors expire after 24 hours.

Cost per returned company: 1 credit for a filter search, 2 for a semantic
search, 5 for a lookalike search, plus expansions. An empty result costs one
result's price.

#### `count_companies`

Counts the companies a `search_companies` query would match, without returning
them. Use it to size or check a query before running the paid search.

Inputs:

- `filter`, `semantic`, `lookalike` (objects, optional): The same as in
  `search_companies`.

The response has `count`, the matches your plan can access, and `total`, all
matches. A semantic query also returns `interpretation`, the filters inferred
from it.

Cost: free.

### People Tools

#### `get_person_by_id`

Retrieves a stored person by CompanyEnrich person ID.

Inputs:

- `id` (positive integer or numeric string, required): CompanyEnrich person ID.
- `expand` (string array, optional): See
  [Person expansions](#person-expansions).

Cost: 2 credits per person returned, plus expansions.

#### `lookup_person_by_email`

Identifies a person from an email address. The API resolves the company from
the email domain and matches the person by common address patterns.

Inputs:

- `email` (email string, required): Email address to look up.
- `expand` (string array, optional): See
  [Person expansions](#person-expansions).

Cost: 5 credits when a person is returned, plus expansions. No match costs
nothing.

#### `enrich_person_email`

Finds the work email address of a person on a company domain. The response
`status` is `found`, `not-found`, `unavailable`, or `pending`. A pending lookup
is still running, so call the tool again later.

Inputs:

- `id` (positive integer or numeric string, required): CompanyEnrich person ID.
- `domain` (string, optional): Company domain to find the email on. It must
  belong to one of the person's companies. If omitted, the person's current
  companies are tried.

Cost: 10 credits when it finds an email your account has not accessed before.
Every other outcome is free.

#### `search_people`

Searches people by person filters, a natural-language `semantic` query, and an
optional `company` query.

Inputs:

- `filter` (object, optional): See [People filters](#people-filters).
- `semantic` (object, optional):
  - `query` (string, required, max 500 characters): For example
    `VP of sales at Series A SaaS startups in Germany`. The API infers person
    filters and the kind of company to look in, and reports them in
    `interpretation`. A query from which nothing can be inferred is rejected.
- `company` (object, optional): Limits results to people whose current company
  matches. Takes the same `filter`, `semantic`, and `lookalike` inputs as
  `search_companies`.
- `expand` (string array, optional): See
  [Person expansions](#person-expansions).
- `pageSize` (integer, optional, default `20`, max `100`): Results per page.
- `cursor` (string, optional): `nextCursor` from the previous response. Keep
  the rest of the query the same. Cursors expire after 24 hours.

Cost: 2 credits per returned person, plus expansions. An empty result costs one
result's price.

#### `count_people`

Counts the people a `search_people` query would match, without returning them.
Use it to size or check a query before running the paid search.

Inputs:

- `filter`, `semantic`, `company` (objects, optional): The same as in
  `search_people`.

The response has `count`, `total`, and for a semantic query `interpretation`,
as in `count_companies`.

Cost: free.

### Account Tool

#### `get_current_user`

Fetches the authenticated user's credit usage and allowance, and the account's
capabilities and limits.

Inputs: none.

Cost: free.

## Shared Input Reference

### Value filters

A filter on a list of values is an object with one or more of these keys:

| Key     | Meaning                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `in`    | Matches any of the listed values.                                                                    |
| `all`   | Requires every listed value. Only on `keywords`, `technologies`, `naicsCodes`, and `categories`.     |
| `notIn` | Excludes anything matching a listed value.                                                           |

For example, `{ "country": { "in": ["TR", "US"] } }` or
`{ "keywords": { "all": ["fintech"], "notIn": ["gambling"] } }`.

The API also accepts a bare value or a bare array for these fields. The tools
only accept the object form, so that every filter has one unambiguous shape.

### Company filters

These are the keys of `filter` in `search_companies` and of `company.filter` in
`search_people`. Unless noted, each one is a [value filter](#value-filters).

- `query`: Text matched against company names, keywords, and domain prefixes.
- `id`: CompanyEnrich company IDs.
- `domain`: Company domains.
- `keywords`: Company keywords. Supports `all`.
- `technologies`: Technologies the company uses. Supports `all`.
- `region`: Region IDs.
- `country`: 2-letter country codes.
- `state`: State IDs (integers).
- `city`: City IDs (integers).
- `type`: Company types.
- `employees`: Employee count ranges.
- `reportedEmployees`: Employee count ranges as reported by external sources.
- `revenue`: Revenue ranges in USD.
- `naicsCodes`: NAICS codes as strings of 2 to 6 digits. Supports `all`.
- `categories`: Company categories. Supports `all`.
- `fundingRounds`: Funding rounds.
- `foundedYear` (range object): `{ min?: number, max?: number }`.
- `fundingAmount` (range object): `{ min?: number, max?: number }`.
- `fundingYear` (range object): `{ min?: number, max?: number }`, the latest
  funding year.
- `workforceGrowth` (object): `period`, `department`, `min`, and `max`. `min`
  and `max` are ratios, so `0.15` is 15% growth.
- `workforceSize` (object array): Each item has `department`, `min`, and `max`
  headcount.
- `require` (object): `{ all: [...] }`, the data a company must have, such as
  `linkedin`, `twitter`, `facebook`, `instagram`, `angellist`, `crunchbase`,
  `youtube`, `country`, `city`, `state`, `revenue`, `foundedYear`, or
  `anyFunding`.

Company enum values:

- `type`: `private`, `public`, `self-employed`, `self-owned`, `partnership`,
  `nonprofit`, `educational`, `government`.
- `categories`: `b2b`, `b2c`, `b2g`, `e-commerce`, `media`,
  `service-provider`, `mobile`, `saas`, `local-business`.
- `employees` and `reportedEmployees`: `1-10`, `11-50`, `51-200`, `201-500`,
  `501-1K`, `1K-5K`, `5K-10K`, `over-10K`.
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

### People filters

These are the keys of `filter` in `search_people`. The top-level filters match
a person's current roles. Unless noted, each one is a
[value filter](#value-filters).

- `query`: Text matched against person names.
- `companyId`: Current company IDs.
- `domain`: Current company domains.
- `companyLinkedinHandle`: LinkedIn handles or URLs of current companies.
- `seniority`: Current seniority levels.
- `department`: Current departments. A root department includes its
  sub-departments.
- `country`: 2-letter country codes of the person.
- `position`: Phrases matched against current job titles.
- `currentCompanyStartDate` (date range): `{ after?, before? }`, when the
  person joined their current company.
- `currentPositionStartDate` (date range): `{ after?, before? }`, when the
  person started their current position.
- `education` (object): `institutionName` and `institutionLinkedinHandle`
  value filters.
- `pastExperience` (object): Finds people by a previous job. All of its rules
  must match the same past role, and people who still work at an included
  company are left out.
  - `companyId`, `domain`, `companyLinkedinHandle`: Value filters.
  - `seniority`, `department`, `position`: `{ in: [...] }` only. Exclusions are
    not supported here.
  - `startDate`, `endDate` (date ranges): `{ after?, before? }`.

Dates are ISO 8601 datetimes such as `2024-01-01T00:00:00Z`.

People enum values:

- Seniority: `owner`, `founder`, `c-suite`, `partner`, `vp`, `head`,
  `director`, `manager`, `senior`, `entry`, `intern`.
- Department: root departments such as `c-suite`, `engineering-technical`,
  `finance`, `human-resources`, `information-technology`, `legal`,
  `marketing`, `operations`, `sales`, and `consulting`, or a sub-department
  such as `engineering-technical/software-development`. The full list is
  `PersonDepartmentEnum` in `src/schema.ts`.

### Company expansions

`expand` on the company tools adds data to each returned company. Each one
costs 1 extra credit per returned company:

- `financial`
- `keywords`
- `naicsCodes`
- `technologies`
- `workforce`: The latest 12 months of workforce history. Use
  `get_company_workforce` with its `nextCursor` for earlier years.

### Person expansions

`expand` on the people tools adds data to each returned person:

- `education`: 1 extra credit per returned person.
- `company`: The company profile for each current and past role. 1 extra
  credit per unique company whose profile is included.

## Credit Notes

Tool descriptions state the credit cost that the API documents for each call.
In short:

- A filter search costs 1 credit per company, a semantic search 2, and a
  lookalike search 5.
- People search costs 2 credits per person.
- Expansions are charged on top of the base cost.
- A lookup that finds nothing is free, except `enrich_company_by_properties`.
  A search with no results costs one result's price.
- `count_companies`, `count_people`, and `get_current_user` are free.

The MCP response includes any `x-credit-balance`, `x-credit-cost`, and
`x-credit-remaining` headers returned by the API under `creditInfo`.

## Upgrading from 2.x

Version 3 moves every tool from version 1 to version 2 of the CompanyEnrich
API. Tool inputs changed, so calls written for 2.x need updating:

- `find_similar_companies` is gone. Use `search_companies` with `lookalike`.
- `search_companies` takes `filter`, `semantic`, and `lookalike` objects
  instead of flat arguments. `semanticQuery` is now `semantic.query`, and
  `query` is now `filter.query`.
- Filters are [value filters](#value-filters). The separate `exclude` object
  and the `categoryOperator`, `keywordsOperator`, and `technologiesOperator`
  arguments are replaced by `notIn`, `in`, and `all`.
- Several filter names changed: `countries` to `country`, `states` to `state`,
  `cities` to `city`, `regions` to `region`, and `naicsCode` (integers) to
  `naicsCodes` (strings).
- `workforceGrowth` takes `min` and `max` ratios instead of `minPercent` and
  `maxPercent`.
- `search_people` takes `filter`, `semantic`, and `company`. The person
  filters moved under `filter`: `positionQuery` is now `filter.position`,
  `domains` is `filter.domain`, `countries` is `filter.country`, and the
  `atCurrent...` dates are `filter.currentCompanyStartDate` and
  `filter.currentPositionStartDate`. `companyFilter` is now `company`.
- Paging uses `cursor` instead of `page`.
- `includeWorkforce` is replaced by `expand: ["workforce"]`, which now costs 1
  credit instead of 5.
- Unknown arguments are rejected.

Version 3 also adds two free tools, `count_companies` and `count_people`.

## Privacy and Security

- Tool calls go to the CompanyEnrich API with your API key and an
  `x-companyenrich-app: mcp` header, which attributes the usage to MCP. The local
  server talks to nothing else, stores nothing, and has no telemetry.
- The hosted server does not store an API key sent directly as a bearer token.
  For OAuth sign-ins it keeps your grant in Cloudflare KV with the API key
  encrypted.
- OAuth sign-in and its approval step happen at CompanyEnrich's identity
  provider. The hosted server completes a sign-in only in the browser that
  started it.

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

## Publishing to npm

The local stdio server is published as `@companyenrich/mcp`.

### Automatic publishing from GitHub

The workflow in [`.github/workflows/publish.yml`](.github/workflows/publish.yml)
runs on every push to `main`. It installs dependencies from the lockfile,
type-checks, builds, and checks npm for the version in `package.json`. A new
stable version is published with the `latest` tag. If that version already
exists, the build succeeds and publishing is skipped. Older versions and
prereleases cannot replace `latest` through this workflow.

Configure the publishing token once before the first automated release:

1. Create a granular npm access token with **read and write** access to
   `@companyenrich/mcp` and **Bypass 2FA** enabled.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions**
   and add a repository secret named **`NPM_TOKEN`** containing the token.
3. Commit and push the workflow and package changes to `main`. With the
   already-published version `2.0.0`, this first run builds, checks npm
   authentication, and skips publishing.

GitHub stores the token as an encrypted secret. The workflow exposes it as
`NODE_AUTH_TOKEN` only for the authentication check and publishing step. Never
commit the token to the repository. Replace the `NPM_TOKEN` secret when rotating
the token or before it expires. No npm trusted-publisher connection is needed.
The repository is private, so this workflow does not force a public provenance
statement.

For each release, bump the version before committing your changes:

```bash
npm version patch --no-git-tag-version
# Commit your code changes and package.json, then:
git push origin main
```

Use `minor` or `major` instead of `patch` when appropriate. For example, the next
patch after `2.0.0` is `2.0.1`. Pushing code without a new version still checks
the build but does not create an npm release. You can retry a failed release
from **GitHub → Actions → Publish to npm → Run workflow**, selecting `main`.

See npm's [CI/CD token guide](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/)
for token configuration details.

### Manual publishing

Your npm account must have permission to publish under the `companyenrich`
scope. Enable two-factor authentication for interactive publishing.

From the repository root:

```bash
pnpm install --frozen-lockfile
npm run type-check
npm pack --dry-run
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public
```

`npm pack --dry-run` builds the server and lists the package contents without
publishing. Check that the package contains `dist/stdio.js`, `package.json`,
`README.md`, and `LICENSE`. Publishing runs the type check and builds the server
automatically. The package defaults to public access on the npm registry.

For subsequent releases, update the version first. Each release needs a
version that has not already been published. Choose either the GitHub workflow
or manual publishing for a release.

See npm's [scoped package publishing guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
for account and authentication requirements.

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
