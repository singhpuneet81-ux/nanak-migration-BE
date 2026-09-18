/**
 * Ask the public Next.js site to purge cached FAQ (and other tagged) data.
 * Requires REVALIDATE_SECRET and PUBLIC_SITE_URL on the API server.
 */
async function triggerSiteRevalidate(tags = ["faqs"], paths = []) {
  const secret = process.env.REVALIDATE_SECRET;
  const base = (process.env.PUBLIC_SITE_URL || "https://www.nanakmigration.com.au").replace(/\/$/, "");
  if (!secret) {
    console.warn("[revalidate] REVALIDATE_SECRET not set — skipping site purge");
    return { ok: false, reason: "no-secret" };
  }

  const uniqueTags = [...new Set(tags.filter(Boolean))];
  const uniquePaths = [...new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))];
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags: uniqueTags, paths: uniquePaths }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[revalidate] site responded", res.status, json);
      return { ok: false, status: res.status, json };
    }
    return { ok: true, json };
  } catch (err) {
    console.warn("[revalidate] request failed:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { triggerSiteRevalidate };
