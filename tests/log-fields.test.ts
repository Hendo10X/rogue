// Delivered-log labelling. `npm run test:logs`. Pure functions, no DB.
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeShape, labelLog, logToText, parseFormatHint } from "../lib/log-fields";

const labels = (line: string, fmt?: Parameters<typeof labelLog>[1]) => labelLog(line, fmt)?.map((f) => f.label);

test("the owner's example: password that looks like an email", () => {
  const line = "user2958434479543|1@Tainguyenmmo.net|lefortblanchuk@hotmail.com|Tikmail@123|lefortblanchukdm1@fviainboxes.com";
  assert.deepEqual(labels(line), ["Username", "Password", "Email", "Email password", "Recovery email"]);
  assert.equal(
    logToText(labelLog(line)!),
    [
      "Username: user2958434479543",
      "Password: 1@Tainguyenmmo.net",
      "Email: lefortblanchuk@hotmail.com",
      "Email password: Tikmail@123",
      "Recovery email: lefortblanchukdm1@fviainboxes.com",
    ].join("\n"),
  );
});

test("user:pass:2fa:cookie on colons", () => {
  const line = "example123:example34@666:JBSWY3DPEHPK3PXPJBSWY3DP:c_user=1000; xs=abc%3Adef; datr=xyz";
  assert.deepEqual(labels(line), ["Username", "Password", "2FA", "Cookie"]);
});

test("email login then password", () => {
  assert.deepEqual(labels("john@gmail.com|Secret123"), ["Email", "Password"]);
});

test("user|email|password order", () => {
  assert.deepEqual(labels("johnny|john@gmail.com|Secret123"), ["Username", "Email", "Password"]);
});

test("Facebook UID with token and link", () => {
  const line = `100089123456789|Pass@1|EAAB${"x".repeat(40)}|https://facebook.com/profile.php?id=100089123456789`;
  assert.deepEqual(labels(line), ["UID", "Password", "Token", "Link"]);
});

test("already-labelled and plain lines are left alone", () => {
  assert.equal(labelLog("Username: test"), null);
  assert.equal(labelLog("just a note from admin"), null);
  assert.equal(labelLog(""), null);
});

test("URLs don't get split on their colon", () => {
  const fields = labelLog("bob:pw1:https://x.com/bob")!;
  assert.deepEqual(fields.map((f) => f.value), ["bob", "pw1", "https://x.com/bob"]);
});

test("a listing format wins over guessing", () => {
  const fmt = parseFormatHint("Fresh accounts.\nFormat: login|pass|mail|passmail|2fa|cookie\nUse proxy.");
  assert.deepEqual(fmt, {
    delimiter: "|",
    labels: ["Username", "Password", "Email", "Email password", "2FA", "Cookie"],
  });
  assert.deepEqual(labels("a|b|c@d.com|e|JBSWY3DPEHPK3PXP|f=1; g=2", fmt), [
    "Username", "Password", "Email", "Email password", "2FA", "Cookie",
  ]);
});

test("format hints: unknown tokens keep their own name; prose is ignored", () => {
  assert.deepEqual(parseFormatHint("Format: UID | PASS | 2FA | Fullname")?.labels, ["UID", "Password", "2FA", "Fullname"]);
  assert.equal(parseFormatHint("Great accounts: aged, verified | instant delivery"), null);
  assert.equal(parseFormatHint(null), null);
});

test("repeated labels get numbered", () => {
  assert.deepEqual(labels("u|p|a@b.com|ep|c@d.com|x|y"), [
    "Username", "Password", "Email", "Email password", "Recovery email", "Extra", "Extra 2",
  ]);
});

test("shape description never contains the secret", () => {
  const shape = describeShape("user2958434479543|Tikmail@123|lefort@hotmail.com")!;
  const joined = shape.join(" ");
  assert.ok(!joined.includes("Tikmail") && !joined.includes("user2958434479543") && !joined.includes("lefort"));
  assert.match(shape[2], /email-like @hotmail\.com/);
});
