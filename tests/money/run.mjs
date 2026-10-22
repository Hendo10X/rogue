// Runs the money-path tests (referrals, manual log delivery, pricing) against
// an in-process Postgres. `npm run test:money`. Needs no database or env vars.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith(".test.ts")).sort();
let failed = 0;

for (const file of files) {
  console.log(`\n=== ${file}`);
  const res = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", join(here, file)], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, TSX_TSCONFIG_PATH: join(here, "tsconfig.json") },
  });
  if (res.status !== 0) failed++;
}

console.log(failed ? `\n${failed} test file(s) failed` : "\nAll money tests passed");
process.exit(failed ? 1 : 0);
