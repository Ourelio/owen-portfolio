"use client";

import { eggs } from "@/lib/content";

/**
 * The bar along the bottom: one item per open terminal, whether it's on
 * screen or minimised. Clicking one brings it up and focuses it.
 */

export type TaskItem = {
  id: number;
  label: string;
  minimized: boolean;
  focused: boolean;
  tone: string;
};

export default function Taskbar({
  items,
  tiled,
  onPick,
  onNew,
  canOpen,
}: {
  items: TaskItem[];
  tiled: boolean;
  onPick: (id: number) => void;
  onNew: () => void;
  canOpen: boolean;
}) {
  return (
    <div className="taskbar">
      {/* Centred on the bar itself rather than between its contents, so it
          stays put as terminals come and go. Past three it would collide
          with the chips, and they're the half of this bar that does a job. */}
      {items.length <= 3 ? (
        <span className="taskbar-quote">&ldquo;{eggs.quote}&rdquo;</span>
      ) : null}

      {items.length === 0 ? (
        <span className="text-muted">
          No terminals open
          {canOpen ? (
            <>
              {" - "}
              <button
                type="button"
                onClick={onNew}
                className="text-accent hover:underline"
              >
                open one
              </button>
            </>
          ) : null}
        </span>
      ) : (
        <>
          <span className="hidden text-muted sm:inline">
            {items.length} open{tiled ? ", tiled" : ""}
          </span>

          <div className="taskbar-items scroller">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                aria-current={item.focused ? "true" : undefined}
                title={
                  item.minimized ? `${item.label} (minimised)` : item.label
                }
                style={
                  item.focused
                    ? { borderColor: item.tone, color: item.tone }
                    : undefined
                }
                className={`taskbar-item ${item.focused ? "is-focused" : ""} ${
                  item.minimized ? "is-minimized" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="block size-2 shrink-0 border"
                  style={{
                    borderColor: item.tone,
                    background: item.focused ? item.tone : "transparent",
                  }}
                />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
