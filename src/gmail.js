import { google } from "googleapis";
import { createOAuthClient } from "./oauth.js";
import { loadTokens, saveTokens } from "./tokenStore.js";

export function gmailClientFor(account) {
  const tokens = loadTokens(account.id);
  if (!tokens) {
    throw new Error(
      `No tokens for "${account.id}". Run: npm run auth -- ${account.id}`,
    );
  }

  const auth = createOAuthClient();
  auth.setCredentials(tokens);
  auth.on("tokens", (fresh) => {
    saveTokens(account.id, { ...tokens, ...fresh, email: tokens.email });
  });

  return google.gmail({ version: "v1", auth });
}

export async function recentThreads(account, max = 5) {
  const gmail = gmailClientFor(account);
  const { data } = await gmail.users.threads.list({
    userId: "me",
    maxResults: max,
  });
  return data.threads ?? [];
}
