const fs = require("node:fs");
const path = require("node:path");

const output = path.resolve(__dirname, "..", "dist-react");
const files = fs.readdirSync(output).filter((file) => file.endsWith(".html"));
let schemaCount = 0;
const canonicals = new Set();

// When verification tokens are configured for this build, every generated
// page must carry them — a missing meta means Search Console would fail to
// verify ownership on that URL.
const expectedVerification = [
  ["google-site-verification", process.env.GOOGLE_SITE_VERIFICATION?.trim()],
  ["msvalidate.01", process.env.BING_SITE_VERIFICATION?.trim()],
].filter(([, token]) => token);

for (const file of files) {
  const html = fs.readFileSync(path.join(output, file), "utf8");
  const scripts = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const script of scripts) {
    JSON.parse(script[1]);
    schemaCount += 1;
  }
  if (!/<title>[^<]+<\/title>/.test(html)) throw new Error(`Missing title: ${file}`);
  if (!/<meta name="description" content="[^\"]+" \/>/.test(html)) throw new Error(`Missing description: ${file}`);
  if (!/<meta name="robots" content="[^\"]+" \/>/.test(html)) throw new Error(`Missing robots directive: ${file}`);
  const canonical = html.match(/<link rel="canonical" href="(https:\/\/www\.draftix\.tech\/[^\"]*)" \/>/)?.[1];
  if (!canonical) throw new Error(`Missing canonical URL: ${file}`);
  if (canonicals.has(canonical)) throw new Error(`Duplicate canonical URL: ${canonical}`);
  canonicals.add(canonical);
  for (const [name, token] of expectedVerification) {
    if (!html.includes(`name="${name}" content="${token}"`)) {
      throw new Error(`Missing ${name} meta with the configured token: ${file}`);
    }
  }
}

const homepage = fs.readFileSync(path.join(output, "index.html"), "utf8");
for (const entity of ["#organization", "#website", "#application"]) {
  if (!homepage.includes(entity)) throw new Error(`Homepage schema is missing ${entity}`);
}

console.log(
  `PASS SEO HTML: ${files.length} unique canonical pages, ${schemaCount} valid JSON-LD blocks` +
  (expectedVerification.length ? `, ${expectedVerification.length} verification meta(s) on every page` : ""),
);
