"use client";

import { useState } from "react";
import GuidedMode from "./GuidedMode";
import ManualMode from "./ManualMode";
import ModePicker from "./ModePicker";
import type { Mode } from "@/lib/modes";

/**
 * What's inside one terminal.
 *
 * Every window gets its own copy of this, so two terminals can be in
 * different modes, on different sections, with different transcripts.
 *
 * `active` gates the keyboard shortcut on the picker: without it, typing
 * "1" would open guided mode in every window at once.
 */
export default function TerminalSession({ active }: { active: boolean }) {
  const [mode, setMode] = useState<Mode>("picker");

  return (
    <>
      {mode === "picker" ? <ModePicker onPick={setMode} keyboard={active} /> : null}

      {mode === "guided" ? (
        <GuidedMode onManual={() => setMode("manual")} onHome={() => setMode("picker")} />
      ) : null}

      {mode === "manual" ? (
        <ManualMode onGuided={() => setMode("guided")} onHome={() => setMode("picker")} />
      ) : null}
    </>
  );
}
