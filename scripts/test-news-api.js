/**
 * Smoke-test immigration news admin + public APIs.
 * Usage (from nanak-migration-backend):
 *   node scripts/test-news-api.js
 * Env: API_BASE (default http://localhost:5001/api), SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
const API_BASE = process.env.API_BASE || "http://localhost:5001/api";
const email = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  if (!email || !password) {
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
    process.exit(1);
  }

  const login = await req("/auth/login", { method: "POST", body: { email, password } });
  if (!login.json?.data?.token) {
    console.error("Login failed", login.status, login.json);
    process.exit(1);
  }
  const token = login.json.data.token;
  const slug = `verify-news-${Date.now()}`;

  const created = await req("/admin/news", {
    method: "POST",
    token,
    body: {
      title: "VERIFY NEWS TITLE",
      slug,
      standfirst: "Verify standfirst",
      body: "<p>Verify body</p>",
      category: "Policy changes",
      status: "published",
      featured: true,
      readTime: "2 min read",
    },
  });
  if (created.status !== 201 || !created.json?.data?.id) {
    console.error("Create failed", created.status, created.json);
    process.exit(1);
  }
  const id = created.json.data.id;

  const pubList = await req("/public/news");
  const found = (pubList.json?.data?.news || []).find((n) => n.slug === slug);
  if (!found) {
    console.error("Public list missing article", pubList.status, pubList.json);
    process.exit(1);
  }

  const pubOne = await req(`/public/news/${slug}`);
  if (pubOne.json?.data?.title !== "VERIFY NEWS TITLE") {
    console.error("Public slug mismatch", pubOne.status, pubOne.json);
    process.exit(1);
  }

  await req(`/admin/news/${id}`, { method: "DELETE", token });
  console.log("PASS news API smoke test");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
