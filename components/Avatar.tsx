import { identity } from "@/lib/content";

/**
 * Initials in a plain circle. To use a real photo later, swap the span for
 * an <img> with the same classes — nothing else needs to change.
 */
export default function Avatar() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-accent">
      {identity.initials}
    </span>
  );
}
