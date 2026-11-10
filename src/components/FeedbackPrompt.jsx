import { ChatCircleText } from "@phosphor-icons/react/ChatCircleText";
import { X } from "@phosphor-icons/react/X";

const promptCopy = {
  draft: {
    title: "Draft complete. How did it go?",
    href: "/feedback?from=draft",
  },
  bracket: {
    title: "Bracket created. How was the setup?",
    href: "/feedback?from=bracket",
  },
  teams: {
    title: "Teams are ready. Was the balance helpful?",
    href: "/feedback?from=teams",
  },
};

export default function FeedbackPrompt({ source, onDismiss }) {
  const copy = promptCopy[source];
  if (!copy) return null;

  return (
    <aside className="feedback-prompt" aria-label="Share feedback">
      <ChatCircleText className="feedback-prompt-icon" size={22} weight="duotone" aria-hidden="true" />
      <div className="feedback-prompt-copy">
        <strong>{copy.title}</strong>
        <span>A quick rating or note helps us improve Draftix.</span>
      </div>
      <a href={copy.href}>Share feedback</a>
      <button type="button" onClick={onDismiss} aria-label="Dismiss feedback prompt">
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
