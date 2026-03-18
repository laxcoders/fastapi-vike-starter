/**
 * Cookie helpers that work on both server (Node.js) and client (browser).
 * Pass the raw Cookie header string for server-side reads.
 */

export function getCookie(name: string, cookieStr?: string): string | undefined {
  const source = cookieStr ?? (typeof document !== "undefined" ? document.cookie : "");
  for (const part of source.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey.trim() === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}
