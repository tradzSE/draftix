import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

const privacy = [
  ["What we collect", <ul><li><strong>Anonymous session IDs.</strong> When you open DRAFTIX, a random identifier is created so draft rooms and tournaments can recognize you. It is not tied to an email, password, or profile.</li><li><strong>Draft session data.</strong> Nicknames, team names, chat messages, picks and bans, and optional team logos are stored in a database for the life of the session so every participant sees the same board.</li><li><strong>Anonymous draft statistics.</strong> When a draft is completed, aggregate counts such as selected maps, banned maps, banned agents, and game patch are retained. These statistics contain no room code, nickname, chat message, team name, or player identifier.</li><li><strong>Visit counts.</strong> A first-party cookie (<code>dx_v</code>) holds a random ID and records the page you view and the site that linked you here. No IP address, device fingerprint, or advertising identifier is recorded.</li><li><strong>Feedback.</strong> If you submit feedback, your star rating, message, and the page you were on are stored.</li><li><strong>Client errors.</strong> If the app crashes in your browser, the error message, technical trace, page, and browser version are recorded so the failure can be diagnosed and fixed.</li><li><strong>Browser storage.</strong> Preferences such as your nickname, your “My tournaments” list, and a cached agent catalog are kept in your browser and stay on your device.</li></ul>],
  ["What we do not collect", <ul><li>No accounts, passwords, or email addresses.</li><li>No advertising networks, cross-site trackers, or data brokers.</li><li>No IP addresses in analytics — the random cookie ID is the only visitor identifier.</li><li>No sale or sharing of data; there is nothing to sell.</li></ul>],
  ["How long data lives", <ul><li><strong>Draft sessions</strong> are deleted when the room is closed or automatically two hours after the last activity, together with their players, chat, and logos.</li><li><strong>Abuse-prevention records</strong>, keyed by your anonymous ID or IP address, are deleted within one to two days.</li><li><strong>Client error reports</strong> (message, trace, page, browser) are deleted after 30 days.</li><li><strong>Tournaments</strong> are kept in the database so organizers and spectators can return to the bracket.</li><li><strong>Pageview rows</strong> (path, referring site, random ID) are retained for product statistics.</li></ul>],
  ["Organizer tokens", <p>Creating a tournament issues a one-time organizer token. The token itself is stored only in the organizer’s browser; the server keeps just an irreversible SHA-256 hash. Anyone holding the token or the manage link can control that tournament, so treat it like a password.</p>],
  ["Third-party services", <ul><li><strong>valorant-api.com</strong> supplies Valorant map names and splash images. Your browser requests this data directly, so the provider sees your IP address as with any web request.</li><li><strong>Supabase</strong> hosts the database and realtime connections that run drafts.</li><li><strong>Ko-fi</strong> processes voluntary donations when users follow that external link.</li><li>Fonts and agent artwork are served from our own domain; no font CDN is used.</li></ul>],
  ["Children", <p>DRAFTIX has no age gate and does not knowingly collect personal information from children. Use of the service remains subject to local law.</p>],
  ["Your choices", <ul><li>Block or delete the <code>dx_v</code> cookie at any time — the site keeps working, only visit counting stops.</li><li>Clear “My tournaments” or your browser storage to remove saved organizer tokens and preferences from your device.</li></ul>],
  ["Contact", <p>Questions or concerns can be sent to <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support%40draftix.tech&su=Draftix%20privacy%20question" target="_blank" rel="noreferrer">support@draftix.tech</a>.</p>],
];

const terms = [
  ["1. The service", <p>DRAFTIX is a free browser-based tool for real-time Valorant map and agent drafts. It is provided as-is without an uptime guarantee or warranty.</p>],
  ["2. Acceptable use", <><p>You agree not to:</p><ul><li>Harass, threaten, or spam other players.</li><li>Post hateful, illegal, or sexually explicit content.</li><li>Overload, scrape, deface, or otherwise abuse the service.</li><li>Resell or repackage DRAFTIX as your own product.</li></ul></>],
  ["3. User content", <p>Nicknames, team names, chat messages, and team logos are stored only for the life of a draft session and are deleted when it closes or expires. Tournament brackets and match results are kept so links keep working. You retain any rights you hold in that content.</p>],
  ["4. Riot Games and Valorant", <p>DRAFTIX is an independent fan-made tool. It is not affiliated with, endorsed by, or sponsored by Riot Games. Valorant names, artwork, and related marks belong to Riot Games.</p>],
  ["5. Donations", <p>Ko-fi donations are voluntary and non-refundable. They do not purchase features, privileges, or service guarantees.</p>],
  ["6. Disclaimer", <p>DRAFTIX is provided “as is” and “as available.” To the maximum extent permitted by law, its maintainers disclaim implied and statutory warranties.</p>],
  ["7. Limitation of liability", <p>To the maximum extent permitted by law, DRAFTIX and its maintainers are not liable for indirect, incidental, consequential, or punitive damages or loss of session data.</p>],
  ["8. Changes", <p>These terms may be updated. Continued use after an update constitutes acceptance of the revised terms.</p>],
  ["9. Contact", <p>Questions can be sent to <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support%40draftix.tech&su=Draftix%20terms%20question" target="_blank" rel="noreferrer">support@draftix.tech</a>.</p>],
];

const slug = (title) => title.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const cleanTitle = (title) => title.replace(/^\d+\.\s*/, "");

export default function LegalPage({ type }) {
  const isPrivacy = type === "privacy";
  const sections = isPrivacy ? privacy : terms;

  return <main className="sp-page legal-sp-page">
    <SiteHeader />
    <div className="legal-shell">
      <header className="legal-hero">
        <span>Draftix legal</span>
        <h1>{isPrivacy ? "Privacy policy" : "Terms of service"}</h1>
        <p className="legal-updated">Effective September 4, 2026</p>
        <p className="legal-lead">{isPrivacy ? "DRAFTIX is a free, no-signup draft tool. This policy explains the limited data used to operate it." : "By using DRAFTIX, you agree to these plain-language service terms."}</p>
      </header>

      <div className="legal-layout">
        <aside className="legal-toc">
          <span>On this page</span>
          <nav aria-label={`${isPrivacy ? "Privacy policy" : "Terms of service"} sections`}>
            {sections.map(([title], index) => <a href={`#${slug(title)}`} key={title}><i>{String(index + 1).padStart(2, "0")}</i>{cleanTitle(title)}</a>)}
          </nav>
        </aside>

        <article className="legal-document">
          {sections.map(([title, body], index) => <section id={slug(title)} key={title}>
            <div className="legal-section-title"><span>{String(index + 1).padStart(2, "0")}</span><h2>{cleanTitle(title)}</h2></div>
            <div className="legal-section-copy">{body}</div>
          </section>)}
        </article>
      </div>
    </div>
    <PublicFooter />
  </main>;
}
