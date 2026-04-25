# improved-spoon

Link two Gmail accounts via OAuth 2.0 and run basic queries against each.

Pre-configured for:

- `charliee.thompsonn@gmail.com` — Personal
- `office.thompsonworks@gmail.com` — Office

## Setup

1. Create an OAuth 2.0 Client (Desktop or Web) in Google Cloud Console with
   the Gmail API enabled. Add `http://localhost:4567/oauth2callback` as a
   redirect URI.
2. `cp .env.example .env` and fill in `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.
3. `npm install`.

### One-line install (Windows / PowerShell)

```powershell
irm https://raw.githubusercontent.com/charlieethompsonn-cell/improved-spoon/main/install.ps1 | iex
```

Clones the repo to `%USERPROFILE%\improved-spoon` (override with
`$env:SPOON_HOME`), runs `npm install`, and seeds `.env` from `.env.example`.
Requires Git and Node.js 18+ on `PATH`.

## Usage

```
npm run list                      # show configured accounts
npm run auth -- personal          # authorize one account
npm run auth -- all               # authorize every account in accounts.json
npm run status                    # show link status and token expiry
node src/index.js recent office   # print recent threads for the office account
npm run signins -- all            # show recent Google sign-in alerts for every account
npm run signins -- personal --since 30d
```

Tokens are stored under `tokens/<id>.json` and gitignored.

## Sign-in visibility

The `signins` command answers "who's logged into my Gmail and where?" by
parsing the security alerts Google itself sends from
`no-reply@accounts.google.com` (subjects like "Security alert", "New sign-in
on …"). For each event it prints the timestamp, device/browser, and
approximate location.

This is a historical view drawn from your inbox — it's only as complete as
the alerts Google has sent. The Gmail API does not expose live session or
device data; that information is only visible at
[myaccount.google.com/security](https://myaccount.google.com/security).
If `signins` shows something you don't recognize, go there to revoke the
session and change your password.
