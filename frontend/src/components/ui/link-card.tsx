import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

// 16px brand and file glyphs (deck details, screens 50 to 52). Decorative: the text
// beside them names the link.
function Glyph({ className = "size-5", children }: { className?: string; children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      {children}
    </svg>
  );
}

// The GitHub mark (Octicons, MIT).
export const GitHubIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </Glyph>
);

// The LinkedIn mark (Bootstrap Icons, MIT).
export const LinkedInIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M0 1.15C0 .52.52 0 1.17 0h13.66C15.48 0 16 .52 16 1.15v13.7c0 .63-.52 1.15-1.17 1.15H1.17C.52 16 0 15.48 0 14.85V1.15Zm4.94 12.24V6.17H2.54v7.22h2.4ZM3.74 5.18c.84 0 1.36-.55 1.36-1.25-.02-.71-.52-1.25-1.34-1.25-.82 0-1.36.54-1.36 1.25 0 .7.52 1.25 1.33 1.25h.01Zm4.91 8.21V9.36c0-.22.02-.43.08-.59.18-.43.57-.88 1.23-.88.87 0 1.21.66 1.21 1.63v3.87h2.4V9.25c0-2.22-1.18-3.25-2.76-3.25-1.28 0-1.85.7-2.17 1.2V6.17h-2.4c.03.68 0 7.22 0 7.22h2.4Z" />
  </Glyph>
);

export const FileIcon = ({ className }: { className?: string }) => (
  <Glyph className={className}>
    <path d="M4 0h5.5L14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Zm5 1.5V4a1 1 0 0 0 1 1h2.5L9 1.5ZM5 8.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H5Zm0 3a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H5Z" />
  </Glyph>
);

// "https://www.github.com/sam/" → "github.com/sam", for the line under the title.
export function shortLink(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

// A link as a row: icon, title, the address and an arrow, ↗ for a new tab or › inside
// the app. compact is the small icon-over-title tile on the applicant card (screen 52).
// See docs/design/patterns/deck-details.md.
export function LinkCard({
  href,
  icon,
  title,
  detail = shortLink(href),
  external = true,
  compact = false,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  detail?: string;
  external?: boolean;
  compact?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const body = compact ? (
    <>
      <span className="grid size-8 place-items-center rounded-row border border-border bg-surface text-text">
        {icon}
      </span>
      <span className="text-xs font-semibold text-text">{title}</span>
    </>
  ) : (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-row border border-border bg-surface text-text">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-text">{title}</span>
        <span className="text-xs text-muted [overflow-wrap:anywhere]">{detail}</span>
      </span>
      <span aria-hidden="true" className="text-muted">
        {external ? "↗" : "›"}
      </span>
    </>
  );
  const className = compact
    ? "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-row border border-border bg-surface-2 p-2 hover:border-muted"
    : "flex min-h-11 items-center gap-3 rounded-row border border-border bg-surface-2 px-3 py-2 hover:border-muted";
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      // The label puts the spaces in; the sr-only text is for anything reading the text.
      aria-label={`${title}${compact ? "" : `, ${detail}`} (opens in a new tab)`}
      className={className}
    >
      {body}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : (
    <Link href={href} onClick={onClick} className={className}>
      {body}
    </Link>
  );
}
