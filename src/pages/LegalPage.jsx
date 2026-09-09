import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

const email = <a href="mailto:support@draftix.tech">support@draftix.tech</a>;

const privacy = [
  ["Who operates Draftix", <p>Draftix is an independent community project and is responsible for the information described here. Privacy questions and requests can be sent to {email}.</p>],
  ["What we collect", <ul><li><strong>Anonymous session IDs.</strong> A random identifier lets draft rooms and tournaments recognize your browser. It is not tied to an email, password, or profile.</li><li><strong>Draft data.</strong> Nicknames, team names, chat, picks, bans, and optional logos are stored while a session runs.</li><li><strong>Anonymous draft statistics.</strong> Completed drafts may contribute aggregate map, agent, and game-patch counts without room codes, names, chat, or player identifiers.</li><li><strong>Visits and product activity.</strong> A first-party <code>dx_v</code> cookie contains a random ID. Draftix records pages viewed, the referring website’s host, and milestones such as creating or completing a room, balancing teams, or creating a bracket.</li><li><strong>Feedback.</strong> Draftix stores a submitted rating, message, page, and an anonymous service identifier used to prevent spam.</li><li><strong>Client errors.</strong> Draftix may record an error message, technical trace, page, browser version, and anonymous visitor ID.</li><li><strong>Security data.</strong> An anonymous service ID and, for short-lived abuse prevention, an IP address may be processed to enforce request limits.</li><li><strong>Browser storage.</strong> Your nickname, tournaments list, organizer tokens, team-balancer roster, bracket theme, and cached catalog data stay on your device.</li></ul>],
  ["Why we use it", <ul><li><strong>Provide Draftix:</strong> create rooms, synchronize drafts, balance teams, host brackets, and show results.</li><li><strong>Protect the service:</strong> prevent spam, misuse, and excessive requests.</li><li><strong>Improve reliability:</strong> diagnose errors and understand which product flows work.</li><li><strong>Measure usage:</strong> count anonymous visits and aggregate activity without advertising profiles.</li><li><strong>Respond to users:</strong> review feedback and handle support or privacy requests.</li></ul>],
  ["Who can see information", <ul><li>Draft-room participants can see its nicknames, team names, chat, logos, selections, and results.</li><li>Anyone with a public tournament link can see the tournament name, entrants, bracket, scores, and results.</li><li>Anyone with an organizer link can manage that tournament. Keep organizer links private.</li><li>Invitations may include a team name, room code, and link when you choose to copy or share them.</li></ul>],
  ["How long data lives", <ul><li><strong>Draft sessions</strong> are deleted when closed or after the configured inactivity period, together with players, chat, and logos.</li><li><strong>Abuse-prevention records</strong> are normally removed within one to two days.</li><li><strong>Client errors</strong> are removed after approximately 30 days.</li><li><strong>Tournaments</strong> remain available so organizer and public links work. Draftix may remove inactive, abusive, or technically obsolete tournaments.</li><li><strong>Pageviews, product events, and feedback</strong> are kept while needed to understand and improve Draftix and are reviewed when no longer necessary.</li><li><strong>Anonymous aggregate counters</strong> may be kept indefinitely because they cannot be connected to a room or person.</li><li><strong>Browser storage</strong> remains until you clear it or your browser removes it.</li></ul>],
  ["Organizer tokens", <p>A tournament creates a one-time organizer token. It is stored in the organizer’s browser; the server keeps an irreversible hash. Anyone holding the token or manage link can control that tournament, so treat it like a password.</p>],
  ["Service providers", <ul><li><strong>Supabase</strong> provides database, anonymous authentication, storage, and realtime infrastructure.</li><li><strong>Vercel</strong> provides website hosting and delivery infrastructure.</li><li><strong>valorant-api.com</strong> supplies Valorant catalog data and artwork. Direct browser requests provide ordinary network information such as your IP address.</li><li><strong>Ko-fi</strong> handles voluntary donations after you follow its external link.</li></ul>],
  ["No advertising sale or profiling", <p>Draftix does not sell personal information, use advertising networks, create cross-site advertising profiles, or share information for behavioral advertising. Information is disclosed only to providers needed to operate Draftix, to room participants or public-bracket viewers as directed by users, or when required by law.</p>],
  ["International processing", <p>Draftix and its providers may process information outside your country. Draftix limits information sent to what is needed to provide and protect the service.</p>],
  ["Security", <p>Draftix uses access controls, restricted database operations, hashed organizer credentials, request limits, and short retention for room and diagnostic data. No internet service can guarantee absolute security. Do not submit sensitive information in names, chat, feedback, logos, or tournament fields.</p>],
  ["Children", <p>Draftix is a general-audience service and is not directed to children under 13. Children under 13 should not submit personal information. Users below the age required to accept online services in their country should use Draftix only with a parent or guardian’s permission.</p>],
  ["Your choices and rights", <ul><li>You may ask to access, correct, delete, or object to processing of information connected to you, where applicable.</li><li>Because Draftix has no accounts, a room code, organizer token, or other reasonable proof may be needed to locate or change a record. Anonymous aggregates cannot be connected back to an individual.</li><li>You can block or delete <code>dx_v</code>. Draftix still works, although a new random ID may be created unless cookies are blocked.</li><li>You can clear browser storage to remove local tokens, rosters, and preferences.</li><li>You may complain to the privacy authority in your country if you believe your rights were not respected.</li></ul>],
  ["Contact", <p>Send privacy questions or requests to {email}. Include enough information to identify the relevant room or tournament, but do not email sensitive information or an organizer token unless support specifically requests it.</p>],
];

const terms = [
  ["1. The service", <p>Draftix is a free browser-based tool for Valorant drafts, team balancing, and tournament brackets. It is provided “as is” and “as available,” without an uptime or data-preservation guarantee.</p>],
  ["2. Eligibility", <p>You must be legally able to agree to these terms. If local law requires permission from a parent or guardian, you may use Draftix only with that permission. Draftix is not directed to children under 13.</p>],
  ["3. Acceptable use", <><p>You agree not to:</p><ul><li>Harass, threaten, impersonate, or spam others.</li><li>Post hateful, illegal, sexually explicit, or privacy-invasive content.</li><li>Upload malicious files or content you cannot lawfully use.</li><li>Overload, scrape, bypass safeguards, deface, or disrupt Draftix.</li><li>Resell or present Draftix as your own product without permission.</li></ul></>],
  ["4. User content", <><p>You remain responsible for names, chat, logos, tournament information, and other content you submit. You confirm that you have the rights and permission needed to use it.</p><p>You grant Draftix a limited, non-exclusive license to store, process, copy, and display submitted content only as needed to operate, secure, and improve the service. This ends when content is deleted, except for anonymous aggregate statistics that no longer identify its source.</p></>],
  ["5. Shared rooms and public brackets", <p>Room content is visible to participants. Tournament details and results may be visible to anyone with the public link. Organizer links allow bracket management and must remain private. You are responsible for links and room codes you distribute.</p>],
  ["6. Moderation and termination", <p>Draftix may remove content, close rooms, restrict access, revoke links, or suspend features when reasonably needed to address abuse, security risks, legal duties, or service integrity. Draftix may modify or discontinue features or the service.</p>],
  ["7. Riot Games and Valorant", <p>Draftix is an independent community tool and is not affiliated with, endorsed by, or sponsored by Riot Games. Valorant names, artwork, and marks belong to Riot Games and their respective owners.</p>],
  ["8. Copyright concerns", <p>If you believe content available through Draftix infringes your rights, email {email} with the relevant link, a description of the work or right involved, and enough information to investigate.</p>],
  ["9. Donations", <p>Ko-fi donations are voluntary and generally non-refundable except where law requires otherwise. They do not purchase features, privileges, ownership, or guarantees. Ko-fi’s terms govern payment processing.</p>],
  ["10. Disclaimer", <p>To the maximum extent permitted by law, Draftix disclaims implied and statutory warranties, including merchantability, fitness for a particular purpose, non-infringement, availability, and accuracy. Rights that cannot legally be excluded remain unaffected.</p>],
  ["11. Limitation of liability", <p>To the maximum extent permitted by law, Draftix and its maintainers are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or lost data, profits, opportunities, or tournament results. Mandatory consumer rights remain unaffected.</p>],
  ["12. Governing rules", <p>These terms are governed by laws applicable to the Draftix operator and your use of the service, without overriding mandatory rights in your country. If one provision is unenforceable, the remaining provisions continue to apply.</p>],
  ["13. Changes", <p>Draftix may update these terms. Material changes will be reflected by a new effective date. Continued use after changes take effect means you accept them, except where another form of notice or consent is legally required.</p>],
  ["14. Contact", <p>Questions, legal notices, and copyright concerns can be sent to {email}.</p>],
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
        <p className="legal-updated">Effective September 9, 2026</p>
        <p className="legal-lead">{isPrivacy ? "Draftix is a free, no-signup tool. This policy explains the limited information used to provide, protect, and improve it." : "By using Draftix, you agree to these plain-language service terms."}</p>
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
