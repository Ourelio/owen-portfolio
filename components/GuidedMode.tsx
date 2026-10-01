"use client";

import { useEffect, useRef, useState } from "react";
import { detailBlocks, identity, listingFor, sections } from "@/lib/content";
import Avatar from "./Avatar";
import Blocks, { Prompt } from "./TerminalOutput";

/**
 * Guided mode: a sidebar that stays put, and a panel that prints the
 * section you picked as though a command had just run.
 *
 * Everything it shows comes from lib/content.ts through the same renderer
 * manual mode uses, so the two can't say different things.
 */
/** The two ways out. Lives in the sidebar on desktop, under the panel on
 *  narrow screens where the sidebar has no room for a footer. */
function WayOut({ onManual, onHome }: { onManual: () => void; onHome: () => void }) {
  return (
    <>
      <button type="button" onClick={onManual} className="text-muted hover:text-accent">
        Type commands instead
      </button>
      <button type="button" onClick={onHome} className="text-muted hover:text-accent">
        Back to the start
      </button>
    </>
  );
}

export default function GuidedMode({ onManual, onHome }: { onManual: () => void; onHome: () => void }) {
  const [activeId, setActiveId] = useState(sections[0].id);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const section = sections.find((s) => s.id === activeId)!;
  // Directory sections are a list you pick from; everything else prints
  // its blocks and that's the whole of it.
  const listing = listingFor(section.id);
  const detail = detailSlug ? detailBlocks(section.id, detailSlug) : null;

  // A new section starts at the top, the way fresh output would.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [activeId, detailSlug]);

  function pick(id: string) {
    setActiveId(id);
    setDetailSlug(null);
  }

  const command = detail ? `cat ${section.path}/${detailSlug}.txt` : section.command;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* ---- sidebar ---- */}
      <div className="flex shrink-0 flex-col border-b border-line md:w-[248px] md:border-b-0 md:border-r">
        <div className="hidden items-center gap-3 px-6 py-6 md:flex">
          <Avatar />
          <span className="min-w-0">
            <span className="block truncate text-ink">{identity.name}</span>
            <span className="block truncate text-muted">{identity.handle}</span>
          </span>
        </div>

        <nav
          aria-label="Sections"
          className="scroller flex gap-1 overflow-x-auto px-3 py-3 md:flex-col md:gap-0 md:overflow-x-visible md:overflow-y-auto md:px-3 md:pb-4 md:pt-0"
        >
          {sections.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-left md:w-full ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <span aria-hidden="true" className="select-none">
                  {active ? "> " : "  "}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden flex-col items-start gap-1 border-t border-line px-6 py-4 md:flex">
          <WayOut onManual={onManual} onHome={onHome} />
        </div>
      </div>

      {/* ---- panel ---- */}
      <div ref={panel} className="scroller min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-9 sm:py-8">
        <Prompt command={command} />

        <div className="mt-5">
          {detail ? (
            <>
              <Blocks blocks={detail} />
              <button
                type="button"
                onClick={() => setDetailSlug(null)}
                className="mt-7 text-muted hover:text-accent"
              >
                Back to the list
              </button>
            </>
          ) : listing.length ? (
            <>
              <Blocks blocks={section.blocks} />
              <ul className="mt-5 space-y-1">
                {listing.map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      onClick={() => setDetailSlug(item.slug)}
                      className="group flex w-full max-w-[64ch] items-baseline justify-between gap-6 border border-line px-4 py-3 text-left hover:border-accent hover:bg-tint"
                    >
                      <span className="min-w-0 text-ink">{item.title}</span>
                      <span
                        className={`shrink-0 ${
                          item.tagKind === "event"
                            ? "text-meta"
                            : item.tag === "Digital Forensics"
                              ? "text-ok"
                              : "text-link"
                        }`}
                      >
                        {item.tag}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Blocks blocks={section.blocks} />
          )}
        </div>

        {/* The same two ways out, for narrow screens where the sidebar
            footer is hidden. */}
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4 md:hidden">
          <WayOut onManual={onManual} onHome={onHome} />
        </div>
      </div>
    </div>
  );
}
