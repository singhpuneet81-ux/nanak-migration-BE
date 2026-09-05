const fs = require("fs");
const path = require("path");

const pageMetaPath = path.join(__dirname, "../../migration/src/data/pageMeta.ts");
const outPath = path.join(__dirname, "../src/defaults/pageSeo.js");

const t = fs.readFileSync(pageMetaPath, "utf8");
const out = {};
const re = /^\s+(?:["']([^"']+)["']|([A-Za-z0-9_-]+)):\s*\{([\s\S]*?)^\s+\},?/gm;
let m;
while ((m = re.exec(t))) {
  const key = m[1] || m[2];
  const body = m[3];
  const get = (f) => {
    const r = body.match(new RegExp(f + ":\\s*[\"']([\\s\\S]*?)[\"']"));
    return r ? r[1].replace(/\\n/g, " ").replace(/\s+/g, " ").trim() : "";
  };
  out[key] = {
    title: get("title"),
    metaDescription: get("metaDescription"),
    primaryKeyword: get("primaryKeyword"),
    keywords: "",
    h1: "",
    body: "",
    heroImage: "",
  };
}

const lines = [
  "/** Auto-synced from migration/src/data/pageMeta.ts — editable via admin Website Content. */",
  "module.exports = {",
];
for (const [k, v] of Object.entries(out)) {
  lines.push(`  ${JSON.stringify(k)}: {`);
  lines.push(`    title: ${JSON.stringify(v.title)},`);
  lines.push(`    metaDescription: ${JSON.stringify(v.metaDescription)},`);
  lines.push(`    primaryKeyword: ${JSON.stringify(v.primaryKeyword)},`);
  lines.push(`    keywords: "",`);
  lines.push(`    h1: "",`);
  lines.push(`    body: "",`);
  lines.push(`    heroImage: "",`);
  lines.push("  },");
}
lines.push("};");
lines.push("");
fs.writeFileSync(outPath, lines.join("\n"));
console.log("wrote", Object.keys(out).length, "keys ->", outPath);
