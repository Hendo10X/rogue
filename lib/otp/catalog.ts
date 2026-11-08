/**
 * One catalog across OTP providers: countries are matched by ISO code
 * ("us", or "us_virtual" for Grizzly's virtual US numbers) and apps by name
 * ("whatsapp"), so a customer sees each country and app once whichever
 * provider sells it.
 */

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Provider spellings that aren't the standard English name. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  uk: "GB",
  england: "GB",
  "great britain": "GB",
  russia: "RU",
  "russian federation": "RU",
  "south korea": "KR",
  korea: "KR",
  "north korea": "KP",
  "czech republic": "CZ",
  czechia: "CZ",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "dr congo": "CD",
  "congo (dem. republic)": "CD",
  "congo (dem. rep.)": "CD",
  "democratic republic of the congo": "CD",
  congo: "CG",
  "republic of the congo": "CG",
  "hong kong": "HK",
  macau: "MO",
  macao: "MO",
  vietnam: "VN",
  "viet nam": "VN",
  laos: "LA",
  syria: "SY",
  iran: "IR",
  moldova: "MD",
  bolivia: "BO",
  venezuela: "VE",
  tanzania: "TZ",
  "cape verde": "CV",
  swaziland: "SZ",
  eswatini: "SZ",
  burma: "MM",
  myanmar: "MM",
  "east timor": "TL",
  "timor-leste": "TL",
  "north macedonia": "MK",
  macedonia: "MK",
  palestine: "PS",
  taiwan: "TW",
  turkey: "TR",
  türkiye: "TR",
  "bosnia and herzegovina": "BA",
  bosnia: "BA",
  "trinidad and tobago": "TT",
  "saint kitts and nevis": "KN",
  "saint lucia": "LC",
  "saint vincent": "VC",
  "antigua and barbuda": "AG",
  "the gambia": "GM",
  gambia: "GM",
  "the bahamas": "BS",
  bahamas: "BS",
  kosovo: "XK",
};

let byName: Map<string, string> | null = null;

function nameIndex(): Map<string, string> {
  if (byName) return byName;
  byName = new Map();
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      let name: string | undefined;
      try {
        name = regionNames.of(code);
      } catch {
        continue;
      }
      // Unknown codes come back unchanged. First code wins, so the alias "UK" doesn't replace "GB".
      if (name && name !== code && !byName.has(normal(name))) byName.set(normal(name), code);
    }
  }
  return byName;
}

function normal(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9()' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rogue's country id for a provider's country: lowercase ISO code, plus
 * "_virtual" for virtual numbers. Null when the name isn't recognised.
 * `iso` wins when the provider gives one (SMSPool does).
 */
export function countryId(name: string, iso?: string | null): string | null {
  const virtual = /\bvirtual\b/i.test(name);
  let code = iso && /^[A-Za-z]{2}$/.test(iso) ? iso.toUpperCase() : null;
  if (!code) {
    const n = normal(name.replace(/\(?\bvirtual\b\)?/gi, ""));
    code = COUNTRY_ALIASES[n] ?? nameIndex().get(n) ?? null;
  }
  if (!code) return null;
  return virtual ? `${code.toLowerCase()}_virtual` : code.toLowerCase();
}

/** Display name for a country id ("us" → "United States", "us_virtual" → "United States (virtual)"). */
export function countryLabel(id: string): string {
  const [code, flag] = id.split("_");
  if (/^[a-z]{2}$/.test(code)) {
    try {
      const name = regionNames.of(code.toUpperCase());
      if (name && name.toLowerCase() !== code) return flag === "virtual" ? `${name} (virtual)` : name;
    } catch {
      // fall through
    }
  }
  // Legacy 5sim slugs ("usa", "england").
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** Names that mean the same app at different providers. */
const APP_ALIASES: Record<string, string> = {
  x: "twitter",
  "x (twitter)": "twitter",
  "twitter (x)": "twitter",
  chatgpt: "openai",
  "openai (chatgpt)": "openai",
  gmail: "google",
  youtube: "google",
  "facebook messenger": "facebook",
  "microsoft (outlook)": "microsoft",
  outlook: "microsoft",
  hotmail: "microsoft",
};

/**
 * Rogue's app id for a provider's service name: "Whatsapp" / "WhatsApp" →
 * "whatsapp"; "Google, Gmail, Youtube" and "Instagram + Threads" keep only
 * their first name. "Google Voice" stays its own app.
 */
export function appId(name: string): string {
  const head = name.split(/\s*(?:,|\+|\/|\(| - )\s*/)[0];
  const n = normal(head || name);
  const aliased = APP_ALIASES[normal(name)] ?? APP_ALIASES[n] ?? n;
  return aliased.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
}
