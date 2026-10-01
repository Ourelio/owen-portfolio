"use client";

import { useEffect, useRef } from "react";
import { eggs } from "@/lib/content";
import { moon } from "@/lib/moon";

/**
 * The running figure, and the forest he's running through.
 *
 * Everything is drawn on one low-resolution canvas that fills the viewport
 * and is upscaled by a whole-number factor with image-rendering: pixelated,
 * so the chunkiness is real pixels rather than a small shape with hard
 * edges.
 *
 * The figure's x-position is locked and the scenery scrolls past him. That
 * ordering matters: a fixed forest behind a figure running on the spot
 * reads as a treadmill, which is the one thing this sprite was meant not to
 * look like. Move the world instead and he reads as covering ground.
 *
 * Layers, back to front: distant trees, near trees, the path, things beside
 * the path, the figure, then a little grass in front of him.
 */

/* ------------------------------------------------------------------ */
/* The figure                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sprite detail. The skeleton below is authored against a 56x80 grid; this
 * scales that grid up so a big background figure still gets reasonably fine
 * pixels.
 */
const SS = 1.5;

const FW = Math.round(56 * SS); // the figure's own drawing surface
const FH = Math.round(80 * SS);

/** How far down the figure's box its feet land, so it can stand on ground. */
const SOLE = 101;

const PERIOD = 450; // one full two-step stride, in ms
const ARM_OFFSET = -0.375; // how far each arm runs behind its own-side leg
const RAD = Math.PI / 180;

const HIP = { x: 29 * SS, y: 42 * SS };
const TORSO_LEN = 15 * SS;
const TORSO_TILT = 8; // degrees of forward lean
const HEAD_R = 5.5 * SS;
const THIGH_LEN = 12 * SS;
const SHIN_LEN = 12 * SS;
const FOOT_LEN = 4 * SS;
const UPPER_LEN = 9 * SS;
const FORE_LEN = 8 * SS;

/*
 * Stroke widths are a touch slimmer than a small ambient sprite would use.
 * Filling the page, a 9-wide torso's round cap swallows the head and the
 * two legs merge into one mass at the hip; at 7 the head clears the cap and
 * the legs stay separate.
 */
const WIDE_TORSO = 7 * SS;
const WIDE_LEG = 4.5 * SS;
const WIDE_ARM = 4 * SS;
const WIDE_FOOT = 4 * SS;
const HAND_R = 2.6 * SS;
const BOB = 2.6 * SS;

const LEG_SPLIT = 2.5 * SS;
const ARM_SPLIT = 2.8 * SS;
const HEAD_FWD = 1.2 * SS;
const HEAD_LEAN = 0.6 * SS;
const NECK = 3.2 * SS;

/**
 * Eight hand-set poses per cycle: contact, loading, stance, toe-off,
 * heel kick, knee drive, peak drive, reach.
 *
 * Thigh and upper arm: positive swings forward. Knee and elbow: positive is
 * flexion. The knee's hardest bend (105) lands on the recovery swing, and
 * the elbow never reaches 0, so the arm can't windmill.
 */
const THIGH = [22, 5, -10, -28, -14, 18, 38, 34];
const KNEE = [18, 32, 22, 30, 95, 105, 78, 38];
const UPPER = [18, 8, -8, -24, -34, -24, -6, 10];
const ELBOW = [100, 92, 82, 72, 68, 76, 88, 96];

/* ------------------------------------------------------------------ */
/* The forest                                                          */
/* ------------------------------------------------------------------ */

/** One repeat of scenery, in scene pixels. Wider than any sane viewport. */
const BAND = 340;

/** Where the ground sits, as a fraction of the canvas height. */
const GROUND = 0.78;

/** Scene pixels per second, per layer. Depth is speed. */
const SPEED = {
  stars: 1.5,
  cloud: 3,
  city: 4,
  far: 9,
  mid: 22,
  path: 58,
  near: 58,
  front: 86,
};

/**
 * How present each layer is. The figure is the only thing at full weight.
 *
 * These were tuned when everything was one colour, where low alpha read as
 * depth. With a palette it just reads as washed out, so they're higher —
 * the centre haze is what keeps the scene off the text, not faintness.
 */
/**
 * How far each depth is washed toward the sky, 0 near and 1 gone.
 *
 * This used to be per-layer alpha, which is why nothing occluded anything:
 * a tree at 0.52 let the building behind it show straight through and the
 * whole scene read as glass. Solid things are drawn opaque now and distance
 * is carried by colour — atmospheric perspective, the way a painter does
 * it. Only actual light (coronas, lamp bloom) stays translucent.
 */
const DEPTH = {
  star: 0.08,
  cloud: 0.1,
  city: 0.58,
  window: 0.12,
  far: 0.4,
  mid: 0.16,
  path: 0.18,
  near: 0.05,
  front: 0,
  sun: 0.08,
  moonLit: 0.05,
  moonDim: 0.66,
};

/** Neighbouring trees of one colour merge into a blob, so each gets a
 *  slightly different wash and stays its own shape. */
const SHADES = 5;
const SHADE_SPREAD = 0.055;

/**
 * Where the sun or moon hangs, as a fraction of the canvas, and how big
 * each is. They no longer cross the sky on a timer: light mode is daytime
 * and dark mode is night, so the theme decides which one is up.
 *
 * Out to the right, clear of the haze across the middle where the terminal
 * sits, and clear of the figure.
 */
const SKY = { x: 0.8, y: 0.22, sunR: 8, moonR: 13 };

/** Enough drift that it isn't a sticker on the glass, not enough to watch. */
const DRIFT = { x: 2.6, y: 2.1, xRate: 0.21, yRate: 0.17 };

type Point = { x: number; y: number };
type RGB = [number, number, number];

/**
 * Custom properties come back from getPropertyValue exactly as authored, so
 * the theme tokens arrive as hex while cs.color arrives as rgb(). Both have
 * to work here.
 */
function parseRGB(c: string): RGB {
  const v = c.trim();

  if (v.startsWith("#")) {
    const hex = v.length === 4 ? v.slice(1).replace(/./g, (d) => d + d) : v.slice(1, 7);
    const n = parseInt(hex, 16);
    return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const parts = v.match(/-?[\d.]+/g);
  return parts && parts.length >= 3 ? [+parts[0], +parts[1], +parts[2]] : [128, 128, 128];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/**
 * One colour per thing in the scene, already washed for its distance.
 * Trees and towers get a small ramp of shades so neighbours separate.
 */
type Palette = {
  figure: string;
  star: string;
  cloud: string;
  cloudShade: string;
  city: string[];
  window: string;
  treeFar: string[];
  treeMid: string[];
  grass: string;
  path: string;
  rock: string;
  lamp: string;
  glow: string;
  sun: string;
  moonLit: string;
  moonDim: string;
  hair: string;
  skin: string;
  scarf: string;
  coat: string;
  rose: string;
  /** Light mode is daytime, dark mode is night. */
  night: boolean;
};
type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

/** `h` is the whole tree; the trunk is the bottom third. `kind` 0 is a
 *  conifer, 1 is a rounder one. */
type Tree = { x: number; h: number; w: number; kind: 0 | 1; shade: number };
type Mark = { x: number; y: number; w: number };

type Star = {
  x: number;
  /** Height as a fraction of the sky, so it holds at any canvas size. */
  y: number;
  size: number;
  bright: number;
  /** How much it flickers, and where in that flicker it starts. Most
   *  don't flicker at all — a whole sky of them would be a fairground. */
  flicker: number;
  phase: number;
};
/** One lobe of a cloud. `dy` counts up from the cloud's flat base. */
type Puff = { dx: number; dy: number; r: number };

type Cloud = {
  x: number;
  /** Height as a fraction of the sky, so it holds at any canvas size. */
  y: number;
  /** A mass built from lobes, or — for a cirrus — nothing, and `streaks`
   *  instead. The two are never both set. */
  puffs: Puff[];
  /** Thin horizontal lines with no body to them: `[dx, dy, length]`. */
  streaks: [number, number, number][];
  /** How many rows along the bottom sit in shadow. */
  shade: number;
  /** How far it reaches above its base, negative. Kept so the draw loop
   *  doesn't re-derive it, and so a cloud can be held off the top edge —
   *  one clipped flat against it stops reading as a cloud. */
  top: number;
  /** Its own share of the wind, so the sky doesn't move in one sheet. */
  rate: number;
  phase: number;
};

type Prop =
  | { x: number; kind: "rock"; w: number; h: number }
  | { x: number; kind: "grass"; w: number; h: number }
  | { x: number; kind: "bench"; w: number; h: number }
  | { x: number; kind: "lamp"; w: number; h: number };

/** A tower on the skyline. Windows are precomputed so the draw loop
 *  doesn't have to roll dice sixty times a second. */
type Building = {
  x: number;
  w: number;
  h: number;
  /** A narrower section stepped in on top, 0 for a flat roof. */
  cap: number;
  capW: number;
  spire: number;
  shade: number;
  windows: { x: number; y: number }[];
};

/** Deterministic, so the forest is the same forest on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTrees(
  seed: number,
  count: number,
  minH: number,
  maxH: number,
  minW: number,
  maxW: number,
): Tree[] {
  const r = rng(seed);
  const out: Tree[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.floor(r() * BAND),
      h: Math.round(minH + r() * (maxH - minH)),
      w: Math.round(minW + r() * (maxW - minW)),
      kind: r() < 0.62 ? 0 : 1,
      shade: Math.floor(r() * SHADES),
    });
  }
  return out;
}

/**
 * The Little Prince, sat on the moon with his rose. Seven pixels across and
 * nine tall, which at this scale is about as small as a figure can be and
 * still read as one — so the hair, the scarf and the rose each get their
 * own colour to do the identifying.
 *
 * H hair, K face, S scarf (trailing left, the way it's always drawn),
 * C coat, L legs over the edge, R the rose.
 */
const PRINCE = [
  "...HHHH....",
  "..HHHHHH...",
  "..HKKKK....",
  "...KKKK....",
  "....KK.....",
  "...SSSS....",
  "SSSSCCC....",
  ".SS.CCCC...",
  "....CCCCR..",
  "....CCCC.G.",
  "....CCCC...",
  "....CCCC...",
  ".....LLLL..",
  ".......LL..",
];

/** How many rows of him hang down over the face of the moon. */
const PRINCE_OVERLAP = 3;

/** Scattered thicker toward the top of the sky than down by the rooftops. */
function makeStars(seed: number, count: number): Star[] {
  const r = rng(seed);
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.floor(r() * BAND),
      y: r() ** 1.6,
      size: r() < 0.1 ? 2 : 1,
      bright: 0.35 + r() * 0.65,
      flicker: r() < 0.35 ? 0.16 + r() * 0.2 : 0,
      phase: r() * Math.PI * 2,
    });
  }
  return out;
}

/**
 * Daytime's answer to the stars.
 *
 * Four shapes, not one puff repeated: a heap sprawling along a flat base,
 * a stack piled up and leaning, a lone tuft, and streaks with no body at
 * all. A sky of identical clouds is wallpaper, and you read it as wallpaper
 * within a second of looking at it.
 */
function makeClouds(seed: number, count: number): Cloud[] {
  const r = rng(seed);
  const out: Cloud[] = [];

  for (let i = 0; i < count; i++) {
    const puffs: Puff[] = [];
    const streaks: [number, number, number][] = [];
    const kind = r();

    if (kind < 0.22) {
      // Cirrus: a few streaks at slightly different heights, each its own
      // length. Nothing to shade, since there's no underside to it.
      const n = 2 + Math.floor(r() * 2);
      for (let j = 0; j < n; j++) {
        streaks.push([
          Math.floor(r() * 16) - 8,
          -j * 2 - Math.floor(r() * 2),
          7 + Math.floor(r() * 14),
        ]);
      }
    } else if (kind < 0.4) {
      // A tuft off on its own, sometimes with a smaller one trailing it.
      const rad = 3 + Math.floor(r() * 2);
      puffs.push({ dx: 0, dy: -(rad - 1), r: rad });
      if (r() < 0.6) puffs.push({ dx: rad + 1, dy: -(rad - 2), r: rad - 1 });
    } else if (kind < 0.62) {
      // A stack: piled up rather than spread out. The base is two wide
      // lobes, because a column of shrinking ones reads as a pillar.
      puffs.push({ dx: -4, dy: -4, r: 5 });
      puffs.push({ dx: 4, dy: -4, r: 5 });
      const n = 2 + Math.floor(r() * 2);
      let lift = 5;
      let lean = 0;
      for (let j = 0; j < n; j++) {
        const rad = Math.max(2, 5 - j + Math.floor(r() * 2));
        puffs.push({ dx: lean, dy: -(lift + rad - 2), r: rad });
        lift += Math.max(2, rad - 2);
        lean += Math.floor(r() * 7) - 3;
      }
    } else {
      // A heap: lobes along the base with one of them taller, which is
      // what stops it reading as a row of equal bumps.
      const n = 3 + Math.floor(r() * 3);
      const peak = 1 + Math.floor(r() * Math.max(1, n - 2));
      let dx = 0;
      for (let j = 0; j < n; j++) {
        const rad = (j === peak ? 5 : 3) + Math.floor(r() * 3);
        puffs.push({ dx, dy: -(rad - 1), r: rad });
        dx += Math.max(2, Math.round(rad * (0.9 + r() * 0.5)));
      }
    }

    let top = 0;
    for (const p of puffs) top = Math.min(top, p.dy - p.r);
    for (const [, dy] of streaks) top = Math.min(top, dy);

    out.push({
      x: Math.floor(r() * BAND),
      // High in the sky, with the lowest few clipping the rooftops.
      y: 0.05 + r() * 0.3,
      puffs,
      streaks,
      top,
      shade: streaks.length ? 0 : 1 + Math.floor(r() * 2),
      rate: 0.8 + r() * 0.44,
      phase: r() * Math.PI * 2,
    });
  }
  return out;
}

/**
 * The skyline behind the park. Far enough back that it barely drifts, and
 * the reason the trees have something to stand in front of.
 */
function makeCity(seed: number, count: number): Building[] {
  const r = rng(seed);
  const out: Building[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * BAND);
    const w = 9 + Math.floor(r() * 17);
    // Capped so there is real sky above the skyline. Only the tallest few
    // reach the moon at all, and then only its lower edge — which reads as
    // a moon low over the city rather than as one that's been swallowed.
    const h = 40 + Math.floor(r() * 28);
    const cap = r() < 0.45 ? 4 + Math.floor(r() * 7) : 0;
    const capW = Math.max(4, Math.round(w * (0.4 + r() * 0.3)));
    const spire = cap && r() < 0.5 ? 4 + Math.floor(r() * 5) : 0;

    const windows: { x: number; y: number }[] = [];
    for (let wy = 5; wy < h - 5; wy += 5) {
      for (let wx = 2; wx < w - 3; wx += 4) {
        if (r() < 0.34) windows.push({ x: wx, y: wy });
      }
    }

    out.push({ x, w, h, cap, capW, spire, shade: Math.floor(r() * SHADES), windows });
  }
  return out;
}

/** The path: scattered dashes rather than a drawn line, so it stays vague. */
function makePath(seed: number): Mark[] {
  const r = rng(seed);
  const out: Mark[] = [];
  for (let i = 0; i < 58; i++) {
    out.push({
      x: Math.floor(r() * BAND),
      y: Math.floor(r() * 7),
      w: 3 + Math.floor(r() * 11),
    });
  }
  return out;
}

/** Tufts and stones in the strip of ground nearest the viewer. */
function makeFront(seed: number): Mark[] {
  const r = rng(seed);
  const out: Mark[] = [];
  for (let i = 0; i < 46; i++) {
    out.push({
      x: Math.floor(r() * BAND),
      y: 3 + Math.floor(r() * 20), // below the ground line, toward the viewer
      w: 1 + Math.floor(r() * 4),
    });
  }
  return out;
}

function makeProps(seed: number): Prop[] {
  const r = rng(seed);
  const out: Prop[] = [];

  // Two lamps a band, roughly spaced, so one drifts past every so often.
  for (let i = 0; i < 2; i++) {
    out.push({
      x: Math.floor((i + 0.2 + r() * 0.5) * (BAND / 2)),
      kind: "lamp",
      w: 2,
      h: 30 + Math.floor(r() * 12),
    });
  }
  for (let i = 0; i < 16; i++) {
    out.push({ x: Math.floor(r() * BAND), kind: "rock", w: 3 + Math.floor(r() * 5), h: 2 + Math.floor(r() * 3) });
  }
  for (let i = 0; i < 30; i++) {
    out.push({ x: Math.floor(r() * BAND), kind: "grass", w: 1, h: 2 + Math.floor(r() * 4) });
  }
  // A park needs somewhere to sit.
  for (let i = 0; i < 3; i++) {
    out.push({
      x: Math.floor(r() * BAND),
      kind: "bench",
      w: 11 + Math.floor(r() * 5),
      h: 7 + Math.floor(r() * 2),
    });
  }
  return out;
}

/* Sparse on purpose. A wall of trunks reads as a skyline, and the figure
   has to stay the thing you look at. */
const STARS = makeStars(5, 155);
const CLOUDS = makeClouds(19, 15);
/* Each cloud goes to forBand on its own, because each moves at its own
   share of the wind — one shared offset would slide the whole sky as a
   single sheet, and the band has to wrap per speed to stay seamless. */
const CLOUD_SOLO: Cloud[][] = CLOUDS.map((c) => [c]);
const CITY = makeCity(7, 11);
/* Shorter than the towers on purpose. The park sits in front of the city,
   so if the trees out-top the skyline there is no skyline to see. */
const FAR_TREES = makeTrees(11, 13, 24, 44, 11, 19);
const MID_TREES = makeTrees(29, 7, 40, 66, 17, 29);
const PATH = makePath(47);
const PROPS = makeProps(83);
const FRONT = makeFront(127);

function drawBuilding(g: CanvasRenderingContext2D, x: number, groundY: number, b: Building) {
  g.fillRect(x, groundY - b.h, b.w, b.h);
  if (b.cap) {
    g.fillRect(Math.round(x + (b.w - b.capW) / 2), groundY - b.h - b.cap, b.capW, b.cap);
  }
  if (b.spire) {
    g.fillRect(Math.round(x + b.w / 2) - 1, groundY - b.h - b.cap - b.spire, 2, b.spire);
  }
}

/** Drawn as their own layer, so the lights can be brighter than the walls. */
function drawWindows(g: CanvasRenderingContext2D, x: number, groundY: number, b: Building) {
  const top = groundY - b.h;
  for (const win of b.windows) g.fillRect(x + win.x, top + win.y, 2, 2);
}

/** A conifer: rows of pixels widening toward the base. */
function conifer(g: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number) {
  const rows = Math.max(4, Math.round(h / 4));
  const rowH = h / rows;
  for (let i = 0; i < rows; i++) {
    const t = (i + 1) / rows;
    const rw = Math.max(1, Math.round(w * (0.16 + 0.84 * t)));
    g.fillRect(
      Math.round(cx - rw / 2),
      Math.round(baseY - h + i * rowH),
      rw,
      Math.ceil(rowH) + 1,
    );
  }
}

/** A rounder tree: an ellipse of pixel rows. */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const rows = Math.max(4, Math.round(h / 4));
  const rowH = h / rows;
  for (let i = 0; i < rows; i++) {
    const t = (i + 0.5) / rows;
    const rw = Math.max(1, Math.round(w * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2))));
    g.fillRect(
      Math.round(cx - rw / 2),
      Math.round(cy - h / 2 + i * rowH),
      rw,
      Math.ceil(rowH) + 1,
    );
  }
}

function drawTree(g: CanvasRenderingContext2D, x: number, groundY: number, t: Tree) {
  const trunkH = Math.max(4, Math.round(t.h * 0.3));
  const canopyH = t.h - trunkH;
  g.fillRect(x, groundY - trunkH, 2, trunkH);
  if (t.kind === 0) conifer(g, x + 1, groundY - trunkH + 3, t.w, canopyH);
  else blob(g, x + 1, groundY - trunkH - canopyH / 2 + 3, t.w, canopyH);
}

/** A filled circle built from pixel rows, so it stays blocky. */
function pixelDisc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (dx <= 0) continue;
    g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2, 1);
  }
}

/**
 * A cloud, filled row by row rather than lobe by lobe.
 *
 * Each row takes the outer edges of whatever lobes reach it, so a handful
 * of circles comes out as one bumpy silhouette with a flat bottom — a
 * cloud — instead of a clump of overlapping balls. The rows stop at the
 * base, which is what flattens the underside.
 */
function drawCloud(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  cloud: Cloud,
  body: string,
  shade: string,
) {
  if (cloud.streaks.length) {
    for (const [dx, dy, len] of cloud.streaks) {
      g.fillStyle = body;
      g.fillRect(x + dx, y + dy, len, 1);
      // A thinner tail in the shade colour, so a streak has a direction.
      g.fillStyle = shade;
      g.fillRect(x + dx + len, y + dy, Math.max(1, Math.round(len * 0.25)), 1);
    }
    return;
  }

  for (let dy = cloud.top; dy <= 0; dy++) {
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const p of cloud.puffs) {
      const d = dy - p.dy;
      const half = Math.floor(Math.sqrt(Math.max(0, p.r * p.r - d * d)));
      if (half <= 0) continue;
      if (p.dx - half < x0) x0 = p.dx - half;
      if (p.dx + half > x1) x1 = p.dx + half;
    }
    if (x1 < x0) continue;
    g.fillStyle = dy > -cloud.shade ? shade : body;
    g.fillRect(x + x0, y + dy, x1 - x0, 1);
  }
}

/**
 * A sun. The rays matter: a bare disc in a monochrome scene reads as a
 * moon, and the top bar is already reporting one of those.
 */
function drawSun(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  body: string,
  pulse: number,
) {
  // Corona stays translucent — it's light, not an object — and breathes a
  // little so the sun isn't a sticker.
  g.fillStyle = body;
  for (const [rr, a] of [
    [r * 2.7, 0.06],
    [r * 1.9, 0.08],
    [r * 1.35, 0.11],
  ] as const) {
    g.globalAlpha = a;
    pixelDisc(g, cx, cy, Math.round(rr * pulse));
  }
  g.globalAlpha = 1;

  const gap = r + 4;
  const len = Math.max(3, Math.round(r * 0.55));

  // Four square rays.
  g.fillRect(cx - 1, cy - gap - len, 2, len);
  g.fillRect(cx - 1, cy + gap, 2, len);
  g.fillRect(cx - gap - len, cy - 1, len, 2);
  g.fillRect(cx + gap, cy - 1, len, 2);

  // Four on the diagonals, stepped rather than drawn as sloped lines.
  const d = Math.round(gap * 0.707);
  const steps = Math.max(2, Math.round(len * 0.707));
  for (const [sx, sy] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    for (let i = 0; i < steps; i++) {
      g.fillRect(cx + sx * (d + i), cy + sy * (d + i), 2, 2);
    }
  }

  pixelDisc(g, cx, cy, r);
}

/**
 * The moon, lit to whatever phase it actually is tonight — the same figure
 * the top bar is reporting, so the sky and the bar never disagree.
 *
 * The terminator is an ellipse, so for each row of pixels it cuts the disc
 * at k times that row's half-width, where k runs from 1 at new moon to -1
 * at full. The unlit part is still drawn, faintly, or a new moon would look
 * like a bug rather than a new moon.
 */
function drawMoon(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  phase: number,
  lit: string,
  dim: string,
  pal: Palette,
) {
  g.fillStyle = lit;
  g.globalAlpha = 0.06;
  pixelDisc(g, cx, cy, Math.round(r * 1.9));
  g.globalAlpha = 0.08;
  pixelDisc(g, cx, cy, Math.round(r * 1.3));
  g.globalAlpha = 1;

  // The unlit side is a dim disc rather than a transparent one, so the moon
  // is a solid object the skyline can pass in front of.
  g.fillStyle = dim;
  pixelDisc(g, cx, cy, r);
  g.fillStyle = lit;

  const k = Math.cos(2 * Math.PI * phase);
  const waxing = phase < 0.5;

  for (let dy = -r; dy <= r; dy++) {
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (half < 0.5) continue;
    const edge = k * half;
    const from = waxing ? edge : -half;
    const to = waxing ? half : -edge;
    const width = to - from;
    if (width < 0.6) continue;
    g.fillRect(Math.round(cx + from), Math.round(cy + dy), Math.max(1, Math.round(width)), 1);
  }

  // Someone lives up there. He sits on the rim, so his legs hang two rows
  // down over the face of it.
  const ink: Record<string, string> = {
    H: pal.hair,
    K: pal.skin,
    S: pal.scarf,
    C: pal.coat,
    L: pal.coat,
    R: pal.rose,
    G: pal.grass,
  };

  const left = Math.round(cx) - 5;
  const top = Math.round(cy - r) + PRINCE_OVERLAP - PRINCE.length;

  for (let row = 0; row < PRINCE.length; row++) {
    for (let col = 0; col < PRINCE[row].length; col++) {
      const key = PRINCE[row][col];
      if (key === ".") continue;
      g.fillStyle = ink[key];
      g.fillRect(left + col, top + row, 1, 1);
    }
  }
}

/** Same idea as pixelDisc, squashed — for light pooling on the ground. */
function pixelEllipse(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) {
  for (let dy = -ry; dy <= ry; dy++) {
    const k = 1 - (dy / ry) ** 2;
    if (k <= 0) continue;
    const dx = Math.floor(rx * Math.sqrt(k));
    if (dx <= 0) continue;
    g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2, 1);
  }
}

function drawProp(
  g: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  p: Prop,
  pal: Palette,
) {
  if (p.kind === "grass") {
    g.fillStyle = pal.grass;
    g.fillRect(x, groundY - p.h, p.w, p.h);
    return;
  }
  if (p.kind === "rock") {
    g.fillStyle = pal.rock;
    g.fillRect(x, groundY - p.h, p.w, p.h);
    g.fillRect(x + 1, groundY - p.h - 1, Math.max(1, p.w - 2), 1);
    return;
  }
  if (p.kind === "bench") {
    g.fillStyle = pal.path;
    const top = groundY - p.h;
    g.fillRect(x, top + 3, p.w, 2); // seat
    g.fillRect(x, top - 1, p.w, 2); // back rail
    g.fillRect(x + 1, top - 1, 1, 5); // arms up to the back
    g.fillRect(x + p.w - 2, top - 1, 1, 5);
    g.fillRect(x + 1, top + 5, 1, p.h - 5); // legs
    g.fillRect(x + p.w - 2, top + 5, 1, p.h - 5);
    return;
  }

  // A lamp post, because a light in a wood is a nice thing to run past.
  const headY = groundY - p.h;

  // Bloom first, so the lamp itself sits on top of it. Discs rather than
  // squares, stacking into a falloff toward the middle.
  g.fillStyle = pal.glow;
  const cx = x + p.w / 2;
  const cy = headY - 2;
  for (const [r, a] of [
    [34, 0.045],
    [26, 0.06],
    [19, 0.09],
    [13, 0.13],
    [8, 0.2],
    [4, 0.3],
  ] as const) {
    g.globalAlpha = a;
    pixelDisc(g, cx, cy, r);
  }

  // A shaft down toward the ground, narrow at the lamp and spreading out.
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    g.globalAlpha = 0.05 * (1 - t) + 0.015;
    const half = 3 + i * 3;
    const top = cy + (groundY - cy) * t;
    const step = (groundY - cy) / 5;
    g.fillRect(Math.round(cx - half), Math.round(top), half * 2, Math.ceil(step) + 1);
  }

  // And the pool it throws on the path.
  g.globalAlpha = 0.09;
  pixelEllipse(g, cx, groundY + 1, 20, 5);
  g.globalAlpha = 0.14;
  pixelEllipse(g, cx, groundY + 1, 12, 3);
  g.globalAlpha = 1;

  g.fillStyle = pal.lamp;
  g.fillRect(x, headY, p.w, p.h); // post
  g.fillRect(x - 1, groundY - 1, p.w + 2, 1); // base

  // The bulb itself is the light, not the fitting.
  g.fillStyle = pal.glow;
  g.fillRect(x - 2, headY - 4, p.w + 4, 4);
}

/* ------------------------------------------------------------------ */
/* Gait maths                                                          */
/* ------------------------------------------------------------------ */

/** Catmull-Rom through the keyframes, wrapping around the loop. */
function sampleLoop(keys: number[], t: number): number {
  const n = keys.length;
  const x = ((((t % 1) + 1) % 1)) * n;
  const i = Math.floor(x);
  const f = x - i;
  const p0 = keys[(i - 1 + n) % n];
  const p1 = keys[i % n];
  const p2 = keys[(i + 1) % n];
  const p3 = keys[(i + 2) % n];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
  );
}

/** Angle 0 points straight down; positive rotates toward +x, the way it faces. */
function seg(p: Point, deg: number, len: number): Point {
  const a = deg * RAD;
  return { x: p.x + len * Math.sin(a), y: p.y + len * Math.cos(a) };
}

function polyline(g: CanvasRenderingContext2D, pts: Point[], width: number) {
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.stroke();
}

function dot(g: CanvasRenderingContext2D, p: Point, r: number) {
  g.beginPath();
  g.arc(p.x, p.y, r, 0, Math.PI * 2);
  g.fill();
}

function drawLeg(g: CanvasRenderingContext2D, origin: Point, t: number) {
  const thigh = sampleLoop(THIGH, t);
  const knee = sampleLoop(KNEE, t);
  const shinA = thigh - knee; // flexion swings the shin backward
  const kneeP = seg(origin, thigh, THIGH_LEN);
  const ankleP = seg(kneeP, shinA, SHIN_LEN);
  const toeP = seg(ankleP, shinA + 80, FOOT_LEN);
  polyline(g, [origin, kneeP, ankleP], WIDE_LEG);
  polyline(g, [ankleP, toeP], WIDE_FOOT);
}

function drawArm(g: CanvasRenderingContext2D, origin: Point, t: number) {
  const upper = sampleLoop(UPPER, t);
  const elbow = sampleLoop(ELBOW, t);
  const foreA = upper + elbow; // flexion swings the hand forward and up
  const elbowP = seg(origin, upper, UPPER_LEN);
  const handP = seg(elbowP, foreA, FORE_LEN);
  polyline(g, [origin, elbowP, handP], WIDE_ARM);
  dot(g, handP, HAND_R);
}

/** Snap antialiased edges to hard pixels, so it reads as a sprite not a blur. */
function crisp(layer: Layer) {
  const img = layer.ctx.getImageData(0, 0, FW, FH);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  layer.ctx.putImageData(img, 0, 0);
}

function makeLayer(): Layer {
  const canvas = document.createElement("canvas");
  canvas.width = FW;
  canvas.height = FH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return { canvas, ctx };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Runner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const far = makeLayer();
    const near = makeLayer();

    // One reusable surface for compositing each depth of scenery.
    const scratch = (() => {
      const el = document.createElement("canvas");
      return { canvas: el, ctx: el.getContext("2d")! };
    })();

    let w = 0;
    let h = 0;
    /** Quiets the scenery across the middle, where the terminal sits. */
    let haze: CanvasGradient | null = null;
    let groundY = 0;
    let figureX = 0;
    let figureY = 0;

    /** Whole-number upscale, sized so the figure is most of the page. */
    function layout() {
      const scale = Math.max(3, Math.min(10, Math.floor((window.innerHeight * 0.8) / FH)));
      w = Math.ceil(window.innerWidth / scale);
      h = Math.ceil(window.innerHeight / scale);

      canvas!.width = w;
      canvas!.height = h;
      canvas!.style.width = `${w * scale}px`;
      canvas!.style.height = `${h * scale}px`;
      ctx!.imageSmoothingEnabled = false;

      scratch.canvas.width = w;
      scratch.canvas.height = h;
      scratch.ctx.imageSmoothingEnabled = false;

      // Detail behind text is what made the window feel stacked on top of
      // the forest. Thin the trees out across the middle instead, and let
      // the margins carry the scene. Reads as haze in the middle distance.
      const centre = window.innerWidth >= 900 ? 0.18 : 0.5;
      haze = scratch.ctx.createLinearGradient(0, 0, w, 0);
      haze.addColorStop(0, "rgba(0,0,0,1)");
      haze.addColorStop(0.19, "rgba(0,0,0,0.94)");
      haze.addColorStop(0.35, `rgba(0,0,0,${centre + 0.12})`);
      haze.addColorStop(0.5, `rgba(0,0,0,${centre})`);
      haze.addColorStop(0.65, `rgba(0,0,0,${centre + 0.12})`);
      haze.addColorStop(0.81, "rgba(0,0,0,0.94)");
      haze.addColorStop(1, "rgba(0,0,0,1)");

      groundY = Math.round(h * GROUND);
      figureX = Math.round(w / 2 - FW / 2);
      figureY = groundY - SOLE;

      // So the speech bubble can find the top of his head.
      // On :root, not on the wrapper: the bubble lives outside the runner
      // layer now, so it needs these from somewhere both can reach.
      const root = document.documentElement.style;
      root.setProperty("--head-top", `${(figureY + 13) * scale}px`);
      root.setProperty("--head-left", `${(figureX + FW * 0.62) * scale}px`);
    }

    // Reading a computed colour every frame is wasteful; every so often is
    // enough to pick up a theme change.
    /** Everything the scene is painted with, read from the theme tokens and
     *  pre-washed toward the page so distance is baked into the colour. */
    function readPalette(): Palette {
      const cs = getComputedStyle(canvas!);
      const pick = (name: string) => parseRGB(cs.getPropertyValue(name).trim() || cs.color);
      const sky = parseRGB(getComputedStyle(document.body).backgroundColor);
      const far = (c: RGB, d: number) => css(mix(c, sky, d));
      const ramp = (c: RGB, d: number) =>
        Array.from({ length: SHADES }, (_, i) =>
          far(c, Math.min(0.94, Math.max(0, d + (i - (SHADES - 1) / 2) * SHADE_SPREAD))),
        );

      return {
        figure: cs.color,
        star: far(pick("--s-star"), DEPTH.star),
        cloud: far(pick("--s-cloud"), DEPTH.cloud),
        cloudShade: far(pick("--s-cloud-shade"), DEPTH.cloud),
        city: ramp(pick("--s-city"), DEPTH.city),
        window: far(pick("--s-window"), DEPTH.window),
        treeFar: ramp(pick("--s-tree-far"), DEPTH.far),
        treeMid: ramp(pick("--s-tree-mid"), DEPTH.mid),
        grass: far(pick("--s-grass"), DEPTH.near),
        path: far(pick("--s-path"), DEPTH.path),
        rock: far(pick("--s-rock"), DEPTH.near),
        lamp: far(pick("--s-lamp"), DEPTH.near),
        glow: far(pick("--s-glow"), DEPTH.near),
        sun: far(pick("--s-sun"), DEPTH.sun),
        moonLit: far(pick("--s-moon"), DEPTH.moonLit),
        moonDim: far(pick("--s-moon"), DEPTH.moonDim),
        hair: far(pick("--s-hair"), 0),
        skin: far(pick("--s-skin"), 0),
        scarf: far(pick("--s-scarf"), 0),
        coat: far(pick("--s-coat"), 0),
        rose: far(pick("--s-rose"), 0),
        night: cs.getPropertyValue("--sky-night").trim() === "1",
      };
    }

    let cachedPalette = readPalette();
    let colorTick = 0;
    const palette = () => {
      if (colorTick++ % 15 === 0) cachedPalette = readPalette();
      return cachedPalette;
    };

    // The phase shifts about a degree an hour, so once every few seconds
    // is far more often than it needs.
    let cachedPhase = moon().phase;
    let phaseTick = 0;
    const tonight = () => {
      if (phaseTick++ % 300 === 0) cachedPhase = moon().phase;
      return cachedPhase;
    };

    /** Repeat a band of scenery across the viewport, in screen coordinates. */
    function forBand<T extends { x: number }>(
      items: T[],
      offset: number,
      draw: (x: number, item: T) => void,
    ) {
      const shift = ((offset % BAND) + BAND) % BAND;
      for (let base = -shift - BAND; base < w + BAND; base += BAND) {
        for (const item of items) {
          const x = Math.round(base + item.x);
          if (x < -70 || x > w + 70) continue;
          draw(x, item);
        }
      }
    }

    function drawFigure(s: number, color: string) {
      const nearLeg = s;
      const farLeg = s + 0.5;
      const nearArm = s + ARM_OFFSET;
      const farArm = s + 0.5 + ARM_OFFSET;

      // The body rises toward each float phase, twice per cycle, and the
      // lean breathes in step with it.
      const lift = (1 + Math.cos(4 * Math.PI * (s - 0.44))) / 2;
      const tilt = TORSO_TILT + 1.5 * Math.sin(4 * Math.PI * (s - 0.44));

      const hipP = { x: HIP.x, y: HIP.y - BOB * lift };
      const shoulderP = {
        x: hipP.x + TORSO_LEN * Math.sin(tilt * RAD),
        y: hipP.y - TORSO_LEN * Math.cos(tilt * RAD),
      };
      const headP = {
        x: shoulderP.x + HEAD_FWD + HEAD_LEAN * Math.sin(tilt * RAD),
        y: shoulderP.y - HEAD_R - NECK,
      };

      // Far side: one layer, knocked back in tone once it's complete, so
      // overlapping joints can't double up in alpha.
      far.ctx.clearRect(0, 0, FW, FH);
      far.ctx.strokeStyle = color;
      far.ctx.fillStyle = color;
      drawLeg(far.ctx, { x: hipP.x - LEG_SPLIT, y: hipP.y }, farLeg);
      drawArm(far.ctx, { x: shoulderP.x - ARM_SPLIT, y: shoulderP.y }, farArm);
      crisp(far);

      // Torso, head and the near side.
      near.ctx.clearRect(0, 0, FW, FH);
      near.ctx.strokeStyle = color;
      near.ctx.fillStyle = color;
      polyline(near.ctx, [hipP, shoulderP], WIDE_TORSO);
      dot(near.ctx, headP, HEAD_R);
      drawLeg(near.ctx, { x: hipP.x + LEG_SPLIT, y: hipP.y }, nearLeg);
      drawArm(near.ctx, { x: shoulderP.x + ARM_SPLIT, y: shoulderP.y }, nearArm);
      crisp(near);

      ctx!.globalAlpha = 0.5;
      ctx!.drawImage(far.canvas, figureX, figureY);
      ctx!.globalAlpha = 1;
      ctx!.drawImage(near.canvas, figureX, figureY);
    }

    /**
     * Fade the finished scenery across the middle of the screen, where the
     * terminal sits, then lay it down in one piece.
     *
     * Applied to the whole composite rather than per layer: the elements
     * have already occluded each other correctly by then, so this dims the
     * group without making them see-through against one another.
     */
    function layDown() {
      const g = scratch.ctx;
      g.globalCompositeOperation = "destination-in";
      g.fillStyle = haze!;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "source-over";
      ctx!.drawImage(scratch.canvas, 0, 0);
    }

    /** One frame: `seconds` drives the scenery, `s` the stride. */
    function frame(seconds: number, s: number) {
      const pal = palette();
      const g = scratch.ctx;

      ctx!.clearRect(0, 0, w, h);
      g.clearRect(0, 0, w, h);
      g.globalAlpha = 1;

      // Everything behind him goes onto one surface, back to front and
      // opaque, so each thing genuinely covers what it stands in front of.

      // Light mode is daytime, dark mode is night, so the theme decides
      // which is up rather than a clock. Both drift on a slow lissajous —
      // small enough that you only notice if you watch, enough that it
      // isn't a sticker. Drawn before everything, which is what lets the
      // skyline pass in front.
      const driftX = Math.sin(seconds * DRIFT.xRate) * DRIFT.x;
      const driftY = Math.cos(seconds * DRIFT.yRate) * DRIFT.y;
      const skyX = Math.round(w * SKY.x + driftX);
      const skyY = Math.round(h * SKY.y + driftY);

      // Night is night, so the stars are simply out.
      if (pal.night) {
        forBand(STARS, seconds * SPEED.stars, (x, star) => {
          const twinkle = star.flicker
            ? 1 - star.flicker + star.flicker * Math.sin(seconds * 1.7 + star.phase)
            : 1;
          const lit = star.bright * twinkle;
          const y = Math.round(star.y * groundY);

          // A soft block behind the core, so each one has a little glow
          // rather than being a bare dot.
          g.fillStyle = pal.star;
          g.globalAlpha = lit * 0.22;
          g.fillRect(x - 1, y - 1, star.size + 2, star.size + 2);

          // The bigger ones get a sparkle across them.
          if (star.size > 1) {
            g.globalAlpha = lit * 0.3;
            g.fillRect(x - 2, y, star.size + 4, 1);
            g.fillRect(x, y - 2, 1, star.size + 4);
          }

          g.globalAlpha = lit;
          g.fillRect(x, y, star.size, star.size);
        });
        g.globalAlpha = 1;
      }

      if (pal.night) {
        drawMoon(g, skyX, skyY, SKY.moonR, tonight(), pal.moonLit, pal.moonDim, pal);
      } else {
        drawSun(g, skyX, skyY, SKY.sunR, pal.sun, 1 + 0.07 * Math.sin(seconds * 0.9));
      }

      // What the stars are to the night. After the sun, so one can pass in
      // front of it, and before the city, so the towers cut into them.
      if (!pal.night) {
        for (const solo of CLOUD_SOLO) {
          const cloud = solo[0];
          forBand(solo, seconds * SPEED.cloud * cloud.rate, (x) => {
            // A slow bob on top of the drift. Two pixels, which is nothing
            // until you notice the sky isn't rigid.
            const y = Math.round(
              Math.max(
                1 - cloud.top,
                cloud.y * groundY + Math.sin(seconds * 0.11 + cloud.phase) * 1.6,
              ),
            );
            drawCloud(g, x, y, cloud, pal.cloud, pal.cloudShade);
          });
        }
      }

      // Manhattan behind the park. Barely moves, being that far off.
      forBand(CITY, seconds * SPEED.city, (x, bld) => {
        g.fillStyle = pal.city[bld.shade];
        drawBuilding(g, x, groundY, bld);
      });
      g.fillStyle = pal.window;
      forBand(CITY, seconds * SPEED.city, (x, bld) => drawWindows(g, x, groundY, bld));

      forBand(FAR_TREES, seconds * SPEED.far, (x, t) => {
        g.fillStyle = pal.treeFar[t.shade];
        drawTree(g, x, groundY, t);
      });
      forBand(MID_TREES, seconds * SPEED.mid, (x, t) => {
        g.fillStyle = pal.treeMid[t.shade];
        drawTree(g, x, groundY, t);
      });

      g.fillStyle = pal.path;
      forBand(PATH, seconds * SPEED.path, (x, m) => g.fillRect(x, groundY + 1 + m.y, m.w, 1));
      forBand(PROPS, seconds * SPEED.near, (x, prop) => drawProp(g, x, groundY, prop, pal));

      layDown();

      // He stays in the site's own accent, so the eye still knows who the
      // subject is once the scenery has colours of its own. Drawn straight
      // onto the canvas, so the haze doesn't touch him.
      drawFigure(s, pal.figure);

      // A strip of ground between him and you, moving fastest of all.
      g.clearRect(0, 0, w, h);
      g.globalAlpha = 1;
      g.fillStyle = pal.grass;
      forBand(FRONT, seconds * SPEED.front, (x, m) =>
        g.fillRect(x, groundY + m.y, m.w, 1 + (m.w > 3 ? 1 : 0)),
      );
      layDown();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let clock = 0;
    let last: number | null = null;

    function tick(now: number) {
      if (last === null) last = now;
      clock += now - last;
      last = now;
      frame(clock / 1000, (clock % PERIOD) / PERIOD);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(raf);
      layout();
      if (reduce.matches) {
        frame(3.4, 0.75); // one held mid-stride pose, in a settled bit of forest
        return;
      }
      last = null;
      raf = requestAnimationFrame(tick);
    }

    start();
    window.addEventListener("resize", start);
    reduce.addEventListener("change", start);

    // Held still, a theme change would otherwise never repaint.
    const themed = new MutationObserver(() => {
      colorTick = 0;
      if (reduce.matches) frame(3.4, 0.75);
    });
    themed.observe(document.documentElement, { attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", start);
      reduce.removeEventListener("change", start);
      themed.disconnect();
    };
  }, []);

  return (
    <>
      <div className="runner" ref={wrapRef} aria-hidden="true">
        <canvas ref={canvasRef} className="runner-canvas" />
      </div>

      {/* Outside the runner layer, which is z-index 0 and would trap it
          behind every window. */}
      <span className="runner-bubble" aria-hidden="true">
        {eggs.runner}
      </span>
    </>
  );
}
