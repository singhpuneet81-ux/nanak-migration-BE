/**
 * Smoke-test Website Content / SEO APIs (admin + public).
 * Run: node scripts/test-website-content-api.js
 * Requires backend on localhost:5001 (or API_BASE env).
 */
const API = process.env.API_BASE || "http://localhost:5001/api";

async function req(path, opts = {}) {
  const { headers: extraHeaders, ...rest } = opts;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@nanakmigration.com.au";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  console.log("1) Login…");
  const login = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!login.json?.success || !login.json?.data?.token) {
    console.error("Login failed", login.status, login.json);
    process.exit(1);
  }
  const token = login.json.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  console.log("2) List admin SEO pages…");
  const list = await req("/admin/seo", { headers: auth });
  const pages = list.json?.data?.pages || [];
  console.log("   pages:", pages.length);
  if (pages.length < 30) {
    console.error("Expected many SEO pages seeded");
    process.exit(1);
  }

  const key = "home";
  const stamp = `CMS test ${new Date().toISOString()}`;
  console.log("3) Upsert home content…");
  const upsert = await req(`/admin/seo/${key}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      title: "Australian Migration Agents | Nanak Migration Group",
      metaDescription: "MARA-registered migration agents. MARN 2619467.",
      primaryKeyword: "australian migration agents",
      keywords: "migration agent melbourne, visa australia",
      h1: stamp,
      body: "Editable website content body from admin CMS.",
      heroImage: "https://www.nanakmigration.com.au/og-image.jpg",
      robotsIndex: true,
    }),
  });
  if (!upsert.json?.success) {
    console.error("Upsert failed", upsert);
    process.exit(1);
  }

  console.log("4) Public GET /seo/home…");
  const pub = await req(`/public/seo/${key}`);
  const data = pub.json?.data;
  if (!data || data.h1 !== stamp) {
    console.error("Public SEO did not reflect admin save", data);
    process.exit(1);
  }
  console.log("   OK h1:", data.h1);
  console.log("   OK body:", data.body?.slice(0, 40));
  console.log("PASS website content API");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
