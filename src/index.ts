import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { makeHandler } from "./http";
import { ClerkHandler } from "./clerk-handler";

const mcpHandler = makeHandler();

const oauth = new OAuthProvider({
    apiRoute: "/mcp",
    apiHandler: { fetch: mcpHandler },
    authorizeEndpoint: "/authorize",
    // Client ID Metadata Documents (MCP 2026-07-28). Requires the
    // `global_fetch_strictly_public` compatibility flag in wrangler.jsonc.
    clientIdMetadataDocumentEnabled: true,
    // Dynamic Client Registration is deprecated by MCP 2026-07-28 but kept for
    // clients that cannot use Client ID Metadata Documents yet.
    clientRegistrationEndpoint: "/register",
    defaultHandler: ClerkHandler as any,
    resolveExternalToken: async ({ token }) => ({
        props: { accessToken: token },
    }),
    tokenEndpoint: "/token",
});

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return oauth.fetch(request, env, ctx);
    },
} satisfies ExportedHandler<Env>;
