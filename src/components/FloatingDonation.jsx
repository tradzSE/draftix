import { Coffee } from "@phosphor-icons/react/Coffee";
import "../styles/floating-donation.css";

export default function FloatingDonation() {
  return (
    <a
      className="floating-donation"
      href="https://ko-fi.com/dartzski"
      target="_blank"
      rel="noreferrer"
      aria-label="Support Draftix on Ko-fi (opens in a new tab)"
    >
      <Coffee size={19} weight="fill" aria-hidden="true" />
      <span>Support Draftix</span>
    </a>
  );
}
