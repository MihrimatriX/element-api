import { Link } from "react-router-dom";
import { ExternalLink } from "@/components/ui/external-link";
import { cn } from "@/lib/utils";
import type { GuideInline } from "./guide-model";

interface InlineContentProps {
  tokens: readonly GuideInline[];
  /** `chip` boxes inline code (running text); `plain` keeps it bare mono (names, labels). */
  code?: "chip" | "plain";
}

const codeClass = {
  chip: "rounded-sm border border-line bg-surface-2 px-1 py-px text-[0.86em] text-ink [overflow-wrap:anywhere]",
  plain: "text-[0.93em] text-ink break-words",
} as const;

/** Short code (`X-User-Id`, `POST`) never breaks at its hyphens; long paths may wrap. */
const NO_WRAP_LENGTH = 24;

/** Renders inline guide tokens: text, `code`, **bold** and guide or external links. */
export function InlineContent({ tokens, code = "chip" }: InlineContentProps) {
  return tokens.map((token, index) => {
    switch (token.type) {
      case "text":
        return token.text;
      case "code":
        return (
          <code
            key={index}
            className={cn(
              "font-mono",
              codeClass[code],
              token.text.length <= NO_WRAP_LENGTH && "whitespace-nowrap",
            )}
          >
            {token.text}
          </code>
        );
      case "strong":
        return (
          <strong key={index} className="font-semibold text-ink">
            <InlineContent tokens={token.content} code={code} />
          </strong>
        );
      case "link":
        return token.href.startsWith("/") ? (
          <Link key={index} to={token.href} className="text-link">
            {token.text}
          </Link>
        ) : (
          <ExternalLink key={index} href={token.href}>
            {token.text}
          </ExternalLink>
        );
    }
  });
}
