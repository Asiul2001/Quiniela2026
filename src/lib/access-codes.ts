const ACCESS_CODE_PATTERN = /^[A-Z0-9]{4}$/;

export function normalizeLoginName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return normalized || "player";
}

export function buildLoginEmail(name: string) {
  return `${normalizeLoginName(name)}@familia-strassburger.example.com`;
}

export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

export function isValidAccessCode(code: string) {
  return ACCESS_CODE_PATTERN.test(normalizeAccessCode(code));
}

export function buildSupabasePasswordFromAccessCode(code: string) {
  return `FAMILIA-${normalizeAccessCode(code)}`;
}

export function generateAccessCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}
