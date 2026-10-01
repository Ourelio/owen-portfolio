/**
 * The single source of truth for everything the site says.
 *
 * Both guided mode and manual mode import from here. If a piece of text
 * appears on screen anywhere, it is defined once in this file and nowhere
 * else, so the two modes can never drift apart.
 */

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/**
 * A block is one printed thing. Sections are lists of blocks, and the
 * renderer in components/TerminalOutput.tsx knows how to draw each kind.
 */
export type Block =
  | { t: "p"; text: string }
  | { t: "note"; text: string }
  | { t: "list"; items: string[] }
  | {
      t: "entry";
      title: string;
      meta?: string;
      tag?: string;
      body?: string;
      note?: string;
      link?: Link;
      /** Colours the title. For placings, not for emphasis. */
      tone?: Tone;
    }
  | { t: "org"; name: string; logo: string; roles: Role[] }
  | { t: "link"; label: string; href: string }
  | { t: "gap" };

export type Link = { label: string; href: string };

export type Tone = "gold" | "bronze" | "ok";

/** One post held at an organisation. */
export type Role = {
  title: string;
  /** "Feb 2026 – Present" */
  period: string;
  /** "8 mos" */
  span: string;
  skills?: string;
};

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const identity = {
  name: "Owen Ourelio Bong",
  handle: "wavess",
  prompt: "wavess@portfolio:~$",
  /** Swap for an <img> later; for now the avatar is just these letters. */
  initials: "OB",
  role: "Cybersecurity student, digital forensics focus",
};

/** The prompt, rewritten for wherever you currently are. */
export function promptFor(cwd = "~"): string {
  return identity.prompt.replace(/:~\$$/, `:${cwd}$`);
}

/**
 * The same prompt split into its parts, so it can be coloured the way a
 * shell colours PS1 — one tone for who and where you are, another for the
 * path, a third for the sigil.
 */
export function promptParts(cwd = "~") {
  const [host = identity.handle, tail = "~$"] = identity.prompt.split(":");
  return { host, path: cwd, sigil: tail.replace(/^~/, "") || "$" };
}

/** The window title. Derived from the prompt so the two can't drift. */
export const windowTitle = identity.prompt.replace(/\$$/, "").replace(":", ": ");

/* ------------------------------------------------------------------ */
/* Section content                                                     */
/* ------------------------------------------------------------------ */

/** Said in two places, so it's written in one. */
const DFIR_GLOSS = "DFIR — digital forensics and incident response: working out what happened on a machine after something went wrong";

const about: Block[] = [
  {
    t: "p",
    text: "Hey there, I'm Owen Ourelio Bong, also known as wavess. I'm a Cybersecurity student at BINUS University with a focus on Digital Forensics.",
  },
  {
    t: "note",
    text: "digital forensics — recovering and making sense of evidence left behind on computers",
  },
  {
    t: "p",
    text: "Throughout university, I've served as chairman of two organizations at once: Cyber Security Community, a club at my university, and PETIR, my university's official CTF team.",
  },
  {
    t: "note",
    text: "CTF — a capture the flag competition, where teams race to solve security puzzles and find hidden strings called flags",
  },
  {
    t: "p",
    text: "I'm always down to swap stories or nerd out over something I didn't know yesterday. Or I guess you could say I'm a Curious George ;) (bad joke intended).",
  },
];

const education: Block[] = [
  {
    t: "entry",
    title: "BINUS University",
    meta: "Bachelor of Computer Science, Cyber Security Program",
    tag: "GPA 3.93 / 4.00",
  },
];

const experience: Block[] = [
  {
    t: "p",
    text: "Two organizations at my university. I've ended up chairing both of them.",
  },
  { t: "gap" },
  {
    t: "org",
    name: "PETIR Cyber Security BINUS",
    logo: "/logos/petir.jpg",
    roles: [
      {
        title: "Chairman",
        period: "Feb 2026 \u2013 Present",
        span: "8 mos",
        skills: "Digital Forensics, Reverse Engineering, Malware Analysis, Memory Analysis",
      },
      {
        title: "Member, Digital Forensics focus",
        period: "Sep 2025 \u2013 Mar 2026",
        span: "7 mos",
        skills: "Digital Forensics, Reverse Engineering, Memory Analysis",
      },
      {
        title: "Apprentice",
        period: "May 2025 \u2013 Sep 2025",
        span: "5 mos",
        skills: "CTF",
      },
    ],
  },
  { t: "gap" },
  {
    t: "org",
    name: "Cyber Security Community (CSC BINUS)",
    logo: "/logos/csc.png",
    roles: [
      {
        title: "Chairman",
        period: "Oct 2025 \u2013 Present",
        span: "1 yr",
        skills:
          "Leadership management, Time management, Public Speaking, Good Organization Governance",
      },
      {
        title: "Research and Development Activist",
        period: "Feb 2025 \u2013 Mar 2026",
        span: "1 yr 2 mos",
        skills: "CTF, C (programming language)",
      },
      {
        title: "Member",
        period: "Sep 2024 \u2013 Feb 2025",
        span: "6 mos",
        skills: "C (programming language)",
      },
    ],
  },
];

/**
 * Reverse-chronological, hand-ordered. Do not sort this programmatically —
 * the order here is the order that ships.
 */
const achievements: Block[] = [
  {
    t: "entry",
    title: "1st place — ITFEST Capture The Flag Competition",
    tone: "gold",
    meta: "Institut Pertanian Bogor (IPB)",
    tag: "08/2026",
  },
  {
    t: "entry",
    title: "BINUS Future Impact Creator Award",
    tone: "gold",
    meta: "Category GOG (No Major/Minor Audit Finding) — BINUS University",
    tag: "05/2026",
  },
  {
    t: "entry",
    title: "Dean's List — Computer Science Program",
    tone: "gold",
    meta: "BINUS University, Kemanggisan",
    // TODO: month unknown, so it sits with the other 2026 entries for now.
    tag: "2026",
  },
  {
    t: "entry",
    title: "Cyber Security Community, Participant",
    meta: "DTI-CX 2026 Cyber Resilience and Defence",
  },
  {
    t: "entry",
    title: "3rd place — FINDIT Capture The Flag Competition",
    tone: "bronze",
    meta: "Universitas Gadjah Mada (UGM)",
    tag: "05/2026",
  },
  {
    t: "entry",
    title: "1st place — ARA 7.0 Capture The Flag Competition",
    tone: "gold",
    meta: "Institut Teknologi Sepuluh Nopember (ITS)",
    tag: "02/2026",
  },
  {
    t: "entry",
    title: "3rd place — INFENTRA Capture The Flag Competition",
    tone: "bronze",
    meta: "Telkom University Purwokerto",
    tag: "12/2025",
  },
  {
    t: "entry",
    title: "3rd place — ITFEST Capture The Flag Competition",
    tone: "bronze",
    meta: "Institut Pertanian Bogor (IPB)",
    tag: "08/2025",
  },
  {
    t: "entry",
    title: "Finalist — IFEST Capture The Flag Competition",
    tone: "bronze",
    meta: "Universitas Atma Jaya Yogyakarta",
    tag: "08/2025",
  },
];

const challenges: Block[] = [
  {
    t: "p",
    text: "Some of the CTF challenges I've built over the course of my degree. Most of them are DFIR focused.",
  },
  { t: "note", text: DFIR_GLOSS },
  { t: "gap" },
  {
    t: "link",
    label: "github.com/Ourelio/challenges-authored-by-me",
    href: "https://github.com/Ourelio/challenges-authored-by-me",
  },
  { t: "gap" },
  {
    t: "entry",
    title: "Reverse Engineering Problem Setter",
    meta: "CSC CTF Competition 2025, BINUS University",
    body: "Built a Unity game where players had to reverse engineer the game logic to bypass a level and retrieve the flag.",
    note: "reverse engineering — taking a finished program apart to work out how it behaves inside",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "BeeCTF Competition 2025, BINUS University",
    body: "Built a memory dump challenge requiring basic Volatility plugin usage to extract files and recover a KeePass database.",
    note: "memory dump — a frozen snapshot of everything a computer had in RAM at one moment; Volatility is the tool for reading one back",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "National Cyber Week Competition 2025, BINUS University",
    body: "Built a malware analysis challenge using PyArmor obfuscation, requiring dynamic analysis to solve. Also built a second malware analysis challenge centered on memory dump analysis.",
    note: "obfuscation — code deliberately scrambled so it is hard to read; dynamic analysis means running it and watching what it does instead",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "PETIR REGEN 2026, BINUS University",
    body: "Built a memory dump challenge requiring recovery of a 12-word mnemonic phrase from an Exodus wallet, plus analysis of RDP connection artifacts. Also built a malware challenge using a Telegram-based C2, requiring recovery of exfiltrated data, a captured-traffic challenge where the answer was the song playing through a pair of Bluetooth earbuds, and a warm-up image repair challenge to open the event.",
    note: "C2 — the server malware quietly phones home to; here it was hidden inside ordinary Telegram traffic. A capture is a saved recording of network traffic, which is what gave the song away",
  },
  {
    t: "entry",
    title: "Reverse Engineering Problem Setter",
    meta: "PETIR REGEN 2026, BINUS University",
    body: "Built a Wordle clone that had to be taken apart to win it in a single guess.",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "TECHFEST HIMTI 2026, BINUS University",
    body: "Built a DPAPI-based Windows password recovery challenge to extract a 12-word mnemonic phrase from a TrustWallet. Also built a memory forensics challenge where a piece of malware had hidden itself in RAM and had to be found, identified, and the file it encrypted recovered.",
    note: "DPAPI — the part of Windows that encrypts saved passwords for you",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "IFEST CTF 2026, Universitas Padjadjaran",
    body: "Built a malware analysis challenge involving a crash dump, requiring heap walking to recover a decryption key.",
    note: "heap walking — stepping through a program's scratch memory to find what it left lying around",
  },
  {
    t: "entry",
    title: "Digital Forensics Problem Setter",
    meta: "BeeCTF 2026, BINUS University",
    body: "Built a challenge around a recording of USB traffic, where the work was turning the raw packets back into what had been typed on the keyboard.",
    note: "a USB keyboard reports every key to the computer as it is pressed, so a recording of that traffic can be replayed back into the original typing",
  },
];

/* ------------------------------------------------------------------ */
/* The challenges themselves                                           */
/* ------------------------------------------------------------------ */

/**
 * One challenge, as players were handed it.
 *
 * The brief only — no flag, no archive password, no download link. Those
 * live in the repo, which the section links to. Several briefs are in
 * Indonesian and stay that way: that is what competitors read, and
 * translating it would be reporting something that didn't happen. `gloss`
 * says in English what the challenge asked for.
 */
export type Challenge = {
  /** Also the filename inside challenges/ and the folder in the repo. */
  slug: string;
  name: string;
  event: string;
  category: "Digital Forensics" | "Reverse Engineering";
  difficulty: "Baby" | "Medium" | "Hard";
  brief: Block[];
  gloss?: string;
};

const PETIR = "PETIR Regen 2026 — Qualification";

export const ctfChallenges: Challenge[] = [
  {
    slug: "pemanasan",
    name: "pemanasan",
    event: PETIR,
    category: "Digital Forensics",
    difficulty: "Baby",
    brief: [{ t: "p", text: "pemanasan" }],
    gloss: "“warm-up”, and the whole brief — the first challenge of the event. What came with it was one image file, and the work was getting it to open again.",
  },
  {
    slug: "lagi-dengerin-lagu-apa-mas",
    name: "lagi dengerin lagu apa mas?",
    event: PETIR,
    category: "Digital Forensics",
    difficulty: "Medium",
    brief: [
      {
        t: "p",
        text: "si mas itu lagi ngedengerin lagu pake tws bluetoothnya yang udah tua dan rusak, nah saya coba ngecapture trafficnya trus dapet. bantuin saya cari tau dong si mas sebenernya lagi dengerin lagu apasih?",
      },
    ],
    gloss: "A man is listening to music through a pair of old, failing Bluetooth earbuds. The traffic between phone and earbuds was recorded. The answer is which song was playing.",
  },
  {
    slug: "bitcoinnya-pepeng-dicuri",
    name: "bitcoinnya pepeng dicuri",
    event: PETIR,
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "si pepeng ada bitcoin nih, terus tiba-tiba bitcoinnya ilang, pepeng kebingungan, tolong bantu pepeng cari tau kok bisa bitcoinnya si pepeng tercuri. habis itu coba recover 12 mnemonic words dari platform cryptocurrencynya si pepeng.",
      },
    ],
    gloss: "Pepeng's bitcoin disappeared. Work out how it was taken, then recover the twelve-word phrase that unlocks his wallet.",
  },
  {
    slug: "kena-sudah-wakoor-rnd-kita",
    name: "kena sudah wakoor rnd kita",
    event: PETIR,
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "wakoor rnd kita lagi lagi kena malware loh, mohon coba cari tau itu malware datengnya dari mana. Coba dibalikkan file-file penting wakoor rnd. Flag ada di dalam salah satu file-file tersebut.",
      },
    ],
    gloss: "The R&D lead has caught malware again. Find where it came from, and bring back the files it took.",
  },
  {
    slug: "main-wordle",
    name: "main wordle",
    event: PETIR,
    category: "Reverse Engineering",
    difficulty: "Medium",
    brief: [
      {
        t: "p",
        text: "cara dapet flagnya that simple, menangin wordlenya dalam satu try.",
      },
    ],
    gloss: "Win the Wordle in a single guess. Guessing won't do it, so the game has to be taken apart to find where it keeps the answer.",
  },
  {
    slug: "malware-magang",
    name: "Malware Magang",
    event: "National Cyber Week 2025 — Qualification",
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "Brian slipped up again. He ran a shady “free money” program, and it turned out to be malware. His files are now fully encrypted. Can you restore them?",
      },
      {
        t: "note",
        text: "BECAREFUL WHEN ENGANGING WITH THE MALWARE! iya malware magang tapi tetep malware :(",
      },
    ],
  },
  {
    slug: "brian-lagi",
    name: "brian lagi",
    event: "National Cyber Week 2025 — Final",
    category: "Digital Forensics",
    difficulty: "Medium",
    brief: [
      {
        t: "p",
        text: "intinya nih si Mr Brian lagi download dri google, trus passwordnya disimpen di password manager. Trus si Mr Brian nih ngeencrypt password dari password managernya pake encryptor, nah tapi tapi tapi tiba tiba ngecrash. Nah intinya yuk kita balikkan apa yang dia download dan coba cari tau apa isinya.",
      },
    ],
    gloss: "Brian downloaded something and kept the password in a password manager. He then encrypted the manager's passwords, and the encryptor crashed partway. Recover what he downloaded and find out what was inside it.",
  },
  {
    slug: "sudah-lama",
    name: "sudah lama",
    event: "BeeCTF 2026 — Qualification",
    category: "Digital Forensics",
    difficulty: "Medium",
    brief: [
      {
        t: "p",
        text: "Sudah lama tidak ketemu soal seperti ini, semoga memperbanyak ilmu kalian, cemungut BeeCTF.",
      },
    ],
    gloss: "“It's been a while since a problem like this one” — the whole brief. What came with it was a recording of USB traffic, and a keyboard reports every key it sends.",
  },
  {
    slug: "gratisan-mulu-sih",
    name: "gratisan mulu sih",
    event: "IFEST CTF 2026 — Qualification",
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "Mr. Paimian is back at it again, and predictably his files have vanished. It all started when he tried to download some free mod software from a sketchy online marketplace. After reaching out directly to the seller, his files suddenly disappeared, and strange changes began taking place across his system. Can you investigate the machine and figure out exactly what happened?",
      },
      {
        t: "note",
        text: "The malware in this challenge is live and functional. Perform all analysis within a secure, isolated sandbox environment. Saya tidak mau bertanggung jawab hehe",
      },
    ],
  },
  {
    slug: "basic",
    name: "Basic",
    event: "TechFest HIMTI 2026",
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "Lets go to the basic of volatile memory. The malware hid itself, can you find the malware, find out its name, and decrypt the encrypted file? TO AVOID MISCONCEPTION, You do not have to find out where the malware came from, just find where is it, what is it, and decrypt the file 😉",
      },
    ],
  },
  {
    slug: "capek-malware-mulu",
    name: "capek malware mulu",
    event: "TechFest HIMTI 2026 — Final",
    category: "Digital Forensics",
    difficulty: "Hard",
    brief: [
      {
        t: "p",
        text: "Karena sudah kehabisan ide membuat malware, mari kita bernostalgia sejenak ke masa lalu.",
      },
      {
        t: "p",
        text: "Tuan BrianPaimien, seorang penggemar cryptocurrency, ingin kembali mengakses wallet lamanya. Sayangnya, karena sudah terlalu lama tidak digunakan, ia lupa password wallet tersebut.",
      },
      {
        t: "p",
        text: "Untungnya, Tuan Brian masih mengingat satu hal: password wallet yang digunakan persis sama dengan password akun Windows miliknya.",
      },
      {
        t: "p",
        text: "Tolong bantu Tuan Brian mendapatkan kembali akses ke wallet tersebut.",
      },
    ],
    gloss: "Brian forgot his crypto wallet password, but it was the same as his Windows account password. Get him back into the wallet.",
  },
];

export function findChallenge(slug: string): Challenge | undefined {
  return ctfChallenges.find((c) => c.slug === slug);
}

/** One challenge, printed in full. Shared by both modes. */
export function challengeBlocks(c: Challenge): Block[] {
  const blocks: Block[] = [
    {
      t: "entry",
      title: c.name,
      meta: `${c.category}, ${c.event}`,
      tag: c.difficulty,
    },
    { t: "gap" },
    ...c.brief,
  ];
  if (c.gloss) blocks.push({ t: "gap" }, { t: "note", text: c.gloss });
  return blocks;
}

const teaching: Block[] = [
  {
    t: "p",
    text: "I've taught people about CTF — again, mostly the DFIR side of it.",
  },
  { t: "note", text: DFIR_GLOSS },
  { t: "gap" },
  {
    t: "entry",
    title: "CSC Cyber Class Tutor — File Carving",
    meta: "BINUS University",
  },
  {
    t: "entry",
    title: "Digital Forensics Tutor — Memory Analysis, OS Forensics, and Malware Analysis",
    meta: "SMK 22 Jakarta",
  },
  {
    t: "entry",
    title: "Digital Forensics Tutor — File Carving",
    meta: "SMK 1 Gombong",
  },
  {
    t: "entry",
    title: "Capture The Flag Introduction Tutor",
    meta: "SMK Nu Ma'arif Kudus",
  },
  {
    t: "entry",
    title: "Digital Forensics Tutor — File Carving",
    meta: "SMKN 1 Denpasar",
  },
  { t: "gap" },
  {
    t: "note",
    text: "file carving — pulling deleted files back out of a disk by recognising how each file type starts and ends",
  },
];

const articles: Block[] = [
  {
    t: "entry",
    title: "MiniDbg: Understanding Minidumps and Creating a Custom Minidump Parser (Part 1)",
    link: {
      label: "medium.com/@owenbongs",
      href: "https://medium.com/@owenbongs/minidbg-understanding-minidumps-and-creating-a-custom-minidump-parser-part-1-869a1d4f0c01",
    },
    note: "minidump — the small crash report Windows saves when a program falls over, and a surprisingly rich piece of evidence",
  },
];

/** Placeholder for now. Replace these blocks when the real CV is ready. */
const cv: Block[] = [
  { t: "p", text: "Full CV — coming soon." },
  {
    t: "note",
    text: "it'll live right here as plain text, not a PDF download",
  },
  { t: "gap" },
  { t: "p", text: "In the meantime, education, achievements and work experience all have their own sections." },
];

const contact: Block[] = [
  { t: "p", text: "Any of these reach me. Email is the surest one." },
  { t: "gap" },
  { t: "link", label: "owenbongs@gmail.com", href: "mailto:owenbongs@gmail.com" },
  { t: "link", label: "linkedin.com/in/owen-ourelio-bong/", href: "https://linkedin.com/in/owen-ourelio-bong/" },
  { t: "link", label: "instagram.com/owennn_10/", href: "https://instagram.com/owennn_10/" },
];

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type Project = {
  slug: string;
  name: string;
  link: Link;
  body?: string;
  note?: string;
};

export const projects: Project[] = [
  {
    slug: "minidbg",
    name: "Minidbg",
    link: { label: "github.com/Ourelio/minidbg", href: "https://github.com/Ourelio/minidbg" },
    body: "A Volatility-style command-line tool for analysing Windows minidumps with WinDbg-like plugins, from modules and threads to memory, symbols and heaps.",
    note: "a minidump is the small crash report Windows writes when a program dies; this reads one back apart",
  },
  {
    slug: "bytesec",
    name: "ByteSec",
    link: { label: "github.com/MoreMorePwn/ByteSec", href: "https://github.com/MoreMorePwn/ByteSec" },
    body: "A Capture The Flag learning platform built around modules: read the theory, then do it for real. Every module comes with its own lab.",
  },
  {
    slug: "healthyeats",
    name: "HealthyEats",
    link: { label: "github.com/FRTX045/AI-Smester3-HealthyEats", href: "https://github.com/FRTX045/AI-Smester3-HealthyEats" },
    body: "An AI project: photograph a plate of food and it reads back what's in it — protein, calories and the rest.",
  },
];

/** One project, printed. Used by guided mode and by `cat projects/<x>.txt`. */
export function projectBlocks(p: Project): Block[] {
  const blocks: Block[] = [{ t: "entry", title: p.name, body: p.body, note: p.note, link: p.link }];
  if (!p.body) {
    blocks.push({ t: "note", text: "write-up coming soon — the code is up there in the meantime" });
  }
  return blocks;
}

const projectsSection: Block[] = projects.flatMap((p, i) =>
  i === 0 ? projectBlocks(p) : [{ t: "gap" } as Block, ...projectBlocks(p)],
);

/* ------------------------------------------------------------------ */
/* Writeups                                                            */
/* ------------------------------------------------------------------ */

export type Writeup = {
  /** Also the filename inside writeups/ — `cat writeups/<slug>.txt`. */
  slug: string;
  competition: string;
  challenge: string;
  category: "Digital Forensics" | "Reverse Engineering";
  /** The challenge text as it was given to competitors. */
  problem: string;
  /** The actual writeup. */
  body: Block[];
  /** Remove this once real content replaces the placeholder. */
  placeholder?: boolean;
};

/**
 * PLACEHOLDERS.
 *
 * Every entry below is a stub with the right shape and no real content yet.
 * To add a real writeup: keep the same fields, write `problem` as the
 * challenge statement, fill `body` with blocks, and delete `placeholder`.
 * Both modes pick it up with no other changes — guided mode lists it, and
 * `cat writeups/<slug>.txt` prints it.
 */
export const writeups: Writeup[] = [
  {
    slug: "hology-retain",
    competition: "HOLOGY",
    challenge: "Retain",
    category: "Digital Forensics",
    placeholder: true,
    problem: "Challenge statement goes here.",
    body: [{ t: "p", text: "Writeup coming soon." }],
  },
  {
    slug: "findit-carved",
    competition: "FINDIT",
    challenge: "Carved",
    category: "Digital Forensics",
    placeholder: true,
    problem: "Challenge statement goes here.",
    body: [{ t: "p", text: "Writeup coming soon." }],
  },
  {
    slug: "ara-unwound",
    competition: "ARA 7.0",
    challenge: "Unwound",
    category: "Reverse Engineering",
    placeholder: true,
    problem: "Challenge statement goes here.",
    body: [{ t: "p", text: "Writeup coming soon." }],
  },
];

/** `HOLOGY — Retain` */
export function writeupTitle(w: Writeup): string {
  return `${w.competition} — ${w.challenge}`;
}

export function findWriteup(slug: string): Writeup | undefined {
  return writeups.find((w) => w.slug === slug);
}

/** One writeup, printed in full. Shared by both modes. */
export function writeupBlocks(w: Writeup): Block[] {
  const blocks: Block[] = [
    { t: "entry", title: writeupTitle(w), meta: w.category },
    { t: "gap" },
  ];
  if (w.placeholder) {
    blocks.push({ t: "note", text: "placeholder — the real writeup isn't in here yet" }, { t: "gap" });
  }
  blocks.push({ t: "entry", title: "The problem", body: w.problem }, { t: "gap" }, ...w.body);
  return blocks;
}

/** The writeups index, printed. */
const writeupsIntro: Block[] = [
  {
    t: "p",
    text: "Notes on challenges I solved, mostly digital forensics with some reverse engineering. Pick one to read how it went.",
  },
];

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export type Section = {
  /** Internal id, the guided-mode route, and the manual-mode shorthand. */
  id: string;
  /** Sidebar label. Plain language, never a filename. */
  label: string;
  /** What the fake prompt line shows above the output. */
  command: string;
  /** Where this lives in the fake filesystem. */
  path: string;
  /** Directories are list -> detail; they have no blocks of their own. */
  kind: "file" | "dir";
  blocks: Block[];
};

/** Sidebar order. This is the order that ships. */
export const sections: Section[] = [
  { id: "about", label: "About Me", command: "about", path: "about.txt", kind: "file", blocks: about },
  { id: "education", label: "Education", command: "education", path: "education.txt", kind: "file", blocks: education },
  { id: "experience", label: "Experience", command: "experience", path: "experience.txt", kind: "file", blocks: experience },
  { id: "achievements", label: "Achievements & Awards", command: "achievements", path: "achievements.txt", kind: "file", blocks: achievements },
  { id: "writeups", label: "Writeups", command: "writeups", path: "writeups", kind: "dir", blocks: writeupsIntro },
  { id: "challenges", label: "CTF Challenges I've Built", command: "challenges", path: "challenges", kind: "dir", blocks: challenges },
  { id: "teaching", label: "Teaching", command: "teaching", path: "teaching.txt", kind: "file", blocks: teaching },
  { id: "projects", label: "Projects", command: "projects", path: "projects", kind: "dir", blocks: projectsSection },
  { id: "articles", label: "Articles", command: "articles", path: "articles.txt", kind: "file", blocks: articles },
  { id: "cv", label: "Resume / CV", command: "cv", path: "cv.txt", kind: "file", blocks: cv },
  { id: "contact", label: "Contact", command: "contact", path: "contact.txt", kind: "file", blocks: contact },
];

export function findSection(id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Directory sections: list, then one item in full                     */
/* ------------------------------------------------------------------ */

/** One pickable row inside a directory section. */
export type Listing = {
  /** The filename inside the directory, without .txt. */
  slug: string;
  title: string;
  /** Set to the right of the title. */
  tag: string;
  /** What the tag is, so the renderer can decide how to colour it. */
  tagKind: "category" | "event";
};

/**
 * Writeups and challenges are the same shape of thing: a list you choose
 * from, then one item printed in full. Both modes drive off these two
 * functions rather than naming sections, so adding a third directory is a
 * case here and nothing else.
 *
 * Projects is a directory too, but has no listing — it prints flat, and
 * returning nothing here is what keeps it that way.
 */
export function listingFor(id: string): Listing[] {
  if (id === "writeups") {
    return writeups.map((w) => ({
      slug: w.slug,
      title: writeupTitle(w),
      tag: w.category,
      tagKind: "category" as const,
    }));
  }
  if (id === "challenges") {
    return ctfChallenges.map((c) => ({
      slug: c.slug,
      title: c.name,
      tag: c.event,
      tagKind: "event" as const,
    }));
  }
  return [];
}

/** One item from a directory section, printed. Null if there's no such item. */
export function detailBlocks(id: string, slug: string): Block[] | null {
  if (id === "writeups") {
    const w = findWriteup(slug);
    return w ? writeupBlocks(w) : null;
  }
  if (id === "challenges") {
    const c = findChallenge(slug);
    return c ? challengeBlocks(c) : null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Landing copy                                                        */
/* ------------------------------------------------------------------ */

export const landing = {
  command: "welcome",
  intro: "Hey, I'm Owen or you might call me as wavess, cybersecurity student, digital forensics focus. Pick how you'd like to look around:",
  options: [
    { key: "1", id: "guided" as const, title: "Click through everything", sub: "Guided mode" },
    { key: "2", id: "manual" as const, title: "Type your own commands", sub: "Manual mode" },
  ],
};

/* ------------------------------------------------------------------ */
/* Easter eggs                                                         */
/* ------------------------------------------------------------------ */

export const eggs = {
  whoami: "You're probably Forrest Gump, or you could be Iron Man too for all we know.",
  sudo: "Nice try. The only root access around here belongs to Groot.",
  curiousGeorgeFile: ".curious_george",
  curiousGeorge: "Still curious. Still George. Still a bad joke.",
  runner: "run forrest run",
  quote: "life is like a box of chocolates, you never know what you're gonna get",
};
