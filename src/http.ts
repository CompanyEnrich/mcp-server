import { env } from "cloudflare:workers";
import {
    createMcpHandler,
    getMcpAuthContext,
    type CreateMcpHandlerOptions,
} from "agents/mcp/server";
import { createCompanyEnrichMcpServer } from "./mcp";
import { requireEnvValue } from "./utils";

function getAccessToken() {
    const accessToken = getMcpAuthContext()?.props.accessToken;
    return typeof accessToken === "string" ? accessToken : undefined;
}

/**
 * Builds the `/mcp` request handler.
 *
 * The handler serves MCP 2026-07-28 (stateless, per-request metadata) and, in
 * the default `legacy: "stateless"` mode, still answers the `initialize`
 * handshake of 2025-era clients from a fresh server instance per request. A
 * factory is required so that concurrent requests never share a server.
 */
export function makeHandler(options: CreateMcpHandlerOptions = {}) {
    return createMcpHandler(
        () =>
            createCompanyEnrichMcpServer({
                apiEndpoint: requireEnvValue(env.API_ENDPOINT, "API_ENDPOINT"),
                getAccessToken,
            }),
        {
            route: "/mcp",
            legacy: "stateless",
            onerror: (error) => console.warn("MCP handler:", error.message),
            ...options,
        },
    );
}
