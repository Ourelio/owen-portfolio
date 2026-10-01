import type { Block, Link } from "@/lib/content";
import { promptParts } from "@/lib/content";
import BrandIcon from "./BrandIcon";

/**
 * Prints blocks as terminal output.
 *
 * Guided mode and manual mode both render through here, which is what
 * keeps them from drifting: there is exactly one place that decides what
 * a paragraph, an entry or a link looks like.
 */

/** The prompt line. Guided mode fakes one above each section so the panel
 *  reads like a command just ran. */
export function PromptText({ cwd }: { cwd?: string }) {
  const { host, path, sigil } = promptParts(cwd);
  return (
    <>
      <span className="text-ok">{host}</span>
      <span className="text-muted">:</span>
      <span className="text-accent">{path}</span>
      <span className="text-muted">{sigil}</span>
    </>
  );
}

export function Prompt({ command, cwd }: { command: string; cwd?: string }) {
  return (
    <div className="break-all">
      <PromptText cwd={cwd} />
      {command ? <span className="text-ink"> {command}</span> : null}
    </div>
  );
}

/** A plain-language gloss, set like a shell comment. */
export function Note({ text }: { text: string }) {
  return (
    <p className="max-w-[72ch] text-muted">
      <span className="select-none text-ok/70">{"# "}</span>
      {text}
    </p>
  );
}

export function OutLink({ label, href }: Link) {
  const external = !href.startsWith("mailto:");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      // The underline belongs to the words, not the mark beside them.
      className="inline-flex items-center gap-2 align-middle text-link"
    >
      <BrandIcon href={href} />
      <span className="underline decoration-line underline-offset-4 hover:decoration-link">
        {label}
      </span>
    </a>
  );
}

type Tone = NonNullable<Extract<Block, { t: "entry" }>["tone"]>;

const TONE: Record<Tone, string> = {
  gold: "text-gold",
  bronze: "text-bronze",
  ok: "text-ok",
};

const TONE_MARK: Record<Tone, string> = {
  gold: "bg-gold",
  bronze: "bg-bronze",
  ok: "bg-ok",
};

/**
 * One pixel block per entry, so a run of them reads as a list rather than
 * as a wall. A square because that is the shape this site is made of -
 * the sprite, the window buttons, the taskbar swatches.
 */
function Mark({ tone }: { tone?: Tone }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-[0.55em] block size-1.5 shrink-0 ${tone ? TONE_MARK[tone] : "bg-accent"}`}
    />
  );
}

function Entry({ block }: { block: Extract<Block, { t: "entry" }> }) {
  return (
    <div className="flex max-w-[72ch] gap-3">
      <Mark tone={block.tone} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-6">
          <span className={`min-w-0 ${block.tone ? TONE[block.tone] : "text-ink"}`}>
            {block.title}
          </span>
          {block.tag ? <span className="shrink-0 text-meta">{block.tag}</span> : null}
        </div>

        {block.meta ? <div className="text-muted">{block.meta}</div> : null}
        {block.link ? (
          <div>
            <OutLink {...block.link} />
          </div>
        ) : null}
        {block.body ? <p className="mt-1.5 text-ink">{block.body}</p> : null}
        {block.note ? (
          <div className="mt-1.5">
            <Note text={block.note} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** An organisation and the posts held there, listed under it. */
function Org({ block }: { block: Extract<Block, { t: "org" }> }) {
  return (
    <div className="max-w-[72ch]">
      <div className="flex items-center gap-3">
        {/* Plain <img>: two 128px files, nothing to optimise. */}
        <img
          src={block.logo}
          alt=""
          width={26}
          height={26}
          className="size-[26px] shrink-0 border border-line object-contain"
        />
        <span className="text-ink">{block.name}</span>
      </div>

      {/* A rail down from the logo, so the posts read as belonging to it,
          and the same marker every other entry gets. */}
      <ul className="ml-[12px] mt-3 space-y-4 border-l border-line pl-4">
        {block.roles.map((role) => (
          <li key={`${role.title} ${role.period}`} className="flex gap-3">
            <Mark />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-6">
                <span className="min-w-0 text-ink">{role.title}</span>
                <span className="shrink-0 text-meta">
                  {role.period} ({role.span})
                </span>
              </div>
              {role.skills ? <Note text={role.skills} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two entries in a row want real air between them; everything else
 *  reads fine at the ordinary rhythm. */
function gapBefore(prev: Block | undefined, block: Block): string {
  if (!prev) return "";
  const listy = (b: Block) => b.t === "entry" || b.t === "org";
  return listy(prev) && listy(block) ? "mt-6" : "mt-3";
}

export default function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((block, i) => {
        const gap = gapBefore(blocks[i - 1], block);
        switch (block.t) {
          case "p":
            return (
              <p key={i} className={`max-w-[72ch] text-ink ${gap}`}>
                {block.text}
              </p>
            );
          case "note":
            return (
              <div key={i} className={gap}>
                <Note text={block.text} />
              </div>
            );
          case "list":
            return (
              <ul key={i} className={`max-w-[72ch] space-y-2 ${gap}`}>
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <Mark />
                    <span className="min-w-0 flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "entry":
            return (
              <div key={i} className={gap}>
                <Entry block={block} />
              </div>
            );
          case "org":
            return (
              <div key={i} className={gap}>
                <Org block={block} />
              </div>
            );
          case "link":
            return (
              <div key={i} className={gap}>
                <OutLink label={block.label} href={block.href} />
              </div>
            );
          case "gap":
            return <div key={i} className="h-2" aria-hidden="true" />;
        }
      })}
    </div>
  );
}
