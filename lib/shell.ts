/**
 * The command engine for manual mode.
 *
 * Nothing is executed — every command is pattern-matched and answered from
 * lib/content.ts. Unknown input never dead-ends: it gets a guess and a
 * button to run that guess.
 */

import {
  Block,
  eggs,
  findSection,
  findWriteup,
  identity,
  projectBlocks,
  projects,
  sections,
  writeupBlocks,
  writeupTitle,
  writeups,
} from "./content";
import { Cwd, cwdLabel, listDir, lookup, resolve } from "./filesystem";

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

export type Output =
  | { kind: "prompt"; cwd: string; command: string }
  | { kind: "blocks"; blocks: Block[] }
  | { kind: "lines"; lines: string[] }
  | { kind: "muted"; lines: string[] }
  | { kind: "ls"; entries: { name: string; dir: boolean; run: string }[] }
  | { kind: "choices"; lead?: string; items: { label: string; run: string }[] }
  | { kind: "help"; rows: { cmd: string; desc: string }[] };

export type Result = {
  outputs: Output[];
  cwd?: Cwd;
  clear?: boolean;
  switchMode?: "guided";
};

/* ------------------------------------------------------------------ */
/* Welcome                                                             */
/* ------------------------------------------------------------------ */

export const welcome: Output[] = [
  {
    kind: "lines",
    lines: [
      "You're in manual mode. Type something and press Enter, or click one of",
      "the buttons under the input — they do exactly the same thing.",
    ],
  },
  { kind: "lines", lines: [""] },
  {
    kind: "muted",
    lines: [
      "ls shows what's here. help lists everything you can type. Nothing",
      "you do in here can break anything.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const COMMANDS = ["help", "ls", "cat", "cd", "pwd", "clear", "contact", "guided", "whoami", "sudo"];

const HELP_ROWS = [
  { cmd: "ls", desc: "see what's in the folder you're in" },
  { cmd: "cat <file>", desc: "read a file, like cat about.txt" },
  { cmd: "cd <folder>", desc: "go into a folder, cd .. comes back out" },
  { cmd: "pwd", desc: "show where you are right now" },
  { cmd: "clear", desc: "wipe the screen" },
  { cmd: "contact", desc: "how to reach me, from anywhere" },
  { cmd: "guided", desc: "switch to clicking through instead" },
  { cmd: "help", desc: "this list" },
];

function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[n];
}

/** Every word that would do something, paired with the command to run. */
function vocabulary(cwd: Cwd): { word: string; run: string }[] {
  const out: { word: string; run: string }[] = [];
  for (const c of COMMANDS) out.push({ word: c, run: c });
  for (const s of sections) {
    out.push({ word: s.command, run: s.command });
    out.push({ word: s.path, run: s.kind === "dir" ? `ls ${s.path}` : `cat ${s.path}` });
    if (s.kind === "file") out.push({ word: s.path.replace(/\.txt$/, ""), run: s.command });
  }
  for (const w of writeups) {
    out.push({ word: `${w.slug}.txt`, run: `cat writeups/${w.slug}.txt` });
    out.push({ word: w.slug, run: `cat writeups/${w.slug}.txt` });
  }
  for (const p of projects) {
    out.push({ word: `${p.slug}.txt`, run: `cat projects/${p.slug}.txt` });
    out.push({ word: p.slug, run: `cat projects/${p.slug}.txt` });
  }
  for (const n of listDir(cwd)) out.push({ word: n.name, run: n.kind === "dir" ? `cd ${n.name}` : `cat ${n.name}` });
  return out;
}

/** The friendly version of "command not found". */
function nearest(input: string | undefined, cwd: Cwd): Output[] {
  const needle = (input ?? "").toLowerCase();
  let best: { word: string; run: string } | null = null;
  let bestScore = Infinity;

  for (const cand of vocabulary(cwd)) {
    const w = cand.word.toLowerCase();
    const score = w.startsWith(needle) || needle.startsWith(w) ? 0.5 : distance(needle, w);
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  const threshold = Math.max(3, Math.floor(needle.length / 2));
  if (best && bestScore <= threshold) {
    return [
      { kind: "lines", lines: [`I don't know "${input}".`] },
      { kind: "choices", lead: "Did you mean:", items: [{ label: best.run, run: best.run }] },
      { kind: "muted", lines: ["Or try help to see everything."] },
    ];
  }

  return [
    { kind: "lines", lines: [`I don't know "${input}", and I can't guess what you meant.`] },
    {
      kind: "choices",
      lead: "These always work:",
      items: [
        { label: "help", run: "help" },
        { label: "ls", run: "ls" },
        { label: "about", run: "about" },
      ],
    },
  ];
}

function fileOutput(path: string[]): Output[] | null {
  const name = path[path.length - 1];
  const dir = path.length > 1 ? path[path.length - 2] : null;

  if (name === eggs.curiousGeorgeFile) {
    return [{ kind: "lines", lines: [eggs.curiousGeorge] }];
  }
  if (dir === "writeups") {
    const w = findWriteup(name.replace(/\.txt$/, ""));
    return w ? [{ kind: "blocks", blocks: writeupBlocks(w) }] : null;
  }
  if (dir === "projects") {
    const p = projects.find((x) => x.slug === name.replace(/\.txt$/, ""));
    return p ? [{ kind: "blocks", blocks: projectBlocks(p) }] : null;
  }
  const section = sections.find((s) => s.path === name);
  return section ? [{ kind: "blocks", blocks: section.blocks }] : null;
}

/**
 * Commands printed for the visitor to click have to work from wherever
 * they'll be run, so they're written relative to `from` — the directory
 * that will be current once this output lands.
 */
function writeupChoices(from: Cwd): Output {
  const inside = from.length === 1 && from[0] === "writeups";
  return {
    kind: "choices",
    lead: "Pick one to read it:",
    items: writeups.map((w) => ({
      label: writeupTitle(w),
      run: inside ? `cat ${w.slug}.txt` : `cat writeups/${w.slug}.txt`,
    })),
  };
}

function dirOutput(path: string[], from: Cwd): Output[] {
  const label = path.join("/");
  if (label === "writeups") {
    const section = sections.find((s) => s.id === "writeups")!;
    return [{ kind: "blocks", blocks: section.blocks }, writeupChoices(from)];
  }
  if (label === "projects") {
    const section = sections.find((s) => s.id === "projects")!;
    return [{ kind: "blocks", blocks: section.blocks }];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Suggestion chips                                                    */
/* ------------------------------------------------------------------ */

/** Never empty. Manual mode has to be completable by clicking alone. */
export function chipsFor(cwd: Cwd): string[] {
  if (cwd.length) return ["ls", ...listDir(cwd).map((n) => (n.kind === "dir" ? `cd ${n.name}` : `cat ${n.name}`)), "cd ..", "help"];
  return ["help", "ls", "about", "writeups", "projects", "contact", "guided"];
}

/* ------------------------------------------------------------------ */
/* The one entry point                                                 */
/* ------------------------------------------------------------------ */

export function run(raw: string, cwd: Cwd): Result {
  const input = raw.trim();
  const echo: Output = { kind: "prompt", cwd: cwdLabel(cwd), command: input };
  const reply = (outputs: Output[], extra: Partial<Result> = {}): Result => ({
    outputs: [echo, ...outputs],
    ...extra,
  });

  if (!input) return { outputs: [echo] };

  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const flags = args.filter((a) => a.startsWith("-"));
  const operands = args.filter((a) => !a.startsWith("-"));

  /* -- easter eggs ------------------------------------------------- */

  if (cmd === "sudo") return reply([{ kind: "lines", lines: [eggs.sudo] }]);
  if (cmd === "whoami") return reply([{ kind: "lines", lines: [eggs.whoami] }]);

  /* -- mode + screen ----------------------------------------------- */

  if (cmd === "guided") {
    return reply([{ kind: "muted", lines: ["Switching you over to clicking..."] }], { switchMode: "guided" });
  }
  // A blank screen is what clear does, but a blank screen with no way out
  // is a dead end, so it keeps one line.
  if (cmd === "clear") {
    return {
      outputs: [{ kind: "muted", lines: ["Cleared. The buttons below still work, and help brings it all back."] }],
      clear: true,
    };
  }
  if (cmd === "pwd") return reply([{ kind: "lines", lines: [cwdLabel(cwd)] }]);
  if (cmd === "help") {
    return reply([
      { kind: "lines", lines: ["Everything you can type:"] },
      { kind: "help", rows: HELP_ROWS },
      { kind: "muted", lines: ["Shorthand works too — about does the same as cat about.txt:"] },
      { kind: "choices", items: sections.map((s) => ({ label: s.command, run: s.command })) },
      { kind: "muted", lines: ["None of this runs for real, so poke at anything you like."] },
    ]);
  }

  /* -- contact, from anywhere -------------------------------------- */

  if (cmd === "contact") {
    return reply([{ kind: "blocks", blocks: findSection("contact")!.blocks }]);
  }

  /* -- ls ----------------------------------------------------------- */

  if (cmd === "ls") {
    const target = operands[0] ? resolve(cwd, operands[0]) : cwd;
    if (!target) return reply([{ kind: "lines", lines: ["That's as far up as it goes — you're already home."] }]);

    const node = lookup(target);
    if (!node) return reply(nearest(operands[0], cwd));
    if (node.kind === "file") {
      return reply([
        { kind: "ls", entries: [{ name: node.name, dir: false, run: `cat ${operands[0]}` }] },
      ]);
    }

    const showHidden = flags.some((f) => f.includes("a"));
    // Relative to where the visitor is, not to home, so the buttons still
    // work after a cd.
    const prefix = operands[0] ? `${operands[0].replace(/\/+$/, "")}/` : "";
    const entries = listDir(target, showHidden).map((n) => ({
      name: n.kind === "dir" ? `${n.name}/` : n.name,
      dir: n.kind === "dir",
      run: n.kind === "dir" ? `cd ${prefix}${n.name}` : `cat ${prefix}${n.name}`,
    }));

    const out: Output[] = [{ kind: "ls", entries }];
    if (showHidden && !target.length) {
      out.push({ kind: "muted", lines: ["Something's hiding in there. Files starting with a dot stay out of the way."] });
    } else {
      out.push({ kind: "muted", lines: ["Click any of those, or type cat <name> to read one."] });
    }
    return reply(out);
  }

  /* -- cd ----------------------------------------------------------- */

  if (cmd === "cd") {
    const arg = operands[0] ?? "~";
    const target = resolve(cwd, arg);
    if (!target) {
      return reply([{ kind: "lines", lines: ["You're already home — there's nothing above it."] }], { cwd: [] });
    }

    const node = lookup(target);
    if (!node) return reply(nearest(arg, cwd));
    if (node.kind === "file") {
      return reply([
        { kind: "lines", lines: [`${arg} is a file, not a folder.`] },
        { kind: "choices", lead: "You probably want:", items: [{ label: `cat ${arg}`, run: `cat ${arg}` }] },
      ]);
    }

    const out: Output[] = [
      { kind: "muted", lines: [`Now in ${cwdLabel(target)}`] },
      ...dirOutput(target, target),
    ];
    return reply(out, { cwd: target });
  }

  /* -- cat ---------------------------------------------------------- */

  if (cmd === "cat") {
    if (!operands.length) {
      return reply([
        { kind: "lines", lines: ["cat needs a file to read."] },
        {
          kind: "choices",
          lead: "For example:",
          items: [
            { label: "cat about.txt", run: "cat about.txt" },
            { label: "cat contact.txt", run: "cat contact.txt" },
          ],
        },
      ]);
    }

    const arg = operands[0];
    const target = resolve(cwd, arg);
    if (!target || !target.length) return reply(nearest(arg, cwd));

    let node = lookup(target);
    // Be forgiving: `cat about` should find about.txt.
    if (!node) {
      const withExt = [...target];
      withExt[withExt.length - 1] = `${withExt[withExt.length - 1]}.txt`;
      node = lookup(withExt);
      if (node) target.splice(0, target.length, ...withExt);
    }
    if (!node) return reply(nearest(arg, cwd));

    if (node.kind === "dir") {
      return reply([
        { kind: "lines", lines: [`${node.name} is a folder, so there's a few things inside.`] },
        ...dirOutput(target, cwd),
        {
          kind: "choices",
          lead: "Or look through it yourself:",
          items: [{ label: `ls ${arg}`, run: `ls ${arg}` }],
        },
      ]);
    }

    const out = fileOutput(target);
    return out ? reply(out) : reply(nearest(arg, cwd));
  }

  /* -- bare shorthand: `about`, `writeups`, `minidbg.txt` ----------- */

  if (!args.length) {
    const section = sections.find((s) => s.command === cmd);
    if (section) {
      if (section.kind === "dir") {
        return reply([
          { kind: "blocks", blocks: section.blocks },
          ...(section.id === "writeups" ? [writeupChoices(cwd)] : []),
        ]);
      }
      return reply([{ kind: "blocks", blocks: section.blocks }]);
    }

    const here = resolve(cwd, cmd);
    if (here) {
      const node = lookup(here);
      if (node?.kind === "file") {
        const out = fileOutput(here);
        if (out) return reply(out);
      }
      if (node?.kind === "dir") return reply(dirOutput(here, here), { cwd: here });
    }

    if (cmd === identity.handle) {
      return reply([{ kind: "blocks", blocks: findSection("about")!.blocks }]);
    }
  }

  return reply(nearest(input, cwd));
}
