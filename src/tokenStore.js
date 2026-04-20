import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tokensDir } from "./config.js";

function tokenPath(accountId) {
  return resolve(tokensDir, `${accountId}.json`);
}

export function saveTokens(accountId, tokens) {
  mkdirSync(tokensDir, { recursive: true });
  writeFileSync(tokenPath(accountId), JSON.stringify(tokens, null, 2));
}

export function loadTokens(accountId) {
  const p = tokenPath(accountId);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function hasTokens(accountId) {
  return existsSync(tokenPath(accountId));
}
