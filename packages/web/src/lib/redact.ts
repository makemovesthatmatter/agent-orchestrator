// Regex-based redaction of common secret patterns in user-derived strings.
// Mirror of ~/.claude/skills/dream/lib/paths.py::_SECRET_PATTERNS,
// extended with patterns the security review identified as missing.
//
// Use at every render site for Hermes-derived strings (title, model, source,
// end_reason) — these flow from user-typed chat sessions and may contain
// pasted API keys, credentials, webhook URLs.

type Replacer = string | ((match: string) => string);

const PATTERNS: Array<[RegExp, Replacer]> = [
  // API keys
  [/sk-ant-[a-zA-Z0-9_-]+/g, "[REDACTED_ANTHROPIC_KEY]"],
  [/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_API_KEY]"],
  [/sk_live_[a-zA-Z0-9]{20,}/g, "[REDACTED_STRIPE_LIVE]"],
  [/pk_live_[a-zA-Z0-9]{20,}/g, "[REDACTED_STRIPE_PUB_LIVE]"],
  [/AKIA[A-Z0-9]{16}/g, "[REDACTED_AWS_KEY]"],
  [/AIza[0-9A-Za-z_-]{35}/g, "[REDACTED_GOOGLE_KEY]"],

  // Provider tokens
  [/ghp_[a-zA-Z0-9]{36}/g, "[REDACTED_GH_TOKEN]"],
  [/gho_[a-zA-Z0-9]{36}/g, "[REDACTED_GH_OAUTH]"],
  [/xox[bpasr]-[a-zA-Z0-9-]+/g, "[REDACTED_SLACK_TOKEN]"],
  [/SK[a-f0-9]{32}/g, "[REDACTED_TWILIO_KEY]"],
  [/AC[a-f0-9]{32}/g, "[REDACTED_TWILIO_ACCOUNT]"],
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g, "[REDACTED_TELEGRAM_BOT]"],

  // Bearer / auth headers
  [/Bearer [a-zA-Z0-9._-]{20,}/g, "[REDACTED_BEARER]"],

  // Webhook URLs
  [/https:\/\/discord\.com\/api\/webhooks\/[^\s]+/g, "[REDACTED_DISCORD_WEBHOOK]"],
  [/https:\/\/hooks\.slack\.com\/services\/[^\s]+/g, "[REDACTED_SLACK_WEBHOOK]"],

  // Azure connection strings
  [/DefaultEndpointsProtocol=[^;]+(?:;[^;]+)*/g, "[REDACTED_AZURE_CONNSTR]"],

  // PEM blocks
  [/-----BEGIN[A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PEM_KEY]"],

  // Generic assignment patterns — token/secret/password/key = <value>
  [
    /(?:token|secret|password|key)\s*[=:]\s*["']?([a-zA-Z0-9+/._-]{20,})["']?/gi,
    (match: string) => {
      // Preserve the assignment shape (e.g. `token = ...`), redact only the value
      return match.replace(/([=:]\s*["']?)([a-zA-Z0-9+/._-]{20,})/, "$1[REDACTED_SECRET]");
    },
  ],
];

/**
 * Redact common secret patterns from a user-derived string.
 * Returns the input unchanged if it's null/undefined/empty.
 * Idempotent — safe to call multiple times.
 */
export function redactSecrets(text: string | null | undefined): string {
  if (!text) return text ?? "";
  let out = text;
  for (const [pattern, replacement] of PATTERNS) {
    if (typeof replacement === "function") {
      out = out.replace(pattern, replacement);
    } else {
      out = out.replace(pattern, replacement);
    }
  }
  return out;
}
