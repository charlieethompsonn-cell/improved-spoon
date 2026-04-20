#!/usr/bin/env node
import { loadAccounts, findAccount } from "./config.js";
import { hasTokens, loadTokens } from "./tokenStore.js";
import { authorizeAccount } from "./oauth.js";
import { recentThreads } from "./gmail.js";

const [, , command, ...rest] = process.argv;

async function main() {
  switch (command) {
    case "list":
      return listAccounts();
    case "auth":
      return authCommand(rest);
    case "status":
      return statusCommand();
    case "recent":
      return recentCommand(rest);
    default:
      printHelp();
      process.exitCode = command ? 1 : 0;
  }
}

function printHelp() {
  console.log(`gmail-link — manage linked Gmail accounts

Commands:
  list                 Show configured accounts
  auth <id|email>      Authorize a single account, or "all" for every account
  status               Show which accounts are linked
  recent <id|email>    Print the 5 most recent threads for an account

Configure accounts in accounts.json. Set OAuth creds in .env (see .env.example).`);
}

function listAccounts() {
  for (const a of loadAccounts()) {
    const linked = hasTokens(a.id) ? "linked" : "not linked";
    console.log(`- ${a.id.padEnd(10)} ${a.email.padEnd(36)} [${linked}]`);
  }
}

async function authCommand(args) {
  const target = args[0];
  if (!target) {
    console.error("Usage: auth <id|email|all>");
    process.exitCode = 1;
    return;
  }

  const accounts =
    target === "all"
      ? loadAccounts()
      : [findAccount(target)].filter(Boolean);

  if (accounts.length === 0) {
    console.error(`No account matching "${target}" in accounts.json`);
    process.exitCode = 1;
    return;
  }

  for (const account of accounts) {
    console.log(`\nAuthorizing ${account.label} (${account.email})`);
    const email = await authorizeAccount(account);
    console.log(`  linked as ${email}`);
  }
}

function statusCommand() {
  for (const a of loadAccounts()) {
    const tokens = loadTokens(a.id);
    if (!tokens) {
      console.log(`- ${a.id}: not linked`);
      continue;
    }
    const expires = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : "unknown";
    console.log(`- ${a.id}: linked as ${tokens.email} (expires ${expires})`);
  }
}

async function recentCommand(args) {
  const account = findAccount(args[0] ?? "");
  if (!account) {
    console.error(`Unknown account "${args[0]}"`);
    process.exitCode = 1;
    return;
  }
  const threads = await recentThreads(account);
  for (const t of threads) {
    console.log(`${t.id}\t${t.snippet ?? ""}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
