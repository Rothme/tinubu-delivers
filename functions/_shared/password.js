// functions/_shared/password.js
// Simple SHA-256 hashing helper, used by login/change-password/reset so the
// actual password is never stored in plaintext in KV.

export async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
