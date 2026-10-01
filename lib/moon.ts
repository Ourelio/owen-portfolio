/**
 * Moon phase, worked out from the length of a lunar month.
 *
 * Accurate to within a few hours, which is plenty for a line of ambient
 * page metadata. Phase is effectively the same everywhere on Earth; only
 * the orientation of the crescent changes with latitude, and this draws
 * the conventional northern-hemisphere one.
 */

/** Mean synodic month, in days. */
const SYNODIC = 29.530588853;

/** A known new moon: 2000-01-06 18:14 UTC. */
const EPOCH = Date.UTC(2000, 0, 6, 18, 14);

export type Moon = {
  /** Days since the last new moon, 0 to ~29.53. */
  age: number;
  /** 0 is new, 0.5 is full, wrapping back to 1. */
  phase: number;
  /** Lit fraction of the disc, 0 to 1. */
  illumination: number;
  name: string;
};

function nameFor(age: number): string {
  if (age < 1.85) return "new moon";
  if (age < 5.54) return "waxing crescent";
  if (age < 9.23) return "first quarter";
  if (age < 12.91) return "waxing gibbous";
  if (age < 16.61) return "full moon";
  if (age < 20.3) return "waning gibbous";
  if (age < 23.99) return "last quarter";
  if (age < 27.68) return "waning crescent";
  return "new moon";
}

export function moon(now: Date = new Date()): Moon {
  const days = (now.getTime() - EPOCH) / 86_400_000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const phase = age / SYNODIC;
  return {
    age,
    phase,
    illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2,
    name: nameFor(age),
  };
}

/**
 * The lit part of the disc, as an SVG path in a circle of radius r centred
 * on the origin.
 *
 * The terminator is an ellipse: its x-radius shrinks to nothing at the
 * quarters and grows back to a full circle at new and full moon.
 */
export function litPath(phase: number, r: number): string {
  const k = Math.cos(2 * Math.PI * phase);
  const rx = Math.abs(k) * r;
  const waxing = phase < 0.5;

  // Which side of the disc is lit, then which way the terminator bulges.
  const outer = waxing ? 1 : 0;
  const inner = k > 0 === waxing ? 0 : 1;

  return (
    `M 0 ${-r} A ${r} ${r} 0 0 ${outer} 0 ${r}` +
    ` A ${rx.toFixed(3)} ${r} 0 0 ${inner} 0 ${-r} Z`
  );
}
