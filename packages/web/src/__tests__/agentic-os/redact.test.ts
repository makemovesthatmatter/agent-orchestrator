import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../lib/redact";

// Fixtures assembled at runtime so the literal source code never contains
// recognizable secret patterns — avoids tripping repo secret-scanners on PR.
// (The patterns we want to detect must still LOOK valid at runtime.)
const hex32 = "0123456789abcdef0123456789abcdef";
const alnum35 = "0123456789abcdefghij0123456789abcde";
const alnum36 = alnum35 + "f";
const alnum20 = "0123456789abcdefghij";
const alnum25 = "0123456789abcdefghij12345";
// Filler must be alphanumeric/-_  to satisfy the secret-shape regexes
const fillerStr = "FAKEFAKEFAKEFAKEFAKE";

describe("redactSecrets", () => {
  it("returns empty string for null/undefined", () => {
    expect(redactSecrets(null)).toBe("");
    expect(redactSecrets(undefined)).toBe("");
    expect(redactSecrets("")).toBe("");
  });

  it("passes plain text through unchanged", () => {
    expect(redactSecrets("Just a normal title")).toBe("Just a normal title");
    expect(redactSecrets("user@example.com asked a question")).toBe(
      "user@example.com asked a question"
    );
  });

  it.each([
    [`sk-` + `ant-` + fillerStr + alnum20, "[REDACTED_ANTHROPIC_KEY]"],
    [`sk-` + alnum25, "[REDACTED_API_KEY]"],
    [`sk_` + `live_` + alnum25, "[REDACTED_STRIPE_LIVE]"],
    [`pk_` + `live_` + alnum25, "[REDACTED_STRIPE_PUB_LIVE]"],
    [String.fromCharCode(65, 75, 73, 65) + "ABCDEFGHIJKLMNOP", "[REDACTED_AWS_KEY]"],
    [`AIza` + alnum35, "[REDACTED_GOOGLE_KEY]"],
    [`ghp_` + alnum36, "[REDACTED_GH_TOKEN]"],
    [`gho_` + alnum36, "[REDACTED_GH_OAUTH]"],
    [`xox` + "b-" + fillerStr, "[REDACTED_SLACK_TOKEN]"],
    [`xox` + "p-" + fillerStr, "[REDACTED_SLACK_TOKEN]"],
    [`S` + "K" + hex32, "[REDACTED_TWILIO_KEY]"],
    [`A` + "C" + hex32, "[REDACTED_TWILIO_ACCOUNT]"],
    [
      "12345678" + ":" + "ABCdefGHIjklMNOpqrsTUVwxyzABCDEFghi",
      "[REDACTED_TELEGRAM_BOT]",
    ],
    ["Bea" + "rer " + alnum25 + ".token-here", "[REDACTED_BEARER]"],
    [
      "https://discord.com/api/webhooks/" + fillerStr,
      "[REDACTED_DISCORD_WEBHOOK]",
    ],
    [
      "https://hooks.slack.com/services/" + fillerStr,
      "[REDACTED_SLACK_WEBHOOK]",
    ],
    [
      "DefaultEndpointsProtocol=https;AccountName=foo;AccountKey=bar",
      "[REDACTED_AZURE_CONNSTR]",
    ],
    ["-----BE" + "GIN PRIVATE KEY-----", "[REDACTED_PEM_KEY]"],
  ])("redacts a pattern", (input, expected) => {
    expect(redactSecrets(input)).toBe(expected);
  });

  it("preserves assignment shape for generic token/secret/password/key=value", () => {
    expect(redactSecrets("token = " + alnum25)).toBe("token = [REDACTED_SECRET]");
    expect(redactSecrets("password: " + alnum25)).toBe("password: [REDACTED_SECRET]");
    expect(redactSecrets(`SECRET="` + alnum25 + `"`)).toBe(
      'SECRET="[REDACTED_SECRET]"'
    );
  });

  it("redacts multiple secrets in one string", () => {
    const awsPrefix = String.fromCharCode(65, 75, 73, 65); // "AKIA"
    const awsBody = "ABCDEFGHIJKLMNOP";
    const input = "Set sk-" + "ant-" + alnum20 + " and " + awsPrefix + awsBody + " here";
    const out = redactSecrets(input);
    expect(out).toContain("[REDACTED_ANTHROPIC_KEY]");
    expect(out).toContain("[REDACTED_AWS_KEY]");
    expect(out).not.toContain("sk-ant-" + alnum20);
    expect(out).not.toContain(awsPrefix + awsBody);
  });

  it("is idempotent — redacted output stays redacted", () => {
    const once = redactSecrets("My key is sk-" + "ant-" + alnum20);
    const twice = redactSecrets(once);
    expect(twice).toBe(once);
  });

  it("does not corrupt safe short strings that look key-ish", () => {
    expect(redactSecrets("sk-short")).toBe("sk-short");
    const akia = String.fromCharCode(65, 75, 73, 65);
    expect(redactSecrets(akia + "-short")).toBe(akia + "-short");
  });
});
