import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tournamentSeo } from "../src/lib/tournaments.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist-react");
const template = await readFile(path.join(output, "index.html"), "utf8");
const origin = "https://www.draftix.tech";
const image = `${origin}/images/og-1200x630.jpg`;

// Search-console ownership tokens, injected as meta tags on every page.
// Google's value is base64/hex; Bing's can contain arbitrary characters,
// so both pass through escapeHtml and a conservative charset allowlist.
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim() || "";
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim() || "";
if (googleVerification && !/^[\w:.\-=+/]+$/.test(googleVerification)) {
  throw new Error("GOOGLE_SITE_VERIFICATION contains unexpected characters; refusing to inject it.");
}
if (bingVerification && !/^[\w:.\-=+/]+$/.test(bingVerification)) {
  throw new Error("BING_SITE_VERIFICATION contains unexpected characters; refusing to inject it.");
}
const verificationBlock = [
  googleVerification && `<meta name="google-site-verification" content="${escapeHtml(googleVerification)}" />`,
  bingVerification && `<meta name="msvalidate.01" content="${escapeHtml(bingVerification)}" />`,
].filter(Boolean).join("\n  ");
const VERIFICATION_RE = /<!-- VERIFICATION:START[\s\S]*?VERIFICATION:END -->/;
if (!VERIFICATION_RE.test(template)) {
  throw new Error("index.html is missing the VERIFICATION:START/END marker.");
}
if (verificationBlock) {
  console.log(`Injecting search-engine verification metas${googleVerification && bingVerification ? " (Google + Bing)" : googleVerification ? " (Google)" : " (Bing)"}.`);
}

const pages = [
  {
    path: "/",
    title: "Valorant Map Veto & Agent Draft Tool | Draftix",
    description: "Draftix is a free Valorant map veto and agent draft tool trusted by 500+ players daily. Run live map bans, side picks, and agent bans in one room.",
    socialDescription: "Free Valorant drafting and map vetoes for teams, scrims, and tournaments.",
    h1: "Draftix — Draft together. Play prepared.",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: "Draftix",
          url: `${origin}/`,
          logo: `${origin}/images/draftix.webp`,
          email: "draftixtech@gmail.com",
          description: "Draftix is a free Valorant drafting and map veto platform for teams, scrims, and tournaments.",
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          name: "Draftix",
          alternateName: "Draftix Valorant Draft Tool",
          url: `${origin}/`,
          publisher: { "@id": `${origin}/#organization` },
          inLanguage: "en",
        },
        {
          "@type": "WebApplication",
          "@id": `${origin}/#application`,
          name: "Draftix",
          alternateName: "Draftix Valorant Draft Tool",
          url: `${origin}/`,
          description: "A free real-time Valorant drafting and map veto platform for teams, scrims, and tournaments.",
          applicationCategory: "GameApplication",
          applicationSubCategory: "Esports drafting tool",
          operatingSystem: "Any",
          browserRequirements: "Requires a modern web browser with JavaScript enabled",
          isAccessibleForFree: true,
          provider: { "@id": `${origin}/#organization` },
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          featureList: [
            "Real-time Valorant map vetoes",
            "Starting-side selection",
            "Agent ban drafting",
            "Shareable match result posters",
            "Rank-based team balancing",
          ],
        },
      ],
    },
  },
  {
    path: "/team-balance",
    title: "Valorant Team Balancer by Rank | Draftix",
    description: "Split your Valorant lobby into fair teams using player ranks or a random draw. Compare team ratings and copy the result for Discord.",
    socialDescription: "Build balanced Valorant teams by rank or random draw in seconds.",
  },
  {
    path: "/tournaments",
    title: "Free Tournament Bracket Maker | Draftix",
    description: tournamentSeo.description,
    h1: tournamentSeo.heading,
    socialDescription: "Build and share a live bracket for teams, individuals, clubs, sports, esports, and community events.",
    keywords: "free tournament bracket maker, online bracket generator, elimination bracket, round robin tournament, swiss tournament, shareable tournament bracket",
    imageAlt: "Draftix online tournament bracket maker",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Draftix Tournament Bracket Maker",
      description: tournamentSeo.description,
      featureList: ["Single elimination brackets", "Double elimination brackets", "Round robin schedules", "Swiss tournaments", "Live scores", "Public bracket links", "3 to 16 teams or players"],
      url: `${origin}/tournaments`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  },
  {
    path: "/tournament-bracket-maker",
    title: "How to Make a Tournament Bracket (Free) | Draftix",
    description: "Learn how to make a tournament bracket in minutes. Free bracket generator: single elim, double elim, round robin, and Swiss — share one public link.",
    socialDescription: "Build a tournament bracket for 3 to 16 teams and share one live public link.",
    h1: "Free tournament bracket maker.",
    keywords: "tournament bracket maker, how to make a bracket, bracket generator, free tournament bracket, tournament bracket generator, esports bracket, single elimination bracket",
    imageAlt: "Draftix tournament bracket maker with a single elimination bracket",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "How to Make a Tournament Bracket", url: `${origin}/tournament-bracket-maker`, description: "Step-by-step guide to building a free tournament bracket with live public sharing." },
        {
          "@type": "FAQPage", mainEntity: [
            { "@type": "Question", name: "Is the bracket maker free?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can create and share brackets without an account." } },
            { "@type": "Question", name: "How many teams can a bracket hold?", acceptedAnswer: { "@type": "Answer", text: "Brackets support 3 to 16 teams or players, with automatic byes for uneven fields." } },
            { "@type": "Question", name: "Can viewers follow the bracket live?", acceptedAnswer: { "@type": "Answer", text: "Yes. The public link shows every recorded result as it happens." } },
          ]
        },
      ],
    },
  },
  {
    path: "/valorant-map-veto",
    title: "Free Valorant Map Veto Tool | Draftix",
    description: "Run a live Valorant map veto with both captains. Ban maps, select the final map, choose starting sides, and share the result. Free, no signup.",
    socialDescription: "Run a synchronized Valorant map veto with both team captains.",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Valorant Map Veto Tool", url: `${origin}/valorant-map-veto`, description: "A free shared tool for running Valorant map bans and starting-side selection." },
        { "@type": "SoftwareApplication", name: "Draftix Valorant Map Veto Tool", applicationCategory: "GameApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
        {
          "@type": "FAQPage", mainEntity: [
            { "@type": "Question", name: "Do players need an account?", acceptedAnswer: { "@type": "Answer", text: "No. Everyone joins with the same room code." } },
            { "@type": "Question", name: "Does the veto update live?", acceptedAnswer: { "@type": "Answer", text: "Yes. Connected players see each confirmed choice immediately." } },
            { "@type": "Question", name: "Can Draftix run tournament map bans?", acceptedAnswer: { "@type": "Answer", text: "Yes. Hosts can set the format, invite both captains, and record the final map and starting side." } },
          ]
        },
      ],
    },
  },
  {
    path: "/valorant-agent-ban",
    title: "Free Valorant Agent Ban Tool | Draftix",
    description: "Run a synchronized Valorant agent ban with configurable ban counts and captain-controlled turns. Create a free room and share the final matchup.",
    socialDescription: "Ban Valorant agents together in a live captain-controlled draft.",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Valorant Agent Ban Tool", url: `${origin}/valorant-agent-ban`, description: "A free real-time tool for organized Valorant agent bans." },
        { "@type": "SoftwareApplication", name: "Draftix Valorant Agent Ban Tool", applicationCategory: "GameApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
        {
          "@type": "FAQPage", mainEntity: [
            { "@type": "Question", name: "Can the host choose the ban count?", acceptedAnswer: { "@type": "Answer", text: "Yes. The limit is configured before the draft starts." } },
            { "@type": "Question", name: "Can both teams follow the bans?", acceptedAnswer: { "@type": "Answer", text: "Yes. The room stays synchronized for every connected player." } },
          ]
        },
      ],
    },
  },
  {
    path: "/valorant-draft-tool",
    title: "Free Valorant Draft Tool for Teams | Draftix",
    description: "Use one real-time Valorant draft tool for map vetoes, side picks, agent bans, team captains, and match-ready results. Free with no signup.",
    socialDescription: "Prepare a Valorant match with map vetoes, side picks, and agent bans in one room.",
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Valorant Draft Tool", url: `${origin}/valorant-draft-tool`, description: "A complete real-time drafting tool for Valorant teams and custom matches." },
        { "@type": "SoftwareApplication", name: "Draftix Valorant Draft Tool", applicationCategory: "GameApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
        {
          "@type": "FAQPage", mainEntity: [
            { "@type": "Question", name: "What does Draftix include?", acceptedAnswer: { "@type": "Answer", text: "Map vetoes, side selection, agent bans, and a final match result." } },
            { "@type": "Question", name: "Is Draftix free?", acceptedAnswer: { "@type": "Answer", text: "Yes. You can create a room without an account." } },
          ]
        },
      ],
    },
  },
  {
    path: "/status",
    title: "Draftix System Status",
    description: "Check the current availability of Draftix rooms, real-time draft synchronization, and Valorant game data.",
    socialDescription: "Current availability of Draftix drafting services.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Draftix",
    description: "Read how Draftix handles room nicknames, chat messages, connection metadata, session codes, and service data.",
    socialDescription: "How Draftix handles data used to operate real-time draft rooms.",
  },
  {
    path: "/terms",
    title: "Terms of Service | Draftix",
    description: "Read the terms governing use of the free Draftix Valorant map veto and agent drafting platform.",
    socialDescription: "Terms for using the Draftix Valorant drafting platform.",
  },
  {
    path: "/feedback",
    title: "Send Feedback | Draftix",
    description: "Tell the Draftix team what you think about the Valorant map veto and agent draft tool. Rate your experience and leave a short note — no account needed.",
    socialDescription: "Rate Draftix and share your feedback with the team.",
  },
  {
    path: "/contact",
    title: "Contact Support | Draftix",
    description: "Send a message to Draftix support using the on-site contact form, or share a rating and product suggestion through the feedback page.",
    socialDescription: "Contact the Draftix team through the on-site form or share product feedback.",
  },
  {
    path: "/draft",
    title: "Draft Room | Draftix",
    description: "Create or join a private Draftix room for your Valorant map veto and agent draft.",
    socialDescription: "Create or join a private Draftix room.",
    robots: "noindex,nofollow,noarchive",
  },
  {
    path: "/t",
    title: "Live Tournament Bracket | Draftix",
    description: "View a live tournament bracket hosted on Draftix.",
    socialDescription: "Follow a live shareable tournament bracket on Draftix.",
    robots: "noindex,follow,noarchive",
  },
  {
    // SPA admin console. Pre-rendered shell so /r works on Vercel without
    // a catch-all rewrite; stays out of search results.
    path: "/r",
    title: "Draftix Admin",
    description: "Draftix admin console.",
    socialDescription: "Draftix admin console.",
    robots: "noindex,nofollow",
  },
  {
    // Served for any unmatched URL. Vercel picks up dist-react/404.html
    // automatically; the Express server sends it with a real 404 status.
    path: "/404",
    title: "Page Not Found | Draftix",
    description: "The page you were looking for doesn't exist. Head back to Draftix for the Valorant map veto, agent ban, and team balance tools.",
    socialDescription: "Page not found on Draftix.",
    robots: "noindex,follow",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Freshness date injected into every page's WebPage schema (the "2 days ago"
// line in Google results). Updated on each SEO regeneration.
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const NAME_BY_PATH = {
  "/": "Home",
  "/team-balance": "Team Balancer",
  "/tournaments": "Tournament Brackets",
  "/valorant-map-veto": "Map Veto",
  "/valorant-agent-ban": "Agent Bans",
  "/valorant-draft-tool": "Draft Tool",
  "/status": "System Status",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/feedback": "Feedback",
  "/contact": "Contact Support",
};

// BreadcrumbList + WebPage nodes appended to every indexable page. The
// breadcrumb drives the "playvalorant.com › en-us" style URL line and the
// WebPage dateModified drives the freshness date in the snippet.
function defaultGraphNodes(page, url) {
  const nodes = [];
  if (page.path !== "/" && !page.robots) {
    nodes.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: NAME_BY_PATH[page.path] || page.title, item: url },
      ],
    });
  }
  if (!page.robots) {
    nodes.push({
      "@type": "WebPage",
      name: page.title,
      url,
      inLanguage: "en",
      dateModified: BUILD_DATE,
      isPartOf: { "@id": `${origin}/#website` },
    });
  }
  return nodes;
}

// Merge the default nodes into a page's schema. Pages without schema get a
// new @graph; @graph schemas get the nodes appended; single-object schemas
// are promoted to a @graph first.
function schemaFor(page, url) {
  const nodes = defaultGraphNodes(page, url);
  if (!page.schema) {
    if (nodes.length === 0) return null;
    return { "@context": "https://schema.org", "@graph": nodes };
  }
  const clone = JSON.parse(JSON.stringify(page.schema));
  if (Array.isArray(clone["@graph"])) {
    // Enrich an existing WebPage node with the freshness date instead of
    // appending a duplicate.
    const existing = clone["@graph"].find((n) => n["@type"] === "WebPage");
    const webpage = nodes.find((n) => n["@type"] === "WebPage");
    if (existing && webpage) {
      Object.assign(existing, { dateModified: webpage.dateModified, inLanguage: existing.inLanguage || webpage.inLanguage });
      return { ...clone, "@graph": [...clone["@graph"], ...nodes.filter((n) => n["@type"] !== "WebPage")] };
    }
    return { ...clone, "@graph": [...clone["@graph"], ...nodes] };
  }
  return { "@context": "https://schema.org", "@graph": [clone, ...nodes] };
}

function seoBlock(page) {
  const url = `${origin}${page.path === "/" ? "/" : page.path}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const socialDescription = escapeHtml(page.socialDescription);
  const keywords = escapeHtml(page.keywords || "draftix, valorant draft, valorant map veto, valorant agent ban, map ban tool, valorant team balancer, tournament bracket maker");
  const imageAlt = escapeHtml(page.imageAlt || "Draftix - real-time Valorant map veto and agent draft tool");
  const robots = page.robots || "index,follow,max-image-preview:large";
  const mergedSchema = schemaFor(page, url);
  const schema = mergedSchema
    ? `\n    <script type="application/ld+json">${JSON.stringify(mergedSchema).replaceAll("<", "\\u003c")}</script>`
    : "";
  return `<!-- SEO:START -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="${robots}" />
    <meta name="author" content="Draftix" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Draftix" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${socialDescription}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${socialDescription}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />${schema}
    <!-- SEO:END -->`;
}

// Crawlers that skip JS see an empty <div id="root">, so ship a visually
// hidden H1 in the static shell. React replaces the container's children on
// mount, so the live page never shows two headings, and the inline sr-only
// styles avoid any flash of text before hydration.
function staticH1(page) {
  const text = escapeHtml(page.h1 || page.title.replace(/ \| Draftix$/, ""));
  if (page.path === "/tournaments") {
    const help = tournamentSeo.questions.map(({ title, answer }) => `<details><summary>${escapeHtml(title)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
    return `<div id="root"><main style="max-width:960px;margin:48px auto;padding:24px"><a href="/">Draftix</a><h1>${text}</h1><p>${escapeHtml(tournamentSeo.intro)}</p><noscript><p>Enable JavaScript to create and manage a bracket.</p></noscript><section aria-label="Bracket maker help">${help}</section></main></div>`;
  }
  return `<div id="root"><h1 style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;">${text}</h1></div>`;
}

for (const page of pages) {
  // The 25-160 rule only matters for pages Bing will actually index; noindex
  // utility pages (/r, /404) keep their short functional descriptions.
  if (!page.robots && (page.description.length < 25 || page.description.length > 160)) {
    console.warn(`Warning: description for ${page.path} is ${page.description.length} chars (Bing accepts 25-160).`);
  }
  const html = template
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, seoBlock(page))
    .replace(VERIFICATION_RE, verificationBlock || "<!-- no search-engine verification tokens configured -->")
    .replace("<div id=\"root\"></div>", staticH1(page));
  if (page.path === "/") {
    await writeFile(path.join(output, "index.html"), html);
    continue;
  }
  await writeFile(path.join(output, `${page.path.slice(1)}.html`), html);
}

console.log(`Generated SEO HTML for ${pages.length} routes.`);
