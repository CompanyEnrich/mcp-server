#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createCompanyEnrichMcpServer } from "./mcp";

const DEFAULT_API_URL = "https://api.companyenrich.com";

const apiKey = process.env.COMPANYENRICH_API_KEY?.trim();

if (!apiKey) {
    console.error(
        "COMPANYENRICH_API_KEY is not set. Create an API key at https://app.companyenrich.com/access-keys and pass it in this server's environment.",
    );
    process.exit(1);
}

const apiEndpoint = process.env.COMPANYENRICH_API_URL?.trim() || DEFAULT_API_URL;

// Serves MCP 2026-07-28 and, like the HTTP handler, 2025-era `initialize`
// clients. stdout carries the protocol, so diagnostics must only use stderr.
serveStdio(
    () =>
        createCompanyEnrichMcpServer({
            apiEndpoint,
            getAccessToken: () => apiKey,
        }),
    {
        legacy: "serve",
        onerror: (error) => console.error("MCP stdio:", error.message),
    },
);
