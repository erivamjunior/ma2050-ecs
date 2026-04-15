function normalizeSslMode(rawValue) {
  const value = String(rawValue || "").trim().toLowerCase();

  if (!value || ["0", "false", "no", "disable"].includes(value)) {
    return "disable";
  }

  if (["no-verify", "no_verify", "noverify"].includes(value)) {
    return "no-verify";
  }

  if (["verify-full", "verify_ca", "verify-ca"].includes(value)) {
    return "verify-full";
  }

  return "require";
}

export function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const host = String(env.DB_HOST || "").trim();
  const port = String(env.DB_PORT || "5432").trim();
  const database = String(env.DB_NAME || "").trim();
  const user = String(env.DB_USER || "").trim();
  const password = String(env.DB_PASSWORD || "");

  if (!host || !database || !user || !password) {
    return null;
  }

  const sslMode = normalizeSslMode(env.DB_SSL);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslMode}`;
}
