import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { makeHandler } from "./http";
import { ClerkHandler } from "./clerk-handler";

const mcpHandler = makeHandler();

/**
 * The provider's own access tokens have the form `userId:grantId:secret`.
 * Anything else that is not blank may be an API key.
 */
function isApiKeyCandidate(token: string) {
    return token.trim() !== "" && token.split(":").length !== 3;
}

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
    // A bearer token the provider does not know is treated as a CompanyEnrich
    // API key and passed through. The provider only gets here after its own
    // lookup missed, so a token in its own format is an expired or revoked
    // OAuth token: rejecting it produces the 401 that tells the client to
    // refresh or sign in again.
    resolveExternalToken: async ({ token }) =>
        isApiKeyCandidate(token) ? { props: { accessToken: token } } : null,
    tokenEndpoint: "/token",
});

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return oauth.fetch(request, env, ctx);
    },
} satisfies ExportedHandler<Env>;
