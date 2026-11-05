import { env } from "cloudflare:workers";
import {
  AuthorizationError,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { requireEnvValue } from "./utils";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", async (c) => {
  let oauthReqInfo: AuthRequest;
  try {
    oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }
    throw error;
  }

  if (!oauthReqInfo.clientId) {
    return c.text("Invalid request", 400);
  }

  return redirectToClerk(c.req.raw, oauthReqInfo);
});

/**
 * Renders an OAuth authorization error. The provider attaches `redirectUri`
 * only after the client and its registered redirect URI were validated, so an
 * error without one must be shown locally instead of redirecting.
 */
function authorizationErrorResponse(error: AuthorizationError) {
  if (!error.redirectUri) {
    return new Response(error.description, { status: 400 });
  }

  const redirect = new URL(error.redirectUri);
  redirect.searchParams.set("error", error.code);
  redirect.searchParams.set("error_description", error.description);
  if (error.state) redirect.searchParams.set("state", error.state);
  // RFC 9207: identify the issuer on error responses as well.
  if (error.issuer) redirect.searchParams.set("iss", error.issuer);

  return Response.redirect(redirect.toString(), 302);
}

async function redirectToClerk(
  request: Request,
  oauthReqInfo: AuthRequest,
  headers: Record<string, string> = {},
) {
  const oauthClientId = requireEnvValue(env.OAUTH_CLIENT_ID, "OAUTH_CLIENT_ID");
  const oauthClerk = requireEnvValue(env.OAUTH_CLERK, "OAUTH_CLERK");

  return new Response(null, {
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        client_id: oauthClientId,
        redirect_uri: new URL("/callback", request.url).href,
        scope: "email openid profile",
        state: btoa(JSON.stringify(oauthReqInfo)),
        upstream_url: `${oauthClerk}/oauth/authorize`,
      }),
    },
    status: 302,
  });
}

app.get("/callback", async (c) => {
  const oauthReqInfo = JSON.parse(atob(c.req.query("state") as string)) as AuthRequest;
  const code = c.req.query("code");

  if (!oauthReqInfo.clientId || !code) {
    return new Response("Failed to fetch access token", { status: 400 })
  }

  const oauthClerk = requireEnvValue(c.env.OAUTH_CLERK, "OAUTH_CLERK");
  const oauthClientId = requireEnvValue(c.env.OAUTH_CLIENT_ID, "OAUTH_CLIENT_ID");
  const oauthClientSecret = requireEnvValue(c.env.OAUTH_CLIENT_SECRET, "OAUTH_CLIENT_SECRET");
  const apiEndpoint = requireEnvValue(c.env.API_ENDPOINT, "API_ENDPOINT");

  const resp = await fetch(`${oauthClerk}/oauth/token`, {
    body: new URLSearchParams({ client_id: oauthClientId, client_secret: oauthClientSecret, code, redirect_uri: new URL("/callback", c.req.url).href, grant_type: "authorization_code" }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!resp.ok) {
    console.log(await resp.text());
    return new Response("Failed to fetch access token", { status: 500 })
  }

  const body: any = await resp.json();

  if (!body.access_token || typeof body.access_token !== "string" || !body.id_token || typeof body.id_token !== "string") {
    return new Response("Missing access token", { status: 400 });
  }

  const userInfoResp = await fetch(`${apiEndpoint}/internal/me`, {
    headers: {
      "Authorization": `Bearer ${body.id_token}`
    }
  });

  if (!userInfoResp.ok) {
    console.log(await userInfoResp.text());
    return new Response("Failed to fetch user info", { status: 500 });
  }

  const user: any = await userInfoResp.json();

  const accessKeysResp = await fetch(`${apiEndpoint}/internal/accesskeys`, {
    headers: {
      "Authorization": `Bearer ${body.id_token}`
    }
  });

  if (!accessKeysResp.ok) {
    console.log(await accessKeysResp.text());
    return new Response("Failed to fetch access keys", { status: 500 });
  }

  const accessKeys: any[] = await accessKeysResp.json();

  if (accessKeys.length === 0) {
    return new Response("No access keys found for user", { status: 400 });
  }

  // Return back to the MCP client a new token
  let redirectTo: string;
  try {
    ({ redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      metadata: {
        label: user.name,
      },
      props: {
        accessToken: accessKeys[0].key,
        email: user.email,
        login: user.id,
        name: user.name,
      } as Props,
      request: oauthReqInfo,
      scope: oauthReqInfo.scope,
      userId: user.id,
    }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // The request was reconstructed from `state`, so it must not be trusted
      // to build an error redirect. Render the failure locally instead.
      return new Response(error.description, { status: 400 });
    }
    throw error;
  }

  return Response.redirect(redirectTo);
});


export function getUpstreamAuthorizeUrl({
  upstream_url,
  client_id,
  scope,
  redirect_uri,
  state,
}: {
  upstream_url: string;
  client_id: string;
  scope: string;
  redirect_uri: string;
  state?: string;
}) {
  const upstream = new URL(upstream_url);
  upstream.searchParams.set("client_id", client_id);
  upstream.searchParams.set("redirect_uri", redirect_uri);
  upstream.searchParams.set("scope", scope);
  if (state) upstream.searchParams.set("state", state);
  upstream.searchParams.set("response_type", "code");
  return upstream.href;
}

export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

export { app as ClerkHandler };
