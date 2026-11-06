import { AppBrand } from "./AppNav.jsx";

export default function PublicFooter({ reveal = false }) {
  return (
    <footer className={`dr-footer public-footer${reveal ? "" : " is-visible"}`} {...(reveal ? { "data-reveal": true } : {})}>
      <div className="public-footer-main">
        <div className="public-footer-brand">
          <AppBrand className="dr-brand" />
          <p>Valorant drafting and map vetoes for teams, scrims, and tournaments.</p>
        </div>

        <nav className="public-footer-col" aria-label="Draftix product">
          <h2 className="public-footer-heading">Product</h2>
          <a className="public-footer-featured" href="/draft">Open Draftix</a>
          <a href="/team-balance">Team balancer</a>
          <a href="/tournaments">Bracket maker</a>
        </nav>

        <nav className="public-footer-col" aria-label="Draftix guides">
          <h2 className="public-footer-heading">Guides</h2>
          <a href="/valorant-map-veto">Map veto guide</a>
          <a href="/valorant-agent-ban">Agent bans guide</a>
          <a href="/valorant-draft-tool">Draft tool guide</a>
          <a href="/tournament-bracket-maker">Bracket maker guide</a>
        </nav>

        <nav className="public-footer-col" aria-label="Help and resources">
          <h2 className="public-footer-heading">Resources</h2>
          <a href="/status">System status</a>
          <a href="/feedback">Send feedback</a>
          <a className="public-footer-contact" href="/contact">Contact support</a>
        </nav>
      </div>

      <div className="public-footer-utility">
        <div className="public-footer-legal-note">
          <small>© {new Date().getFullYear()} DRAFTIX</small>
          <small>Not endorsed by Riot Games. Valorant and Riot Games are trademarks of Riot Games, Inc.</small>
        </div>
        <div className="public-footer-actions">
          <nav aria-label="Legal and site info">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
          <a className="public-footer-donate" href="https://ko-fi.com/dartzski" target="_blank" rel="noreferrer" aria-label="Clutch the server bill on Ko-fi">Clutch the server bill</a>
        </div>
      </div>
    </footer>
  );
}
