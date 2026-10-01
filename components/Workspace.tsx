"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampRect,
  MAX_TERMINALS,
  NARROW,
  spawnRect,
  tile,
  workArea,
  type Rect,
} from "@/lib/workspace";
import PageMeta from "./PageMeta";
import Taskbar, { type TaskItem } from "./Taskbar";
import TerminalSession from "./TerminalSession";
import TerminalWindow from "./TerminalWindow";

/**
 * The desktop.
 *
 * Owns the terminals, their geometry, which one has focus, and which of them
 * are tiled. Each window wraps its own session, so two terminals can be
 * showing different things at once.
 *
 * A minimised window is hidden, never unmounted — unmounting would throw
 * away its transcript and whichever section was open.
 */

/** Each terminal keeps one, so you can tell them apart at a glance. */
const TONES = [
  "var(--accent)",
  "var(--ok)",
  "var(--link)",
  "var(--meta)",
  "var(--gold)",
  "var(--bronze)",
];

type Leaving = "minimize" | "close";

type Term = {
  id: number;
  /** Where it sits when it isn't tiled. Kept while it is, so pulling it
   *  back out returns it to the size it had. */
  rect: Rect;
  tiled: boolean;
  minimized: boolean;
  /** Playing its exit animation, on its way to one of those two ends. */
  leaving: Leaving | null;
  tone: string;
};

export default function Workspace() {
  const [area, setArea] = useState<Rect | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [focus, setFocus] = useState(0);
  /** Terminal ids, back to front. Stacking is this order, not a counter —
   *  a counter climbs forever and would eventually outrank the two bars. */
  const [order, setOrder] = useState<number[]>([]);

  const nextId = useRef(0);
  const booted = useRef(false);

  /* -- the space windows live in ----------------------------------- */

  useEffect(() => {
    function measure() {
      setArea(workArea(window.innerWidth, window.innerHeight));
      setNarrow(window.innerWidth < NARROW);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // A smaller viewport can leave a window somewhere unreachable.
  useEffect(() => {
    if (!area) return;
    setTerms((list) => list.map((t) => ({ ...t, rect: clampRect(t.rect, area) })));
  }, [area]);

  /* -- opening ----------------------------------------------------- */

  const open = useCallback(() => {
    if (!area) return;
    setTerms((list) => {
      if (list.length >= MAX_TERMINALS) return list;
      const id = ++nextId.current;
      // Focus and stacking follow the new window, but setting them from
      // inside an updater would fire twice under StrictMode.
      queueMicrotask(() => {
        setFocus(id);
        setOrder((o) => [...o, id]);
      });
      return [
        ...list,
        {
          id,
          rect: spawnRect(id - 1, area),
          // A new window joins whatever the others are already doing.
          tiled: list.some((t) => t.tiled),
          minimized: false,
          leaving: null,
          tone: TONES[(id - 1) % TONES.length],
        },
      ];
    });
  }, [area]);

  useEffect(() => {
    if (!area || booted.current) return;
    booted.current = true;
    open();
  }, [area, open]);

  /* -- focus, leaving, tiling -------------------------------------- */

  const focusTerm = useCallback((id: number) => {
    setFocus(id);
    setOrder((o) => [...o.filter((x) => x !== id), id]);
    setTerms((list) => list.map((t) => (t.id === id ? { ...t, minimized: false } : t)));
  }, []);

  /** Both exits play the same animation; only the ending differs. */
  const startLeave = useCallback((id: number, how: Leaving) => {
    setTerms((list) => list.map((t) => (t.id === id ? { ...t, leaving: how } : t)));
  }, []);

  const finishLeave = useCallback((id: number, how: Leaving | null) => {
    if (how === "close") {
      setOrder((o) => o.filter((x) => x !== id));
      setTerms((list) => {
        const next = list.filter((t) => t.id !== id);
        queueMicrotask(() => setFocus((f) => (f === id ? (next[next.length - 1]?.id ?? 0) : f)));
        return next;
      });
      return;
    }
    setTerms((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: null, minimized: true } : t)),
    );
  }, []);

  /** Fullscreen is all-or-nothing, whichever window you press it on. */
  const toggleTiled = useCallback((id: number) => {
    setTerms((list) => {
      const next = !list.find((t) => t.id === id)?.tiled;
      return list.map((t) => ({ ...t, tiled: next }));
    });
  }, []);

  /**
   * Dragging a tiled window's title bar pulls that one out of the layout,
   * the way a snapped window comes loose. The rest stay tiled and close up
   * the gap between them.
   */
  const untile = useCallback(
    (id: number, rect: Rect) => {
      if (!area) return;
      const fixed = clampRect(rect, area);
      setTerms((list) => list.map((t) => (t.id === id ? { ...t, tiled: false, rect: fixed } : t)));
    },
    [area],
  );

  const setRect = useCallback(
    (id: number, rect: Rect) => {
      if (!area) return;
      const fixed = clampRect(rect, area);
      setTerms((list) => list.map((t) => (t.id === id ? { ...t, rect: fixed } : t)));
    },
    [area],
  );

  /* -- the running figure's cue ------------------------------------ */

  const showing = terms.filter((t) => !t.minimized && !t.leaving).length;

  useEffect(() => {
    document.documentElement.dataset.window = showing ? "open" : "clear";
  }, [showing]);

  /* -- render ------------------------------------------------------ */

  const canOpen = terms.length < MAX_TERMINALS;

  if (!area) return <PageMeta />;

  // Only tiled, unminimised windows take a slot. One on its way out keeps
  // its place until it has finished leaving, so it doesn't jump first.
  const inLayout = terms.filter((t) => t.tiled && !t.minimized);
  const slot = new Map(inLayout.map((t, i) => [t.id, i]));

  const items: TaskItem[] = terms
    .filter((t) => t.leaving !== "close")
    .map((t, i) => ({
      id: t.id,
      label: `Terminal ${i + 1}`,
      minimized: t.minimized,
      focused: t.id === focus,
      tone: t.tone,
    }));

  return (
    <>
      <PageMeta />

      {/* Its own button on the desktop rather than a control in the bar.
          Above the windows so it can't be buried, but it takes clicks, so
          it sits clear of where windows open. */}
      <button
        type="button"
        onClick={open}
        disabled={!canOpen}
        aria-label="Open a new terminal"
        title={canOpen ? "Open a new terminal" : "That's as many terminals as this will take"}
        className="new-terminal"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" focusable="false">
          <path d="M5.5 0V11M0 5.5H11" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      {terms.map((term) => {
        const isTiled = term.tiled && !term.minimized;
        return (
          <TerminalWindow
            key={term.id}
            rect={isTiled ? tile(slot.get(term.id) ?? 0, inLayout.length, area, narrow) : term.rect}
            restoreRect={term.rect}
            z={10 + Math.max(0, order.indexOf(term.id))}
            tone={term.tone}
            focused={term.id === focus}
            tiled={isTiled}
            minimized={term.minimized}
            leaving={term.leaving !== null}
            interactive={!narrow}
            onFocus={() => focusTerm(term.id)}
            onGeometry={(r) => setRect(term.id, r)}
            onUntile={(r) => untile(term.id, r)}
            onMinimise={() => startLeave(term.id, "minimize")}
            onToggleTiled={() => toggleTiled(term.id)}
            onClose={() => startLeave(term.id, "close")}
            onLeft={() => finishLeave(term.id, term.leaving)}
          >
            <TerminalSession active={term.id === focus} />
          </TerminalWindow>
        );
      })}

      <Taskbar
        items={items}
        tiled={inLayout.length > 0}
        onPick={focusTerm}
        onNew={open}
        canOpen={canOpen}
      />
    </>
  );
}
