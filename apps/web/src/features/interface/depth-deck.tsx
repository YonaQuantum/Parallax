import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/config/site";
import type { SiteDomainCode } from "@/config/site";
import { domainIcons } from "@/features/interface/chrome";

type DeckDomain = {
  code: SiteDomainCode;
  href: string;
  shortCode: string;
  label: string;
  description: string;
  tags: string[];
};

export function DepthDeck({ domains }: { domains: DeckDomain[] }) {
  return (
    <section className="ap-domain-index" aria-label="PARALLAX domains">
      <div className="ap-domain-index-head">
        <h2>{site.copy.sections.deck}</h2>
        <p>{site.copy.sections.deckDescription}</p>
      </div>
      <div className="ap-domain-list">
        {domains.map((domain, index) => {
          const Icon = domainIcons[domain.code];
          return (
            <Link className="ap-domain-row group" href={domain.href} key={domain.code}>
              <span className="ap-domain-no">{String(index + 1).padStart(2, "0")}</span>
              <span className="ap-domain-code"><Icon size={22} /></span>
              <span className="ap-domain-main">
                <span className="ap-domain-title">{domain.label}</span>
                <span className="ap-domain-description">{domain.description}</span>
              </span>
              <span className="ap-domain-tags">
                {domain.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </span>
              <ArrowRight className="ap-domain-arrow" size={17} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
