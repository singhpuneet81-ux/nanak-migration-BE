async function verifyTurnstileToken(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Soft-gate: if secret is not configured, allow submissions (dev / pre-keys).
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== "string") {
    const err = new Error("Captcha verification required");
    err.status = 400;
    throw err;
  }
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteip) body.set("remoteip", remoteip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const err = new Error("Captcha verification failed");
    err.status = 400;
    throw err;
  }
  return { ok: true };
}

module.exports = { verifyTurnstileToken };
