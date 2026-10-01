/**
 * A fake filesystem, built from lib/content.ts.
 *
 * Nothing here executes anything. It exists so manual mode has something
 * shaped like a shell to walk around in, and so the file listing can never
 * disagree with what the sections actually are.
 */

import { ctfChallenges, eggs, projects, sections, writeups } from "./content";

export type FsNode =
  | { kind: "file"; name: string; hidden?: boolean }
  | { kind: "dir"; name: string; children: FsNode[] };

const txt = (slug: string): FsNode => ({ kind: "file", name: `${slug}.txt` });

/** What's inside each directory section, keyed by its path. */
const dirChildren: Record<string, FsNode[]> = {
  writeups: writeups.map((w) => txt(w.slug)),
  projects: projects.map((p) => txt(p.slug)),
  challenges: ctfChallenges.map((c) => txt(c.slug)),
};

export const home: FsNode[] = [
  { kind: "file", name: eggs.curiousGeorgeFile, hidden: true },
  ...sections.map<FsNode>((s) =>
    s.kind === "dir"
      ? { kind: "dir", name: s.path, children: dirChildren[s.path] ?? [] }
      : { kind: "file", name: s.path },
  ),
];

/* ------------------------------------------------------------------ */
/* Paths                                                               */
/* ------------------------------------------------------------------ */

/** A location is the list of directory names below home. `[]` is home. */
export type Cwd = string[];

export function cwdLabel(cwd: Cwd): string {
  return cwd.length ? `~/${cwd.join("/")}` : "~";
}

/**
 * Turn whatever the visitor typed into a list of path segments below home.
 * Returns null if the path climbs above home.
 */
export function resolve(cwd: Cwd, arg: string): string[] | null {
  const raw = arg.trim();
  const absolute = raw.startsWith("~") || raw.startsWith("/");
  const start = absolute ? [] : [...cwd];
  const parts = raw.replace(/^[~/]+/, "").split("/").filter(Boolean);

  const out = start;
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (!out.length) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out;
}

/** Walk to a node. Returns the node, or null if the path doesn't exist. */
export function lookup(path: string[]): FsNode | null {
  if (!path.length) return { kind: "dir", name: "~", children: home };

  let level = home;
  for (let i = 0; i < path.length; i++) {
    const found: FsNode | undefined = level.find((n) => n.name === path[i]);
    if (!found) return null;
    if (i === path.length - 1) return found;
    if (found.kind !== "dir") return null;
    level = found.children;
  }
  return null;
}

export function listDir(path: string[], showHidden = false): FsNode[] {
  const node = lookup(path);
  if (!node || node.kind !== "dir") return [];
  return node.children.filter((n) => showHidden || !(n.kind === "file" && n.hidden));
}
