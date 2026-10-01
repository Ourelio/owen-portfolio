/**
 * Geometry for the desktop: where windows open, how far they can be
 * dragged, and how they tile when the workspace goes fullscreen.
 *
 * Pure functions on plain numbers, so the tiling can be reasoned about
 * without a browser anywhere near it.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/** Small enough to be useful, big enough that the sidebar still fits. */
export const MIN_W = 340;
export const MIN_H = 260;

export const TOP_BAR = 30;
export const BOTTOM_BAR = 34;

/** The title bar has to stay grabbable, so it's never dragged off-screen. */
export const TITLE_BAR = 38;
/** How much of a window must stay on screen horizontally. */
const KEEP = 130;

/** More than this and each one is too small to read. */
export const MAX_TERMINALS = 6;

/** Below this, floating windows are more nuisance than feature. */
export const NARROW = 768;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** The strip between the two bars that windows live in. */
export function workArea(vw: number, vh: number): Rect {
  return {
    x: 0,
    y: TOP_BAR,
    w: vw,
    h: Math.max(MIN_H, vh - TOP_BAR - BOTTOM_BAR),
  };
}

/**
 * Tiled layout: the first window takes the left half at full height, and
 * everything after it stacks down the right half. Two windows is a plain
 * 50/50 split; three is one big one and two halves beside it.
 *
 * On a narrow screen there's no room for columns, so they become rows.
 */
export function tile(index: number, count: number, area: Rect, narrow = false): Rect {
  if (count <= 1) return { ...area };

  if (narrow) {
    const rowH = Math.floor(area.h / count);
    const y = area.y + index * rowH;
    const h = index === count - 1 ? area.y + area.h - y : rowH;
    return { x: area.x, y, w: area.w, h };
  }

  const half = Math.round(area.w / 2);
  if (index === 0) return { x: area.x, y: area.y, w: half, h: area.h };

  const stacked = count - 1;
  const slot = index - 1;
  const rowH = Math.floor(area.h / stacked);
  const y = area.y + slot * rowH;
  const h = slot === stacked - 1 ? area.y + area.h - y : rowH;

  return { x: area.x + half, y, w: area.w - half, h };
}

/** Where a brand new window lands: roughly centred, then cascaded. */
export function spawnRect(seq: number, area: Rect): Rect {
  const w = Math.min(980, Math.max(Math.min(MIN_W, area.w), Math.round(area.w * 0.72)));
  const h = Math.min(700, Math.max(Math.min(MIN_H, area.h), Math.round(area.h * 0.86)));

  const step = 28;
  const nudge = (seq % 5) * step - 2 * step;

  // Cascade, but never off the edge: on a narrow screen the window is
  // nearly as wide as the area, and the offset would push it out of view.
  return {
    w,
    h,
    x: clamp(Math.round(area.x + (area.w - w) / 2) + nudge, area.x, area.x + area.w - w),
    y: clamp(Math.round(area.y + (area.h - h) / 2) + nudge, area.y, area.y + area.h - h),
  };
}

/** Keeps a window reachable after a drag, a resize, or a viewport change. */
export function clampRect(r: Rect, area: Rect): Rect {
  const w = Math.max(Math.min(MIN_W, area.w), Math.min(r.w, area.w));
  const h = Math.max(Math.min(MIN_H, area.h), Math.min(r.h, area.h));

  return {
    w,
    h,
    x: clamp(r.x, area.x - w + KEEP, area.x + area.w - KEEP),
    y: clamp(r.y, area.y, area.y + area.h - TITLE_BAR),
  };
}

/** Which edges a resize handle pulls. */
export type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const EDGES: Edge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/** Apply a drag on one handle, honouring the minimum size. */
export function resizeRect(start: Rect, edge: Edge, dx: number, dy: number): Rect {
  let { x, y, w, h } = start;

  if (edge.includes("e")) w = start.w + dx;
  if (edge.includes("s")) h = start.h + dy;
  if (edge.includes("w")) {
    w = start.w - dx;
    x = start.x + dx;
  }
  if (edge.includes("n")) {
    h = start.h - dy;
    y = start.y + dy;
  }

  // Pulling a left or top edge past the minimum must pin the far edge,
  // not carry on moving the window.
  if (w < MIN_W) {
    if (edge.includes("w")) x = start.x + (start.w - MIN_W);
    w = MIN_W;
  }
  if (h < MIN_H) {
    if (edge.includes("n")) y = start.y + (start.h - MIN_H);
    h = MIN_H;
  }

  return { x, y, w, h };
}
