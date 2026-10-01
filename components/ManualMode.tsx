"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import type { Cwd } from "@/lib/filesystem";
import { chipsFor, run, welcome, type Output } from "@/lib/shell";
import Blocks, { Prompt, PromptText } from "./TerminalOutput";

/**
 * Manual mode.
 *
 * A prompt, a fake filesystem and a lot of handrails: a welcome that says
 * what to do, clickable suggestions under the input, clickable output, and
 * a guess whenever something isn't recognised. You can get through the
 * whole thing without typing a character.
 */

function Chip({
  label,
  onRun,
}: {
  label: string;
  onRun: (cmd: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRun(label)}
      className="border border-line px-2.5 py-1 text-muted hover:border-accent hover:bg-tint hover:text-accent"
    >
      {label}
    </button>
  );
}

function Printed({
  out,
  onRun,
}: {
  out: Output;
  onRun: (cmd: string) => void;
}) {
  switch (out.kind) {
    case "prompt":
      return <Prompt command={out.command} cwd={out.cwd} />;

    case "blocks":
      return <Blocks blocks={out.blocks} />;

    case "lines":
    case "muted":
      return (
        <div className={out.kind === "muted" ? "text-muted" : "text-ink"}>
          {out.lines.map((line, i) => (
            <p key={i} className="max-w-[72ch] min-h-[1.65em]">
              {line}
            </p>
          ))}
        </div>
      );

    case "ls":
      return (
        <div className="flex flex-wrap gap-x-7 gap-y-1">
          {out.entries.map((e) => (
            <button
              key={e.name}
              type="button"
              onClick={() => onRun(e.run)}
              className={`hover:underline hover:underline-offset-4 ${e.dir ? "text-accent" : "text-ink hover:text-accent"}`}
            >
              {e.name}
            </button>
          ))}
        </div>
      );

    case "choices":
      return (
        <div>
          {out.lead ? <p className="text-muted">{out.lead}</p> : null}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {out.items.map((item) => (
              <button
                key={item.run + item.label}
                type="button"
                onClick={() => onRun(item.run)}
                className="border border-line px-2.5 py-1 text-ink hover:border-accent hover:bg-tint hover:text-accent"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      );

    case "help":
      return (
        <div className="grid max-w-[72ch] gap-x-6 gap-y-1 [grid-template-columns:max-content_1fr]">
          {out.rows.map((row) => (
            <Fragment key={row.cmd}>
              <span className="text-ink">{row.cmd}</span>
              <span className="text-muted">{row.desc}</span>
            </Fragment>
          ))}
        </div>
      );
  }
}

export default function ManualMode({
  onGuided,
  onHome,
}: {
  onGuided: () => void;
  onHome: () => void;
}) {
  const [outputs, setOutputs] = useState<Output[]>(welcome);
  const [cwd, setCwd] = useState<Cwd>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [outputs]);

  useEffect(() => {
    field.current?.focus();
  }, []);

  // Minimising the window is display:none, which drops the transcript's
  // scroll position. Put it back at the prompt when it reappears.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting))
        el.scrollTop = el.scrollHeight;
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  function execute(raw: string) {
    const result = run(raw, cwd);
    const trimmed = raw.trim();

    if (trimmed) setHistory((h) => [...h, trimmed]);
    setHistIdx(null);
    setInput("");

    setOutputs((prev) =>
      result.clear ? result.outputs : [...prev, ...result.outputs],
    );
    if (result.cwd) setCwd(result.cwd);
    if (result.switchMode === "guided") onGuided();

    field.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (!history.length) return;
    e.preventDefault();

    if (e.key === "ArrowUp") {
      const next =
        histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next]);
      return;
    }

    if (histIdx === null) return;
    const next = histIdx + 1;
    if (next >= history.length) {
      setHistIdx(null);
      setInput("");
    } else {
      setHistIdx(next);
      setInput(history[next]);
    }
  }

  // Clicking the transcript puts the cursor back in the input, the way
  // clicking a terminal window would. Selecting text is left alone.
  function onTranscriptClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, a")) return;
    if (window.getSelection()?.toString()) return;
    field.current?.focus();
  }

  const prefix = cwd.length ? `~/${cwd.join("/")}` : "~";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onClick={onTranscriptClick}
        className="scroller min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-6 sm:px-9 sm:py-8"
      >
        {outputs.map((out, i) => (
          <Printed key={i} out={out} onRun={execute} />
        ))}
      </div>

      <div className="shrink-0 border-t border-line px-6 py-4 sm:px-9">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute(input);
          }}
          className="flex items-baseline gap-2"
        >
          <label htmlFor="cmd" className="shrink-0">
            <PromptText cwd={prefix} />
          </label>
          <input
            id="cmd"
            ref={field}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Type a command"
            // Says what to do without anyone having to know what a prompt
            // is. Kept short so it isn't clipped on a phone.
            placeholder="type a command"
            // The prompt and the text caret already show where focus is, so
            // the usual focus ring would just draw a box round the line.
            className="min-w-0 flex-1 bg-transparent text-ink caret-accent outline-none placeholder:text-muted focus-visible:outline-none"
          />
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chipsFor(cwd).map((c) => (
            <Chip key={c} label={c} onRun={execute} />
          ))}
        </div>

        <button
          type="button"
          onClick={onHome}
          className="mt-3 text-muted hover:text-accent"
        >
          Back to the start
        </button>
      </div>
    </div>
  );
}
