// Simulating what normalizeSecret does
function normalizeSecret(raw) {
  if (!raw) return undefined;
  let value = raw.trim();
  if (!value) return undefined;
  const wrappedInDoubleQuote = value.startsWith('"') && value.endsWith('"');
  const wrappedInSingleQuote = value.startsWith("'") && value.endsWith("'");
  if (wrappedInDoubleQuote || wrappedInSingleQuote) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

// Test with the env value from .env.local
const testValue = "sk-or-v1-349...65d";
console.log("Input:", testValue);
console.log("Input length:", testValue.length);
const normalized = normalizeSecret(testValue);
console.log("Normalized:", normalized);
console.log("Normalized length:", normalized?.length);

// Check if this is treated as valid
if (normalized) {
  console.log("\n✓ Would be treated as configured");
  console.log("Would make Authorization header: Bearer " + normalized);
} else {
  console.log("\n✗ Would be treated as UNCONFIGURED (returns 503)");
}

// This is the actual issue
console.log("\n⚠️ FINDING: API key format is truncated/incomplete");
console.log("Expected: sk-or-v1-* (40+ characters)");
console.log("Actual length: " + testValue.length + " characters");
console.log("\nThis will fail with 401 (auth error) when calling OpenRouter");
