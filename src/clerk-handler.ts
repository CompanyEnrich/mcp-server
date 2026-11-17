import {
  AuthorizationError,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { type Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { requireEnvValue } from "./utils";

/*
 * OAuth sign-in through Clerk.
 *
 * This Worker is an OAuth server for MCP clients and, at the same time, a
 * single OAuth client of Clerk. `/authorize` validates the MCP client's
 * request and sends the browser on to Clerk, which signs the user in and
 * shows its own approval page. This Worker shows no page of its own.
 *
 * The validated request is stored in KV under a random id. Only that id
 * travels through Clerk as `state`, and `/callback` accepts it only from the
 * browser that holds the matching cookie, and only once. So `/callback` never
 * acts on a request it did not validate and store itself.
 */

type Bindings = Env & { OAUTH_PROVIDER: OAuthHelpers };
type AppContext = Context<{ Bindings: Bindings }>;

/** How long the user has to finish signing in at Clerk. */
const STATE_TTL_SECONDS = 600;
const STATE_KEY_PREFIX = "authorize-state:";
const STATE_ID_PATTERN = /^[0-9a-f]{64}$/;
const STATE_COOKIE_PREFIX = "ce_oauth_state_";

const app = new Hono<{ Bindings: Bindings }>();

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

  const stateId = randomToken();
  await stateStore(c).put(
    `${STATE_KEY_PREFIX}${stateId}`,
    JSON.stringify(oauthReqInfo),
    { expirationTtl: STATE_TTL_SECONDS },
  );
  setAppCookie(c, `${STATE_COOKIE_PREFIX}${stateId}`, "1");

  return c.redirect(
    getUpstreamAuthorizeUrl({
      client_id: requireEnvValue(c.env.OAUTH_CLIENT_ID, "OAUTH_CLIENT_ID"),
      redirect_uri: new URL("/callback", c.req.url).href,
      scope: "email openid profile",
      state: stateId,
      upstream_url: `${requireEnvValue(c.env.OAUTH_CLERK, "OAUTH_CLERK")}/oauth/authorize`,
    }),
    302,
  );
});

app.get("/callback", async (c) => {
  const stateId = c.req.query("state") ?? "";
  const stateCookie = `${STATE_COOKIE_PREFIX}${stateId}`;

  if (!STATE_ID_PATTERN.test(stateId) || getAppCookie(c, stateCookie) !== "1") {
    return c.text(
      "This sign-in was not started in this browser, or it has expired. Go back to your MCP client and start signing in again.",
      400,
    );
  }

  const store = stateStore(c);
  const stateKey = `${STATE_KEY_PREFIX}${stateId}`;
  const oauthReqInfo = await store.get<AuthRequest>(stateKey, "json");
  deleteAppCookie(c, stateCookie);

  if (!oauthReqInfo) {
    return c.text(
      "This sign-in has expired. Go back to your MCP client and start signing in again.",
      400,
    );
  }

  // A state is good for one callback only.
  await store.delete(stateKey);

  const code = c.req.query("code");
  if (!code) {
    const denied = c.req.query("error") === "access_denied";
    return c.redirect(
      denied
        ? clientErrorRedirect(oauthReqInfo, "access_denied", "The user denied the request.")
        : clientErrorRedirect(oauthReqInfo, "server_error", "Sign-in did not complete."),
      302,
    );
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
    return c.text("Failed to fetch access token", 500);
  }

  const body: any = await resp.json();

  if (!body.access_token || typeof body.access_token !== "string" || !body.id_token || typeof body.id_token !== "string") {
    return c.text("Missing access token", 400);
  }

  const userInfoResp = await fetch(`${apiEndpoint}/internal/me`, {
    headers: {
      "Authorization": `Bearer ${body.id_token}`
    }
  });

  if (!userInfoResp.ok) {
    console.log(await userInfoResp.text());
    return c.text("Failed to fetch user info", 500);
  }

  const user: any = await userInfoResp.json();

  const accessKeysResp = await fetch(`${apiEndpoint}/internal/accesskeys`, {
    headers: {
      "Authorization": `Bearer ${body.id_token}`
    }
  });

  if (!accessKeysResp.ok) {
    console.log(await accessKeysResp.text());
    return c.text("Failed to fetch access keys", 500);
  }

  const accessKeys: any[] = await accessKeysResp.json();

  if (accessKeys.length === 0) {
    return c.text("No access keys found for user", 400);
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
      return c.text(error.description, 400);
    }
    throw error;
  }

  return c.redirect(redirectTo, 302);
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

/**
 * Builds the URL that reports an OAuth error to the MCP client. Only call this
 * with a request the provider validated: its redirect URI is registered for
 * the client.
 */
function clientErrorRedirect(
  request: AuthRequest,
  error: "access_denied" | "server_error",
  description: string,
) {
  const redirect = new URL(request.redirectUri);
  redirect.searchParams.set("error", error);
  redirect.searchParams.set("error_description", description);
  if (request.state) redirect.searchParams.set("state", request.state);
  // RFC 9207: identify the issuer on error responses as well.
  if (request.issuer) redirect.searchParams.set("iss", request.issuer);

  return redirect.toString();
}

function stateStore(c: AppContext) {
  const store = c.env.OAUTH_KV;
  if (!store) {
    throw new Error("OAUTH_KV is not configured");
  }
  return store;
}

/**
 * On HTTPS the cookies use the `__Host-` prefix, which browsers only accept
 * from this exact host over a secure connection. Plain HTTP only happens in
 * local development, where browsers refuse that prefix.
 */
function isSecureRequest(c: AppContext) {
  return new URL(c.req.url).protocol === "https:";
}

function getAppCookie(c: AppContext, name: string) {
  return isSecureRequest(c) ? getCookie(c, name, "host") : getCookie(c, name);
}

function setAppCookie(c: AppContext, name: string, value: string) {
  const secure = isSecureRequest(c);
  setCookie(c, name, value, {
    maxAge: STATE_TTL_SECONDS,
    // Lax, so that the cookie comes back on the redirect from Clerk.
    sameSite: "Lax",
    httpOnly: true,
    path: "/",
    secure,
    ...(secure ? { prefix: "host" as const } : {}),
  });
}

function deleteAppCookie(c: AppContext, name: string) {
  const secure = isSecureRequest(c);
  deleteCookie(c, name, {
    path: "/",
    secure,
    ...(secure ? { prefix: "host" as const } : {}),
  });
}

function randomToken() {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
