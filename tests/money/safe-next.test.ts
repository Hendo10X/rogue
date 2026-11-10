// Run with `npm run test:money`. After logging in from the Telegram bot, ?next= only ever goes to a page on this site.
import { safeNext, withNext } from "@/lib/safe-next";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

console.log("\n1. Only pages on this site");
check("keeps a site page", safeNext("/connect/telegram?code=ABCDEFGH") === "/connect/telegram?code=ABCDEFGH");
check("refuses another website", safeNext("https://evil.example") === null);
check("refuses //host tricks", safeNext("//evil.example") === null && safeNext("/\\evil.example") === null);
check("refuses empty", safeNext("") === null && safeNext(null) === null);
check("withNext adds an encoded next", withNext("/login", "/connect/telegram?code=AB") === "/login?next=%2Fconnect%2Ftelegram%3Fcode%3DAB");
check("withNext without next is the plain page", withNext("/signup", "https://evil.example") === "/signup");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
