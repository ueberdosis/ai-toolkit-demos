import type { JSONContent } from "@tiptap/core";

const SECTIONS_PER_CHAPTER = 50;
const PARAGRAPHS_PER_SECTION = 5;
const LIST_EVERY_N_SECTIONS = 7;
const TABLE_EVERY_N_SECTIONS = 20;

const TOPICS = [
  "Budget planning",
  "Hiring and onboarding",
  "Vendor management",
  "Release readiness",
  "Customer feedback",
  "Incident response",
  "Regional pricing",
  "Platform migration",
  "Risk register",
  "Training program",
  "Capacity planning",
  "Partner integrations",
  "Accessibility review",
  "Support escalations",
  "Data retention",
  "Security posture",
];

const SUBJECTS = [
  "the regional team",
  "our finance group",
  "the product council",
  "each delivery squad",
  "the support desk",
  "the platform team",
  "the review board",
  "every project lead",
  "the design studio",
  "the data office",
  "the sales division",
  "the steering group",
  "the security team",
  "the legal department",
  "the operations crew",
  "the research unit",
];

const VERBS = [
  "reviewed",
  "approved",
  "updated",
  "questioned",
  "documented",
  "prioritized",
  "simplified",
  "postponed",
  "measured",
  "challenged",
  "expanded",
  "audited",
  "drafted",
  "rebuilt",
  "shared",
  "tracked",
];

const OBJECTS = [
  "the quarterly budget forecast",
  "the onboarding checklist",
  "the vendor contract terms",
  "the release readiness report",
  "the customer feedback summary",
  "the hiring plan for next year",
  "the incident response playbook",
  "the regional pricing model",
  "the migration timeline",
  "the risk register entries",
  "the training curriculum",
  "the capacity planning sheet",
  "the partner integration roadmap",
  "the accessibility audit results",
  "the support escalation policy",
  "the data retention schedule",
];

const CLOSINGS = [
  "before the next planning cycle",
  "after a long discussion",
  "to reduce open risks",
  "with input from every region",
  "ahead of the board meeting",
  "despite several open questions",
  "to keep the launch on track",
  "based on last month's numbers",
  "while the audit was still running",
  "so that teams can move faster",
  "without changing the overall scope",
  "in close collaboration with partners",
  "to address recurring complaints",
  "following the latest review",
  "as part of the yearly refresh",
  "to prepare for the next release",
];

const STATUSES = ["On track", "At risk", "Blocked", "Done"];

type Random = () => number;

/** mulberry32: a tiny seeded PRNG, so the same options always produce the same document. */
function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentence(random: Random): string {
  return `${capitalize(pick(random, SUBJECTS))} ${pick(random, VERBS)} ${pick(random, OBJECTS)} ${pick(random, CLOSINGS)}.`;
}

function textNode(text: string, mark?: "bold" | "italic"): JSONContent {
  return mark
    ? { type: "text", text, marks: [{ type: mark }] }
    : { type: "text", text };
}

function heading(level: 1 | 2, text: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [textNode(text)] };
}

/** A paragraph of 6–7 sentences, sometimes with one bold and one italic sentence. */
function paragraph(random: Random): JSONContent {
  const sentenceCount = 6 + Math.floor(random() * 2);
  const boldIndex =
    random() < 0.3 ? Math.floor(random() * sentenceCount) : undefined;
  const italicIndex =
    random() < 0.2 ? Math.floor(random() * sentenceCount) : undefined;

  const content: JSONContent[] = [];
  let plainText = "";
  for (let index = 0; index < sentenceCount; index++) {
    const text = (index === 0 ? "" : " ") + sentence(random);
    const mark =
      index === boldIndex ? "bold" : index === italicIndex ? "italic" : null;
    if (!mark) {
      plainText += text;
      continue;
    }
    if (plainText) content.push(textNode(plainText));
    plainText = "";
    content.push(textNode(text, mark));
  }
  if (plainText) content.push(textNode(plainText));

  return { type: "paragraph", content };
}

function bulletList(random: Random): JSONContent {
  return {
    type: "bulletList",
    content: Array.from({ length: 4 }, () => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [textNode(sentence(random))] }],
    })),
  };
}

function tableCell(type: "tableHeader" | "tableCell", text: string) {
  return {
    type,
    content: [{ type: "paragraph", content: [textNode(text)] }],
  };
}

function table(random: Random): JSONContent {
  const header = ["Item", "Owner", "Status"].map((text) =>
    tableCell("tableHeader", text),
  );
  const rows = Array.from({ length: 4 }, () => ({
    type: "tableRow",
    content: [
      tableCell("tableCell", capitalize(pick(random, OBJECTS))),
      tableCell("tableCell", capitalize(pick(random, SUBJECTS))),
      tableCell("tableCell", pick(random, STATUSES)),
    ],
  }));
  return {
    type: "table",
    content: [{ type: "tableRow", content: header }, ...rows],
  };
}

export interface GenerateDocumentOptions {
  /** Number of sections; each one fills roughly one A4 page in this demo. */
  pages: number;
  seed?: number;
}

/**
 * Builds a deterministic ConvertKit/TableKit document. Every section starts
 * with a unique "Section N" heading, so prompts can target content deep in a
 * large document.
 */
export function generateDocument({
  pages,
  seed = 1,
}: GenerateDocumentOptions): JSONContent {
  const random = createRandom(seed);
  const content: JSONContent[] = [];

  for (let section = 1; section <= pages; section++) {
    const topic = TOPICS[(section - 1) % TOPICS.length];

    if ((section - 1) % SECTIONS_PER_CHAPTER === 0) {
      const chapter = Math.floor((section - 1) / SECTIONS_PER_CHAPTER) + 1;
      content.push(heading(1, `Chapter ${chapter}: ${topic}`));
    }
    content.push(heading(2, `Section ${section}: ${topic}`));

    for (let index = 0; index < PARAGRAPHS_PER_SECTION; index++) {
      if (index === 2 && section % LIST_EVERY_N_SECTIONS === 0) {
        content.push(bulletList(random));
      } else if (index === 3 && section % TABLE_EVERY_N_SECTIONS === 0) {
        content.push(table(random));
      } else {
        content.push(paragraph(random));
      }
    }
  }

  return { type: "doc", content };
}
