import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import open from "open";
import { oauthClientConfig, SCOPES } from "./config.js";
import { saveTokens } from "./tokenStore.js";

export function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } = oauthClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function authorizeAccount(account) {
  const client = createOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    login_hint: account.email,
    state: account.id,
  });

  const code = await waitForAuthCode(authUrl);
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);
  const profile = await google
    .oauth2({ version: "v2", auth: client })
    .userinfo.get();

  if (
    account.email &&
    profile.data.email &&
    profile.data.email.toLowerCase() !== account.email.toLowerCase()
  ) {
    throw new Error(
      `Signed in as ${profile.data.email}, but account "${account.id}" expects ${account.email}. Re-run and pick the right Google account.`,
    );
  }

  saveTokens(account.id, { ...tokens, email: profile.data.email });
  return profile.data.email;
}

const LOOPBACK_HOST = "127.0.0.1";

function isLoopbackAddress(address) {
  if (!address) return false;
  if (address === "::1" || address === "127.0.0.1") return true;
  return address.startsWith("::ffff:127.");
}

function waitForAuthCode(authUrl) {
  const { redirectUri } = oauthClientConfig();
  const parsed = new URL(redirectUri);
  const port = Number(parsed.port) || 80;

  return new Promise((resolvePromise, rejectPromise) => {
    const server = http.createServer((req, res) => {
      try {
        if (!isLoopbackAddress(req.socket.remoteAddress)) {
          res.writeHead(403, { "Content-Type": "text/plain" });
          res.end("Forbidden: remote connections are not allowed.");
          return;
        }

        const url = new URL(req.url, redirectUri);
        if (url.pathname !== parsed.pathname) {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<html><body><p>You can close this tab.</p></body></html>`,
        );
        server.close();

        if (error) rejectPromise(new Error(`OAuth error: ${error}`));
        else if (code) resolvePromise(code);
        else rejectPromise(new Error("No code returned in OAuth redirect"));
      } catch (err) {
        rejectPromise(err);
      }
    });

    server.on("connection", (socket) => {
      if (!isLoopbackAddress(socket.remoteAddress)) {
        socket.destroy();
      }
    });

    server.listen(port, LOOPBACK_HOST, () => {
      console.log(
        `Opening browser for consent. Listening on ${redirectUri} (loopback only)`,
      );
      open(authUrl).catch(() => {
        console.log(`If the browser did not open, visit:\n${authUrl}`);
      });
    });

    server.on("error", rejectPromise);
  });
}
