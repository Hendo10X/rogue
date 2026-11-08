/**
 * Turns a delivered log line like
 *   user2958434479543|1@Tainguyenmmo.net|lefortblanchuk@hotmail.com|Tikmail@123|backup@mail.com
 * into labelled fields (Username, Password, Email, …) so customers can read it.
 *
 * Pure and client-safe. Where the labels come from, best first:
 *   1. a format the listing taught us (`listing.metadata.logFormat`, learned by AI once per listing),
 *   2. a "Format: login|pass|mail|…" line in the listing description,
 *   3. content + position rules (below).
 * The raw line is never changed, so customers can still copy it as-is.
 */

export type LogField = { label: string; value: string };
export type LogFormat = { labels: string[]; delimiter?: string };

const EMAIL = /^[^\s@|:]+@[^\s@|:]+\.[a-z]{2,}$/i;
const URL_RE = /^https?:\/\/\S+$/i;
const DATE = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/;
const PHONE = /^\+\d{8,15}$/;
const ALREADY_LABELLED = /^[A-Za-z][A-Za-z0-9 _/-]{0,24}:\s+\S/;

function is2fa(v: string): boolean {
  const s = v.replace(/\s+/g, "");
  return s.length >= 16 && s.length <= 64 && /^[A-Z2-7]+=*$/i.test(s) && /[A-Z]/i.test(s) && !/^\d+$/.test(s);
}

function isCookie(v: string): boolean {
  if (/\b(c_user|xs|datr|sessionid|auth_token|ct0|sid_tt|ds_user_id)=/i.test(v)) return true;
  return v.includes("=") && (v.includes(";") || v.length > 80);
}

function isToken(v: string): boolean {
  return /^EAA[A-Za-z0-9]{20,}$/.test(v) || (v.length >= 60 && !/\s/.test(v) && !v.includes("="));
}

/** Content-only label for fields that are unmistakable wherever they sit. */
function specialLabel(v: string): string | null {
  if (URL_RE.test(v)) return "Link";
  if (isCookie(v)) return "Cookie";
  if (isToken(v)) return "Token";
  if (is2fa(v)) return "2FA";
  if (DATE.test(v)) return "Date";
  if (PHONE.test(v)) return "Phone";
  return null;
}

/** Which delimiter splits this line, or null when it isn't a delimited log. */
export function detectDelimiter(line: string): string | null {
  if (line.includes("|")) return "|";
  if (line.includes("\t")) return "\t";
  // ":" only when it isn't part of a URL and the line isn't already "Label: value".
  const noUrls = line.replace(/https?:\/\//gi, "");
  if (noUrls.includes(":") && !ALREADY_LABELLED.test(line)) return ":";
  return null;
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter !== ":") return line.split(delimiter).map((s) => s.trim());
  // Keep "https://" together when splitting on ":".
  return line
    .replace(/(https?):\/\//gi, "$1\u0000//")
    .split(":")
    .map((s) => s.replace(/\u0000/g, ":").trim());
}

/** Rule-based labels for one split line (position + content). */
export function guessLabels(parts: string[]): string[] {
  const labels: string[] = [];
  let stage: "login" | "password" | "email" | "emailPassword" | "recovery" | "extra" = "login";
  for (let i = 0; i < parts.length; i++) {
    const v = parts[i];
    if (stage === "login") {
      labels.push(EMAIL.test(v) ? "Email" : /^\d{6,}$/.test(v) ? "UID" : "Username");
      stage = "password";
      continue;
    }
    const special = specialLabel(v);
    if (special) {
      labels.push(special);
      continue;
    }
    if (stage === "password") {
      // "user|mail@x.com|pass" → that's the email. "user|1@x.net|mail@y.com|…" → the first is the password.
      const nextIsEmail = EMAIL.test(parts[i + 1] ?? "");
      if (EMAIL.test(v) && !nextIsEmail && labels[0] !== "Email") {
        labels.push("Email");
        stage = "emailPassword";
        // The password comes after; mark it so the next plain field is Password.
        const after = parts[i + 1];
        if (after !== undefined && !specialLabel(after) && !EMAIL.test(after)) {
          labels.push("Password");
          i++;
        }
        continue;
      }
      labels.push("Password");
      stage = "email";
      continue;
    }
    if (stage === "email") {
      if (EMAIL.test(v)) {
        labels.push("Email");
        stage = "emailPassword";
      } else {
        labels.push("Extra");
      }
      continue;
    }
    if (stage === "emailPassword") {
      if (EMAIL.test(v)) {
        labels.push("Recovery email");
        stage = "extra";
      } else {
        labels.push("Email password");
        stage = "recovery";
      }
      continue;
    }
    if (stage === "recovery" && EMAIL.test(v)) {
      labels.push("Recovery email");
      stage = "extra";
      continue;
    }
    labels.push(EMAIL.test(v) ? "Email" : "Extra");
  }
  return labels;
}

/** Labels one log line. Null when it isn't a delimited log (show it raw). */
export function labelLog(line: string, format?: LogFormat | null): LogField[] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const delimiter = format?.delimiter && trimmed.includes(format.delimiter) ? format.delimiter : detectDelimiter(trimmed);
  if (!delimiter) return null;
  const parts = splitLine(trimmed, delimiter);
  if (parts.length < 2) return null;

  const guessed = guessLabels(parts);
  const labels = parts.map((_, i) => format?.labels[i] || guessed[i]);

  // Number repeated labels: "Extra", "Extra 2"…
  const seen = new Map<string, number>();
  return parts
    .map((value, i) => {
      const base = labels[i];
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return { label: n > 1 ? `${base} ${n}` : base, value };
    })
    .filter((f) => f.value !== "");
}

/** The single-account columns of a delivery (username, password…), read from the first log. */
export function deliveryColumns(lines: string[], format?: LogFormat | null) {
  const fields = labelLog(lines[0] ?? "", format) ?? [];
  const pick = (...labels: string[]) => fields.find((f) => labels.includes(f.label))?.value || null;
  return {
    username: pick("Username", "UID") ?? pick("Email"),
    password: pick("Password"),
    email: pick("Email"),
    emailPassword: pick("Email password"),
  };
}

/** Labelled text for copying or email: "Username: …\nPassword: …". */
export function logToText(fields: LogField[]): string {
  return fields.map((f) => `${f.label}: ${f.value}`).join("\n");
}

// ── Format hints in listing descriptions ────────────────────────────────────

const TOKEN_LABELS: Array<[RegExp, string]> = [
  [/^(mailpass(word)?|emailpass(word)?|passmail|passemail|pass(word)?(of)?e?mail|e?mailpwd)$/, "Email password"],
  [/^(recovery|recoverye?mail|backupe?mail|e?mailrecovery|recoverymail)$/, "Recovery email"],
  [/^(2fa|2fakey|key2fa|2facode|2fasecret|twofa|totp|secret|secretkey|authkey)$/, "2FA"],
  [/^(cookies?)$/, "Cookie"],
  [/^(token|accesstoken|eaab?|eaag)$/, "Token"],
  [/^(uid|id|userid|fbid)$/, "UID"],
  [/^(user(name)?|login|account|acc|handle|name)$/, "Username"],
  [/^(pass(word)?|pwd|pw)$/, "Password"],
  [/^(e?mail|gmail|hotmail|outlook|yahoo)$/, "Email"],
  [/^(phone|number|phonenumber|tel)$/, "Phone"],
  [/^(dob|birthday|birthdate|date|createdate|regdate)$/, "Date"],
  [/^(link|url|profile|profilelink)$/, "Link"],
];

function tokenLabel(token: string): string | null {
  const key = token.toLowerCase().replace(/[\s_\-.()]/g, "");
  for (const [re, label] of TOKEN_LABELS) if (re.test(key)) return label;
  return null;
}

/**
 * Finds a format like "Format: login|pass|mail|mailpass|2fa" in a listing
 * description. Null when there's none we trust.
 */
export function parseFormatHint(description: string | null | undefined): LogFormat | null {
  if (!description) return null;
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.replace(/^[^:]{0,30}\b(format|fmt|structure|data)\b[^:]{0,20}:\s*/i, "").trim();
    for (const delimiter of ["|", ":", "----"]) {
      if (!line.includes(delimiter)) continue;
      const tokens = line.split(delimiter).map((t) => t.trim()).filter(Boolean);
      if (tokens.length < 2 || tokens.length > 12) continue;
      if (tokens.some((t) => t.length > 24 || t.split(/\s+/).length > 3)) continue;
      const labels = tokens.map((t) => tokenLabel(t));
      const known = labels.filter(Boolean).length;
      if (known < 2 || known / tokens.length < 0.6) continue;
      return {
        delimiter,
        labels: labels.map((l, i) => l ?? tokens[i].charAt(0).toUpperCase() + tokens[i].slice(1)),
      };
    }
  }
  return null;
}

/** The best format we know for a listing (learned by AI, else from its description). */
export function formatForListing(
  metadata: Record<string, unknown> | null | undefined,
  description: string | null | undefined,
): LogFormat | null {
  const learned = metadata?.logFormat as LogFormat | undefined;
  if (learned && Array.isArray(learned.labels) && learned.labels.length >= 2) return learned;
  return parseFormatHint(description);
}

// ── Shape of a line, without the secrets (for the AI) ──────────────────────

/** Describes each field's shape so a model can label it without seeing any credential. */
export function describeShape(line: string): string[] | null {
  const delimiter = detectDelimiter(line.trim());
  if (!delimiter) return null;
  return splitLine(line.trim(), delimiter).map((v) => {
    const traits: string[] = [`${v.length} chars`];
    if (EMAIL.test(v)) traits.push(`email-like @${v.split("@")[1].toLowerCase()}`);
    else if (v.includes("@")) traits.push("contains @");
    if (/^\d+$/.test(v)) traits.push("digits only");
    else {
      if (/[a-z]/.test(v)) traits.push("lowercase");
      if (/[A-Z]/.test(v)) traits.push("uppercase");
      if (/\d/.test(v)) traits.push("digits");
      if (/[^A-Za-z0-9]/.test(v)) traits.push("symbols");
    }
    if (is2fa(v)) traits.push("base32-like");
    if (isCookie(v)) traits.push("cookie-like key=value pairs");
    if (/^EAA/.test(v)) traits.push("starts EAA");
    if (URL_RE.test(v)) traits.push("URL");
    if (DATE.test(v)) traits.push("date-like");
    return traits.join(", ");
  });
}
