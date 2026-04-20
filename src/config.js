import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, "..");
export const tokensDir = resolve(projectRoot, "tokens");
export const accountsPath = resolve(projectRoot, "accounts.json");

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function loadAccounts() {
  const raw = readFileSync(accountsPath, "utf8");
  const { accounts } = JSON.parse(raw);
  return accounts;
}

export function findAccount(idOrEmail) {
  const accounts = loadAccounts();
  return accounts.find(
    (a) => a.id === idOrEmail || a.email === idOrEmail,
  );
}

export function oauthClientConfig() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI = "http://localhost:4567/oauth2callback",
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Copy .env.example to .env and fill in values from your Google Cloud OAuth client.",
    );
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
}
