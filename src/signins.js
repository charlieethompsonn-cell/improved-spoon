import { gmailClientFor } from "./gmail.js";

// Google sends these from no-reply@accounts.google.com whenever a new sign-in
// happens, a critical alert fires, or a new device is added. Subjects vary by
// locale and event type — this query is intentionally broad and we filter
// further when parsing.
const SENDER = "no-reply@accounts.google.com";
const SUBJECT_TERMS = [
  "Security alert",
  "Critical security alert",
  "sign-in",
  "signed in",
  "new device",
  "new sign-in",
];

function buildQuery(sinceDays) {
  const subjects = SUBJECT_TERMS.map((s) => `"${s}"`).join(" OR ");
  const after = Math.floor((Date.now() - sinceDays * 86_400_000) / 1000);
  return `from:${SENDER} subject:(${subjects}) after:${after}`;
}

export async function signinEvents(account, { sinceDays = 90, max = 50 } = {}) {
  const gmail = gmailClientFor(account);
  const { data } = await gmail.users.messages.list({
    userId: "me",
    q: buildQuery(sinceDays),
    maxResults: max,
  });

  const ids = (data.messages ?? []).map((m) => m.id);
  const events = [];
  for (const id of ids) {
    const { data: msg } = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    events.push(parseEvent(msg));
  }
  events.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  return events;
}

function parseEvent(message) {
  const headers = Object.fromEntries(
    (message.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]),
  );
  const subject = headers.subject ?? "";
  const date = headers.date ? new Date(headers.date) : null;
  const body = extractText(message.payload);
  const { device, location } = parseBody(body);

  return {
    id: message.id,
    date,
    subject,
    device: device ?? deviceFromSubject(subject),
    location,
    snippet: (message.snippet ?? "").replace(/&#39;/g, "'"),
  };
}

function extractText(part) {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const sub of part.parts) {
      const text = extractText(sub);
      if (text) return text;
    }
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function decodeBase64Url(data) {
  return Buffer.from(data, "base64").toString("utf8");
}

function deviceFromSubject(subject) {
  const m = subject.match(/sign-?in on (.+?)(?:\s*-|$)/i);
  return m ? m[1].trim() : null;
}

function parseBody(text) {
  // Patterns Google uses in the alert body, e.g.
  //   "Chrome on Windows"
  //   "Safari on iPhone"
  //   "Firefox on Mac"
  const onMatch = text.match(
    /\b(Chrome|Safari|Firefox|Edge|Opera|Brave|Samsung Internet|Gmail app|Mail app)\b\s+on\s+\b([A-Z][\w ]+?)\b/,
  );
  let device = onMatch ? `${onMatch[1]} on ${onMatch[2]}`.trim() : null;
  if (!device) {
    const osMatch = text.match(/\b(Windows|Mac|iPhone|iPad|Android|Linux|Chromebook)\b/);
    device = osMatch ? osMatch[0] : null;
  }

  // "City, Country" — best-effort. Google's alert usually places this
  // on its own line near the device info.
  const locMatch = text.match(
    /\b([A-Z][\w'’.-]+(?:[ -][A-Z][\w'’.-]+){0,3}),\s*([A-Z][\w'’ -]+)\b/,
  );
  const location = locMatch ? `${locMatch[1]}, ${locMatch[2].trim()}` : null;

  return { device, location };
}

export function formatEvent(event) {
  const when = event.date
    ? event.date.toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "unknown time";
  const device = event.device ?? "unknown device";
  const location = event.location ?? "unknown location";
  return `${when}  ${device.padEnd(28)} ${location}`;
}
