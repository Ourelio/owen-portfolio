"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { windowTitle } from "@/lib/content";
import { EDGES, resizeRect, type Edge, type Rect } from "@/lib/workspace";
import Clock from "./Clock";

/**
 * One terminal window: title bar, the three window buttons, dragging by the
 * bar, and eight resize handles.
 *
 * Geometry is absolute (`position: fixed` with left/top/width/height) so
 * that floating, dragging, resizing and tiling are all the same mechanism.
 */

/** Short enough to read as the window responding, not as a transition. */
const MOTION = { open: 190, close: 155 } as const;
const EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

function prefersStillness() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function WindowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-7 place-items-center text-muted ${
        danger ? "hover:bg-accent hover:text-surface" : "hover:bg-tint hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

const MinimizeIcon = () => <span aria-hidden="true" className="block h-px w-3 bg-current" />;

const MaximizeIcon = () => <span aria-hidden="true" className="block size-2.5 border border-current" />;

/** Two offset squares, the usual "put it back" icon. */
const RestoreIcon = () => (
  <span aria-hidden="true" className="relative block size-3">
    <span className="absolute right-0 top-0 block size-2 border border-current" />
    <span className="absolute bottom-0 left-0 block size-2 border border-current bg-surface" />
  </span>
);

const CloseIcon = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" focusable="false">
    <path d="M0 0L9 9M9 0L0 9" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const CURSOR: Record<Edge, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

/** Thin strips along each edge, bigger squares in each corner. They
 *  overhang slightly, so the grab area starts just outside the border. */
const HANDLE: Record<Edge, CSSProperties> = {
  n: { top: -4, left: 0, right: 0, height: 8 },
  s: { bottom: -4, left: 0, right: 0, height: 8 },
  w: { left: -4, top: 0, bottom: 0, width: 8 },
  e: { right: -4, top: 0, bottom: 0, width: 8 },
  nw: { top: -4, left: -4, width: 14, height: 14 },
  ne: { top: -4, right: -4, width: 14, height: 14 },
  sw: { bottom: -4, left: -4, width: 14, height: 14 },
  se: { bottom: -4, right: -4, width: 14, height: 14 },
};

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  rect: Rect;
  z: number;
  focused: boolean;
  tiled: boolean;
  minimized: boolean;
  /** Playing its exit animation; the caller decides what that leads to. */
  leaving: boolean;
  /** Its floating size, kept while tiled so it can come back to it. */
  restoreRect: Rect;
  /** Its own colour, so one terminal is tellable from the next. */
  tone: string;
  /** Off on narrow screens, where a floating window is a nuisance. */
  interactive: boolean;
  onFocus: () => void;
  onGeometry: (rect: Rect) => void;
  onUntile: (rect: Rect) => void;
  onMinimise: () => void;
  onToggleTiled: () => void;
  onClose: () => void;
  onLeft: () => void;
  children: ReactNode;
};

export default function TerminalWindow({
  rect,
  z,
  focused,
  tiled,
  minimized,
  leaving,
  restoreRect,
  tone,
  interactive,
  onFocus,
  onGeometry,
  onUntile,
  onMinimise,
  onToggleTiled,
  onClose,
  onLeft,
  children,
}: Props) {
  const shell = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  const drag = useRef<{ px: number; py: number; start: Rect } | null>(null);
  const resize = useRef<{ px: number; py: number; start: Rect; edge: Edge } | null>(null);

  const wasMinimized = useRef(minimized);
  const opened = useRef(false);

  /** True while a pointer is driving the geometry. */
  const [busy, setBusy] = useState(false);

  // Held in a ref so the exit effect can depend on `closing` alone. As a
  // dependency it would change identity every render and keep restarting
  // the animation.
  const left = useRef(onLeft);
  left.current = onLeft;

  /* -- geometry ---------------------------------------------------- */

  function beginDrag(e: ReactPointerEvent<HTMLDivElement>) {
    onFocus();
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("button")) return;

    let start = rect;

    // Pulling a tiled window by its bar takes it out of the layout, the way
    // a snapped window comes loose. It returns to the size it had before it
    // was tiled, picked up under the cursor.
    if (tiled) {
      // Keep hold of the same point on the bar: grab a tiled window a
      // quarter of the way along and the loose one hangs off your cursor
      // a quarter of the way along too, rather than jumping to centre.
      const grip = rect.w ? (e.clientX - rect.x) / rect.w : 0.5;
      start = {
        w: restoreRect.w,
        h: restoreRect.h,
        x: Math.round(e.clientX - restoreRect.w * grip),
        y: Math.round(e.clientY - 16),
      };
      onUntile(start);
    }

    drag.current = { px: e.clientX, py: e.clientY, start };
    setBusy(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    onGeometry({
      ...d.start,
      x: d.start.x + e.clientX - d.px,
      y: d.start.y + e.clientY - d.py,
    });
  }

  function beginResize(e: ReactPointerEvent<HTMLDivElement>, edge: Edge) {
    e.stopPropagation();
    onFocus();
    resize.current = { px: e.clientX, py: e.clientY, start: rect, edge };
    setBusy(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveResize(e: ReactPointerEvent<HTMLDivElement>) {
    const r = resize.current;
    if (!r) return;
    onGeometry(resizeRect(r.start, r.edge, e.clientX - r.px, e.clientY - r.py));
  }

  function endPointer(e: ReactPointerEvent<HTMLDivElement>) {
    drag.current = null;
    resize.current = null;
    setBusy(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  /* -- open, close, restore ---------------------------------------- */

  // Opening: the very first render, and coming back from minimised.
  useEffect(() => {
    const el = frame.current;
    if (!el || minimized) {
      wasMinimized.current = minimized;
      return;
    }

    const restored = wasMinimized.current;
    wasMinimized.current = false;

    const first = !opened.current;
    opened.current = true;

    if (!first && !restored) return;

    el.getAnimations().forEach((a) => a.cancel());
    if (prefersStillness()) return;

    el.animate(
      [
        { opacity: 0, transform: "scale(0.985) translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: MOTION.open, easing: EASE_OUT },
    );
  }, [minimized]);

  // Closing and minimising play the same exit; only what happens afterwards
  // differs, and the caller decides that. Minimising used to skip this
  // entirely and just vanish.
  useEffect(() => {
    if (!leaving) return;
    const el = frame.current;
    if (!el || prefersStillness()) {
      left.current();
      return;
    }
    el.getAnimations().forEach((a) => a.cancel());
    const run = el.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "scale(0.97) translateY(14px)" },
      ],
      { duration: MOTION.close, easing: EASE_IN, fill: "forwards" },
    );
    run.onfinish = () => left.current();
  }, [leaving]);

  /* -- render ------------------------------------------------------ */

  // The new-terminal button floats over the top-left of the workspace. A
  // window whose corner lands under it gives the title some room rather
  // than having it clipped — which is every window once tiling kicks in.
  const underLauncher = rect.x < 48 && rect.y < 80;

  return (
    <div
      ref={shell}
      hidden={minimized}
      onPointerDown={onFocus}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex: z,
        // No easing while a pointer is driving it, or dragging lags behind
        // the cursor by the length of the transition.
        transition: busy ? "none" : undefined,
      }}
      className={`terminal-window fixed flex-col ${minimized ? "hidden" : "flex"}`}
    >
      <div
        ref={frame}
        className={`flex min-h-0 flex-1 flex-col border bg-glass ${
          focused ? "border-accent/60" : "border-line"
        }`}
      >
        <div
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            onToggleTiled();
          }}
          className={`flex shrink-0 select-none items-center justify-between gap-4 border-b border-line py-2 pr-4 ${
            underLauncher ? "pl-14" : "pl-4"
          } ${interactive && !tiled ? "md:cursor-grab md:active:cursor-grabbing" : ""}`}
        >
          <span
            className="min-w-0 truncate"
            style={{ color: focused ? tone : "var(--muted)" }}
          >
            {windowTitle}
          </span>

          <div className="flex shrink-0 items-center gap-3">
            <Clock />
            <span aria-hidden="true" className="hidden h-4 w-px bg-line md:block" />
            <div className="flex items-center gap-1">
              <WindowButton label="Minimise" onClick={onMinimise}>
                <MinimizeIcon />
              </WindowButton>
              <WindowButton
                label={tiled ? "Leave fullscreen" : "Fullscreen"}
                onClick={onToggleTiled}
              >
                {tiled ? <RestoreIcon /> : <MaximizeIcon />}
              </WindowButton>
              <WindowButton label="Close terminal" onClick={onClose} danger>
                <CloseIcon />
              </WindowButton>
            </div>
          </div>
        </div>

        {children}
      </div>

      {/* Resize grips. Tiled windows are sized by the layout, not by hand. */}
      {interactive && !tiled
        ? EDGES.map((edge) => (
            <div
              key={edge}
              onPointerDown={(e) => beginResize(e, edge)}
              onPointerMove={moveResize}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              style={{ ...HANDLE[edge], position: "absolute", cursor: CURSOR[edge] }}
              className="z-10"
            />
          ))
        : null}
    </div>
  );
}
