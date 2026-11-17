# Installing the CompanyEnrich MCP server

This file is for AI agents that set up MCP servers on a user's behalf, such as
Cline. People can follow the [README](README.md) instead.

## What you need from the user

- A CompanyEnrich API key. The user creates one at
  <https://app.companyenrich.com/access-keys>. Ask for it. Never make one up.
- Node.js 20 or newer for the local server. Check with `node -v`.

## Option 1: local server (stdio)

This works in every MCP client. There is nothing to clone or build. `npx`
downloads the published [`@companyenrich/mcp`](https://www.npmjs.com/package/@companyenrich/mcp)
package.

Add this entry to the client's MCP settings file, keeping any servers that are
already there:

```json
{
  "mcpServers": {
    "companyenrich": {
      "command": "npx",
      "args": ["-y", "@companyenrich/mcp"],
      "env": {
        "COMPANYENRICH_API_KEY": "<the user's API key>"
      }
    }
  }
}
```

`COMPANYENRICH_API_KEY` is the only required variable.

## Option 2: hosted server (Streamable HTTP)

Use this if the client supports remote MCP servers and the user prefers not to
run anything locally.

- URL: `https://mcp.companyenrich.com/mcp`
- Authentication: OAuth sign-in when the client supports it, or the header
  `Authorization: Bearer <the user's API key>`.

## Check that it works

Call `get_current_user`. It is free and returns the account and credit balance.

- `Authentication failed. Please check your API key.` means the key is wrong or
  is still a placeholder. The server only checks the key when a tool runs, so
  the tools can appear even with a bad key.
- `COMPANYENRICH_API_KEY is not set` means the `env` block is missing from the
  local server entry.

## Costs

`get_current_user`, `count_companies` and `count_people` are free. Every other
tool spends credits from the user's CompanyEnrich account. Search tools charge
per result returned.

- Do not call a paid tool to test the setup. Use `get_current_user`.
- Ask the user before the first paid call, and say how many results you intend
  to request.

The [README](README.md#tools) lists each tool and its cost.
