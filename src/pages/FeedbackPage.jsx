import { useRef, useState } from "react";
import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";
import { supabaseConfig } from "../lib/supabaseConfig.js";

const MAX_MESSAGE = 600;
const MIN_MESSAGE = 3;

const RATING_LABELS = {
  1: "Rough",
  2: "Not great",
  3: "Okay",
  4: "Good",
  5: "Love it",
};

const MIN_RATING = 1;
const MAX_RATING = 5;
const FEEDBACK_SOURCES = {
  draft: "finishing a map and agent draft",
  bracket: "creating a tournament bracket",
  teams: "balancing teams",
};

export default function FeedbackPage() {
  const source = new URLSearchParams(window.location.search).get("from");
  const sourceDescription = FEEDBACK_SOURCES[source] || "";
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const starRefs = useRef({});

  // Keyboard support for the star radiogroup: arrow keys move the rating,
  // Home/End jump to the extremes. The newly-selected star keeps focus so
  // Tab continues from the group naturally.
  function handleStarKeyDown(event) {
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min((rating || 0) + 1, MAX_RATING);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max((rating || MAX_RATING + 1) - 1, MIN_RATING);
    else if (event.key === "Home") next = MIN_RATING;
    else if (event.key === "End") next = MAX_RATING;
    if (next === null) return;
    event.preventDefault();
    setRating(next);
    starRefs.current[next]?.focus();
  }

  const canSubmit = status === "idle" && rating >= 1 && message.trim().length >= MIN_MESSAGE;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const cfg = supabaseConfig();
    if (!cfg) {
      setError("Feedback is temporarily unavailable.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(`${cfg.url}/rest/v1/rpc/draftix_submit_feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({
          p_rating: rating,
          p_message: message.trim(),
          p_page: `${window.location.pathname}${sourceDescription ? `?from=${encodeURIComponent(source)}` : ""}`,
        }),
      });
      if (res.status === 429) {
        setStatus("idle");
        setError("You've sent several feedbacks recently. Please wait about 10 minutes and try again.");
        return;
      }
      if (!res.ok) {
        setStatus("idle");
        setError("Could not send your feedback right now. Please try again.");
        return;
      }
      const payload = await res.json().catch(() => null);
      if (payload && payload.ok === false) {
        const minutes = Number(payload.retryMinutes) || 10;
        setStatus("idle");
        setError(`You already sent feedback recently. Please wait about ${minutes} minutes before sending another one.`);
        return;
      }
      setStatus("sent");
    } catch (_) {
      setStatus("idle");
      setError("Could not reach the feedback service. Check your connection and try again.");
    }
  }

  return (
    <main className="sp-page feedback-page">
      <SiteHeader />
      <section className="seo-topic-shell feedback-shell">
        <header className="seo-topic-hero">
          <h1>Tell us how we're doing.</h1>
          <p className="seo-topic-lead">
            {sourceDescription
              ? `How was ${sourceDescription}? Rate Draftix and leave a short note.`
              : "Rate Draftix and leave a short note. Feedback goes straight to the team — no account needed."}
          </p>
        </header>

        <div className="seo-topic-article">
          {status === "sent" ? (
            <div className="feedback-done" role="status">
              <h2>Thank you! 🎉</h2>
              <p>Your feedback was received. It helps us decide what to build next.</p>
              <a href="/" className="feedback-submit">Back to Draftix</a>
            </div>
          ) : (
            <form className="feedback-form" onSubmit={submit} aria-label="Send feedback">
              <fieldset className="feedback-rating">
                <legend>How would you rate Draftix?</legend>
                <div className="feedback-stars" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      ref={(node) => { starRefs.current[value] = node; }}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value > 1 ? "s" : ""} — ${RATING_LABELS[value]}`}
                      className={value <= rating ? "feedback-star is-active" : "feedback-star"}
                      tabIndex={rating === 0 || rating === value ? 0 : -1}
                      onClick={() => setRating(value)}
                      onKeyDown={handleStarKeyDown}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {rating > 0 ? <p className="feedback-rating-label">{RATING_LABELS[rating]}</p> : null}
              </fieldset>

              <label className="feedback-message">
                <span>Your feedback</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                  placeholder="What worked well? What should we improve?"
                  rows={5}
                  required
                  minLength={MIN_MESSAGE}
                  maxLength={MAX_MESSAGE}
                />
                <span className="feedback-count">{message.length}/{MAX_MESSAGE}</span>
              </label>

              {error ? <p className="feedback-error" role="alert">{error}</p> : null}

              <button type="submit" className="feedback-submit" disabled={!canSubmit} aria-busy={status === "sending"}>
                {status === "sending" ? "Sending..." : "Send feedback"}
              </button>
            </form>
          )}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
