import { useEffect, useRef, useState } from "react";
import { Play } from "@phosphor-icons/react/Play";
import AppNav from "../components/AppNav.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

const mapPool = ["Ascent", "Abyss", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Summit", "Sunset"].map((displayName) => ({
  displayName,
  src: `/images/maps/${displayName.toLowerCase()}.webp`,
}));

const heroSlides = [
  { src: "/images/Homepage/drafting-tool.webp", alt: "Draftix live map and agent draft tool" },
  { src: "/images/Homepage/team-balance-tool.webp", alt: "Draftix team balancer tool" },
  { src: "/images/Homepage/tournament-tool.webp", alt: "Draftix tournament bracket maker" },
  { src: "/images/Homepage/matchfound.webp", alt: "Draftix match found screen" },
  { src: "/images/Homepage/result.webp", alt: "Draftix match result poster" },
];

// Reversible motion treatment. Change to "classic" to restore the previous
// homepage pacing without removing either implementation.
const LIVELINESS_VARIANT = "choreographed";

const navigationLinks = [
  { href: "#process", label: "How it works" },
  { href: "/tournaments", label: "Bracket maker" },
  { href: "/team-balance", label: "Team balancer" },
  { href: "/draft", label: "Open Draftix", className: "dr-nav-cta" },
];

const competitiveTools = [
  {
    id: "drafting",
    num: "01",
    kicker: "LIVE MAP VETO & AGENT COMPOSITION",
    title: "DRAFTING",
    desc: "Create and share live brackets for teams or individuals across esports, sports, clubs, classrooms, game nights, and community events.",
    cta: "START DRAFTING",
    href: "/draft",
    image: "/images/Homepage/drafting-tool.webp",
    alt: "Draftix live map and agent drafting tool preview",
  },
  {
    id: "team-balance",
    num: "02",
    kicker: "SKILL-BASED MMR BALANCER",
    title: "TEAM BALANCER",
    desc: "Split custom lobbies into fairer, evenly matched 5v5 rosters with smart MMR distribution, rank balancing, and instant captain assignments.",
    cta: "BALANCE TEAMS",
    href: "/team-balance",
    image: "/images/Homepage/team-balance-tool.webp",
    alt: "Draftix team balancer tool preview",
  },
  {
    id: "tournaments",
    num: "03",
    kicker: "BRACKET & TOURNAMENT ENGINE",
    title: "BRACKET MAKER",
    desc: "Build single and double elimination tournament brackets, track match progression, record scores, and crown a champion with live public share links.",
    cta: "CREATE BRACKET",
    href: "/tournaments",
    image: "/images/Homepage/tournament-tool.webp",
    alt: "Draftix tournament bracket maker preview",
  },
];

function DailyStat() {
  return (
    <div className="dr-hero-proof dr-hero-note" role="region" aria-label="Platform highlights">
      <div className="dr-proof-item">
        <svg className="dr-proof-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
          <path d="M8 2v16" />
          <path d="M16 6v16" />
        </svg>
        <span className="dr-proof-text">
          <strong className="dr-proof-num">{mapPool.length}</strong> maps in the veto pool
        </span>
      </div>

      <span className="dr-proof-divider" aria-hidden="true" />

      <div className="dr-proof-item">
        <svg className="dr-proof-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <span className="dr-proof-text">No signup required</span>
      </div>
    </div>
  );
}

const STAGE_STEP = 5200;

function HeroStage({ slides }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, STAGE_STEP);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const cardPosition = (index) => {
    const distance = (index - activeSlide + slides.length) % slides.length;
    if (distance === 0) return "is-active";
    if (distance === 1) return "is-next";
    if (distance === 2) return "is-queued";
    if (distance === slides.length - 1) return "is-previous";
    return "is-hidden";
  };

  return (
    <div className="dr-stage">
      <div className="dr-stage-backdrop" aria-hidden="true">
        <img
          src="/images/Homepage/hero-bg.webp"
          alt=""
          width="1672"
          height="941"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="dr-stage-showcase">
        <div className="dr-stage-deck" aria-hidden="true">
          <div className="dr-stage-deck-inner">
            {slides.map((slide, index) => (
              <figure
                className={`dr-stage-card ${cardPosition(index)}`}
                key={slide.src}
              >
                <img
                  src={slide.src}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </div>
        <div className="dr-stage-proof"><DailyStat /></div>
      </div>
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <button className={`dr-back-to-top ${visible ? "is-visible" : ""}`} type="button" aria-label="Updraft to top" title="Updraft to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><img src="/images/button-to-up.webp" alt="" width="397" height="397" /><span>Updraft to top</span></button>;
}

function MapCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStart = useRef(null);
  const select = (index) => setActiveIndex((index + mapPool.length) % mapPool.length);
  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") select(activeIndex - 1);
    if (event.key === "ArrowRight") select(activeIndex + 1);
  };
  const finishSwipe = (event) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) >= 45) select(activeIndex + (distance < 0 ? 1 : -1));
  };

  return <div className="dr-map-carousel" tabIndex="0" onKeyDown={handleKeyDown} onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={finishSwipe} onPointerCancel={() => { pointerStart.current = null; }} aria-label="Valorant map carousel">
    <div className="dr-map-stage">
      {mapPool.map((map, index) => {
        const offset = (index - activeIndex + mapPool.length) % mapPool.length;
        const position = offset === 0 ? "active" : offset === 1 ? "next" : offset === mapPool.length - 1 ? "previous" : "hidden";
        return <button className={`dr-map-slide is-${position}`} key={map.displayName} type="button" onClick={() => select(index)} aria-label={`Show ${map.displayName}`} aria-hidden={position === "hidden"} tabIndex={position === "hidden" ? -1 : 0}>
          {position !== "hidden" && <img src={map.src} alt="" loading={position === "active" ? "eager" : "lazy"} />}
          <span>{map.displayName}</span>
        </button>;
      })}
    </div>
    <div className="dr-map-controls">
      <button type="button" onClick={() => select(activeIndex - 1)}>Previous</button>
      <p><strong key={activeIndex}>{String(activeIndex + 1).padStart(2, "0")}</strong><span> / {String(mapPool.length).padStart(2, "0")}</span></p>
      <button type="button" onClick={() => select(activeIndex + 1)}>Next</button>
    </div>
  </div>;
}

function TutorialModal({ onClose }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [closeRef.current, videoRef.current].filter(Boolean);
      if (!focusable.length) return;
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex + 1) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [onClose]);
  return <div className="dr-tutorial-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="dr-tutorial-title">
    <div className="dr-tutorial-modal" onClick={(event) => event.stopPropagation()}>
      <h2 className="sr-only" id="dr-tutorial-title">Draftix tutorial video</h2>
      <button ref={closeRef} type="button" className="dr-tutorial-close" onClick={onClose} aria-label="Close tutorial">&times;</button>
      <video ref={videoRef} src="/videos/draftix-tutorial.mp4" controls autoPlay playsInline preload="metadata" />
    </div>
  </div>;
}

export default function LandingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const currentTool = competitiveTools[activeToolIndex];
  const selectToolFromKeyboard = (event, index) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % competitiveTools.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + competitiveTools.length) % competitiveTools.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = competitiveTools.length - 1;
    else return;
    event.preventDefault();
    setActiveToolIndex(nextIndex);
    document.getElementById(`tool-tab-${competitiveTools[nextIndex].id}`)?.focus();
  };
  useEffect(() => {
    document.body.classList.add("dr-page");
    const nodes = document.querySelectorAll("[data-reveal], [data-flow]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return () => document.body.classList.remove("dr-page");
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }), { threshold: 0.18, rootMargin: "0px 0px -8%" });
    nodes.forEach((node) => observer.observe(node));
    return () => { observer.disconnect(); document.body.classList.remove("dr-page"); };
  }, []);

  return <main className={`dr-site${LIVELINESS_VARIANT === "choreographed" ? " dr-liveliness-choreographed" : ""}`}>
    <AppNav variant="public" homeHref="#top" links={navigationLinks} />
    <section className="dr-hero dr-hero-stage" id="top">
      <HeroStage slides={heroSlides} />
      <div className="dr-hero-copy" data-reveal><h1><span className="sr-only">Draftix: </span>Draft together.<br /><span>Play prepared.</span></h1><p>Draftix is a free Valorant drafting and map veto platform for teams, scrims, and tournaments.</p><div className="dr-actions"><a href="/draft" className="dr-button dr-button-primary">Open a room</a><a href="#process" className="dr-button dr-button-secondary">Watch the flow</a></div></div>
    </section>
    <section className="dr-agents" id="agents" data-reveal>
      <figure className="dr-agents-media">
        <img src="/images/Homepage/hero-agents.webp" alt="Draftix agent key art" width="1254" height="1254" loading="lazy" />
      </figure>
      <div className="dr-agents-intro">
        <h2>Your agents</h2>
        <strong>Every lock-in changes the draft.</strong>
        <p>Ban, pick, and counter around the agents your team actually plays. Draftix runs the full agent veto in one shared room, so your comp leaves the draft ready, not guessed.</p>
        <a href="https://playvalorant.com/en-us/agents/" target="_blank" rel="noreferrer" className="dr-button dr-agents-cta">View all agents</a>
      </div>
    </section>
    <section className="dr-operations" id="product" data-reveal>
      <header className="dr-operation-intro">
        <h2>One room.<br />Every decision.</h2>
        <p>Create the room, run the draft, share the final matchup.</p>
        <a href="/draft" className="dr-button dr-button-primary">Open a room</a>
      </header>
      <figure className="dr-banner-media">
        <img src="/images/Homepage/section-banner.webp" alt="Draftix squad key art" width="1600" height="900" loading="lazy" />
      </figure>
    </section>
    <section className="dr-val-section" id="process" data-reveal>
      <div className="dr-val-showcase">
        <div className="dr-val-content">
          {/* One keyed subtree replaces the previous tool cleanly and replays its entrance motion. */}
          <div className="dr-val-copy" key={currentTool.id}>
            <h2 className="dr-val-title">{currentTool.title}</h2>
            <p className="dr-val-kicker">{currentTool.kicker}</p>
            <p className="dr-val-desc">{currentTool.desc}</p>

            <div className="dr-val-actions">
              <a href={currentTool.href} className="dr-val-btn-primary">
                <span>{currentTool.cta}</span>
              </a>
              <button
                type="button"
                className="dr-val-btn-secondary"
                onClick={() => setShowTutorial(true)}
                aria-label="Watch Draftix tutorial video"
              >
                <Play size={13} weight="fill" aria-hidden="true" />
                <span>WATCH TUTORIAL</span>
              </button>
            </div>
          </div>

          <div className="dr-val-tabs" role="tablist" aria-label="Select tool format">
            {competitiveTools.map((tool, idx) => {
              const isActive = activeToolIndex === idx;
              return (
                <button
                  key={tool.id}
                  type="button"
                  role="tab"
                  id={`tool-tab-${tool.id}`}
                  aria-controls="tool-showcase-panel"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  className={`dr-val-tab${isActive ? " is-active" : ""}`}
                  onClick={() => setActiveToolIndex(idx)}
                  onKeyDown={(event) => selectToolFromKeyboard(event, idx)}
                >
                  <span className="dr-val-tab-num">{tool.num}</span>
                  <span className="dr-val-tab-name">{tool.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dr-val-media-wrap" id="tool-showcase-panel" role="tabpanel" aria-labelledby={`tool-tab-${currentTool.id}`}>
          <div className="dr-val-media-frame">
            <span className="dr-val-corner dr-val-corner-tl" aria-hidden="true">■</span>
            <span className="dr-val-corner dr-val-corner-br" aria-hidden="true">■</span>
            <a href={currentTool.href} className="dr-val-media-link" title={`Launch ${currentTool.title}`}>
              <img
                key={currentTool.image}
                src={currentTool.image}
                alt={currentTool.alt}
                className="dr-val-img"
                width={currentTool.id === "drafting" ? 1906 : currentTool.id === "team-balance" ? 1858 : 2172}
                height={currentTool.id === "drafting" ? 773 : currentTool.id === "team-balance" ? 870 : 724}
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
    <section className="dr-pool" data-reveal><header><h2>Current map pool</h2><p>Choose the arena before the match begins.</p></header><MapCarousel /></section>
    <section className="dr-final" data-reveal><p className="dr-final-eyebrow">// Final call</p><h2>Your next draft takes seconds.</h2><p className="dr-final-sub">No account needed. Create a room, share the code, and lock in your comp.</p><a href="/draft" className="dr-button dr-button-primary">Start drafting</a></section>
    <PublicFooter reveal />
    {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    <BackToTop />

  </main>;
}
