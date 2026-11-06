import { useState } from "react";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 3000;

export default function ContactPage() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 429) {
        setStatus("idle");
        setError("Too frequent, try again later.");
        return;
      }

      if (!response.ok) {
        setStatus("idle");
        setError(typeof result.error === "string"
          ? result.error
          : "Your message could not be sent. Please check the form and try again.");
        return;
      }

      form.reset();
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("We couldn't reach the contact service. Check your connection and try again.");
    }
  }

  return (
    <main className="sp-page contact-page">
      <SiteHeader />
      <section className="contact-shell" aria-labelledby="contact-title">
        <header className="contact-hero">
          <h1 id="contact-title">Need a hand?</h1>
          <p>Send the Draftix team a message and we’ll get back to you by email.</p>
        </header>

        {status === "sent" ? (
          <section className="contact-success" role="status" aria-live="polite">
            <div className="contact-success-heading">
              <CheckCircle aria-hidden="true" weight="fill" />
              <h2>Message sent.</h2>
            </div>
            <p>Thanks for reaching out. We’ll reply to the email address you provided.</p>
            <p className="contact-cooldown-note">
              To help prevent spam, wait 10 minutes before sending another message. The form also limits
              each network to five messages per 24 hours.
            </p>
            <button type="button" onClick={() => setStatus("idle")}>
              Send another message
            </button>
          </section>
        ) : (
          <form className="contact-form" onSubmit={submit} aria-label="Contact Draftix support">
            <input
              className="contact-honeypot"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="contact-form-fields">
              <label className="contact-field">
                <span>Name <small>Optional</small></span>
                <input type="text" name="name" autoComplete="name" maxLength={100} />
              </label>

              <label className="contact-field">
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="contact-field contact-field-wide">
                <span>What can we help with?</span>
                <select name="topic" defaultValue="" required>
                  <option value="" disabled>Select a topic</option>
                  <option>Draft room or map veto</option>
                  <option>Tournament bracket</option>
                  <option>Team balancer</option>
                  <option>Website issue</option>
                  <option>Something else</option>
                </select>
              </label>

              <label className="contact-field contact-field-wide">
                <span>Message</span>
                <textarea
                  name="message"
                  rows={6}
                  minLength={MIN_MESSAGE_LENGTH}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Tell us what happened or how we can help."
                  required
                />
                <small>Please don’t include passwords, room access codes, or other sensitive information.</small>
              </label>
            </div>

            {error ? <p className="contact-error" role="alert">{error}</p> : null}

            <button className="contact-submit" type="submit" disabled={status === "sending"} aria-busy={status === "sending"}>
              {status === "sending" ? "Sending message…" : "Send message"}
              {status !== "sending" ? <ArrowRight aria-hidden="true" weight="bold" /> : null}
            </button>
          </form>
        )}

        <div className="contact-feedback">
          <div>
            <h2>Have a quick note?</h2>
            <p>Share a rating or product suggestion on the feedback page.</p>
          </div>
          <a href="/feedback">
            Send feedback
            <ArrowRight aria-hidden="true" weight="bold" />
          </a>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
