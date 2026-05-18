export const DEFAULT_AUTH_REDIRECT = "/planner";

export function sanitizeNextPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001f\u007f\\]/.test(value)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  const lowerValue = value.toLowerCase();

  if (
    lowerValue.startsWith("/auth") ||
    lowerValue.includes("%2f") ||
    lowerValue.includes("%5c")
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

export function loginPathFor(nextPath: string) {
  return `/auth/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}

function isLocalHost(host: string) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

export function appOriginFromHeaders(host: string | null, proto: string | null) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const safeHost = host ?? "localhost:3000";

  if (!isLocalHost(safeHost)) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required outside local development");
  }

  const safeProto = proto === "https" || proto === "http" ? proto : "http";

  return `${safeProto}://${safeHost}`;
}
