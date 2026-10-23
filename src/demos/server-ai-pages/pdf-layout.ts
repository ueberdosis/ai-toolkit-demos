import type { JSONContent } from "@tiptap/core";

/** The fields of a pdf.js `TextItem` the layout needs. */
export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
}

export interface PdfLine {
  text: string;
  /** Left edge, in PDF points. */
  x: number;
  /** Right edge, in PDF points. */
  right: number;
  /** Distance of the baseline from the top of the page, in PDF points. */
  top: number;
  fontSize: number;
  /** Gaps wider than two characters, like between table columns or after a tab. */
  wideGaps: number;
}

export interface PdfPage {
  height: number;
  lines: PdfLine[];
}

export interface PdfConversionStats {
  pages: number;
  paragraphs: number;
  headings: number;
  /** Running headers, footers, and page numbers that were dropped. */
  removedRunningLines: number;
  characters: number;
}

type HeadingLevel = 1 | 2 | 3;

// Running headers, footers, and page numbers sit in the outer 15% of a page,
// at the same height on every page (rounded to this many points).
const MARGIN_RATIO = 0.15;
const RUNNING_LINE_POSITION_STEP = 4;
const RUNNING_LINE_MIN_PAGES_RATIO = 0.3;
const RUNNING_LINE_MIN_PAGES = 3;
// A section's own page header repeats on a few pages close together.
const RUNNING_LINE_MIN_STREAK = 3;
const RUNNING_LINE_MAX_PAGE_DISTANCE = 2;
const WIDE_GAP_FONT_SIZES = 2;
// Word's default spacing puts paragraphs about 1.55 line gaps apart.
const PARAGRAPH_GAP_RATIO = 1.3;
// A line ending this far before the right edge of the text is the last line of its paragraph.
const SHORT_LINE_RATIO = 0.2;
const MAX_HEADING_LENGTH = 200;
const MAX_SAME_SIZE_HEADING_LENGTH = 120;
const MIN_HEADING_LETTERS = 3;
const MIN_HEADING_SIZE_RATIO = 1.1;
const FONT_SIZE_TOLERANCE = 0.15;
const ENDS_SENTENCE = /[.!?:;"'”’)\]]$/;
const LIST_ITEM_START =
  /^([•◦▪▫‣⁃●○■□–—]|\(?(\d{1,3}|[a-z]|[ivxlcdm]{1,6})[.)])\s/iu;
// "A.1.1 Title", "3.2 Title", "Section 3.3.4.4 Title"; a bare "1." is a list item, not a section.
const SECTION_NUMBER =
  /^(?:(?:section|chapter|appendix|part|article)\s+)?((?:[a-z]|\d+)(?:\.\d+)+)\.?\s+\S/i;
const DOT_LEADER = /(?:\.\s?){4,}\s*\S{0,12}$/;
// "12", "A-16", "3.0-1"
const ENDS_WITH_PAGE_NUMBER = /\s(?:[a-z]{1,2}-|\d+(?:\.\d+)*-)?\d{1,4}$/i;

interface Block {
  text: string;
  fontSize: number;
  lineCount: number;
  wideGaps: number;
}

interface PageBlocks {
  blocks: Block[];
  /** The first line is indented or a list item, so it can't continue the previous page's paragraph. */
  startsNewParagraph: boolean;
  /** The last line runs to the right edge, so its paragraph may continue on the next page. */
  endsWithFullLine: boolean;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\p{Cc}/gu, "")
    .trim();
}

function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function similarFontSize(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(a, b) * FONT_SIZE_TOLERANCE;
}

/** Joins two lines of one paragraph, rejoining a word hyphenated at the line end. */
function joinLines(previous: string, next: string): string {
  if (/\p{L}-$/u.test(previous) && /^\p{Ll}/u.test(next)) {
    return previous.slice(0, -1) + next;
  }
  return `${previous} ${next}`;
}

/** A table of contents line: dot leaders, or a section number with a page number at the end. */
function isTocEntry(text: string): boolean {
  return (
    DOT_LEADER.test(text) ||
    (SECTION_NUMBER.test(text) && ENDS_WITH_PAGE_NUMBER.test(text))
  );
}

function letterCount(text: string): number {
  return text.match(/\p{L}/gu)?.length ?? 0;
}

/** Two or more words, mostly letters, all uppercase; not a row of figures or codes. */
function isAllCapsTitle(text: string): boolean {
  const visibleCharacters = text.replace(/\s/g, "").length;
  return (
    text.split(" ").length >= 2 &&
    letterCount(text) >= visibleCharacters * 0.6 &&
    text === text.toUpperCase()
  );
}

/**
 * Joins pdf.js text items into visual lines, in content order.
 *
 * @param pageTop - The y coordinate of the page's top edge, in PDF points.
 */
export function itemsToLines(items: PdfTextItem[], pageTop: number): PdfLine[] {
  const lines: PdfLine[] = [];
  let parts: string[] = [];
  let line: {
    x: number;
    baseline: number;
    fontSize: number;
    endX: number;
    wideGaps: number;
    /** Whitespace since the last visible item; pdf.js turns tabs into wide space items. */
    pendingGap: number;
  } | null = null;

  const flush = () => {
    const text = cleanText(parts.join(""));
    if (line && text) {
      lines.push({
        text,
        x: line.x,
        right: line.endX,
        top: pageTop - line.baseline,
        fontSize: line.fontSize,
        wideGaps: line.wideGaps,
      });
    }
    parts = [];
    line = null;
  };

  for (const item of items) {
    if (item.str) {
      const [, , skewX, scaleY, x, baseline] = item.transform;
      const fontSize = Math.hypot(skewX, scaleY) || item.height;
      if (
        line &&
        Math.abs(baseline - line.baseline) >
          Math.max(line.fontSize, fontSize) / 2
      ) {
        flush();
      }

      if (!line) {
        line = { x, baseline, fontSize, endX: x, wideGaps: 0, pendingGap: 0 };
      } else {
        const gap = x - line.endX;
        line.pendingGap += Math.max(gap, 0);
        if (!item.str.trim()) {
          line.pendingGap += item.width;
        } else {
          if (line.pendingGap > fontSize * WIDE_GAP_FONT_SIZES) {
            line.wideGaps += 1;
          }
          line.pendingGap = 0;
        }
        if (
          gap > fontSize * 0.15 &&
          !/\s$/.test(parts.at(-1) ?? "") &&
          !/^\s/.test(item.str)
        ) {
          // Items that are visibly apart are separate words even without a space character.
          parts.push(" ");
        }
      }
      parts.push(item.str);
      line.endX = Math.max(line.endX, x + item.width);
      line.fontSize = Math.max(line.fontSize, fontSize);
    }
    if (item.hasEOL) flush();
  }
  flush();

  return lines;
}

function isInMargin(line: PdfLine, pageHeight: number): boolean {
  return (
    line.top < pageHeight * MARGIN_RATIO ||
    line.top > pageHeight * (1 - MARGIN_RATIO)
  );
}

/** Running lines differ only in their numbers, e.g. "Page 3 of 90", and keep their height. */
function runningLineKey(line: PdfLine): string {
  const height = Math.round(line.top / RUNNING_LINE_POSITION_STEP);
  return `${line.text.toLowerCase().replace(/\d+/g, "#")}@${height}`;
}

function hasStreak(pageIndexes: number[]): boolean {
  let streak = 1;
  for (let index = 1; index < pageIndexes.length; index++) {
    const distance = pageIndexes[index] - pageIndexes[index - 1];
    streak = distance <= RUNNING_LINE_MAX_PAGE_DISTANCE ? streak + 1 : 1;
    if (streak >= RUNNING_LINE_MIN_STREAK) return true;
  }
  return false;
}

/**
 * Keys of margin lines that repeat on many pages, or on several pages in a
 * row: running headers, footers, section headers, and page numbers.
 */
function findRunningLines(pages: PdfPage[]): Set<string> {
  const pagesByKey = new Map<string, number[]>();
  pages.forEach((page, pageIndex) => {
    const keys = new Set(
      page.lines
        .filter((line) => isInMargin(line, page.height))
        .map(runningLineKey),
    );
    for (const key of keys) {
      const pageIndexes = pagesByKey.get(key) ?? [];
      pageIndexes.push(pageIndex);
      pagesByKey.set(key, pageIndexes);
    }
  });

  const minPages = Math.max(
    RUNNING_LINE_MIN_PAGES,
    Math.ceil(pages.length * RUNNING_LINE_MIN_PAGES_RATIO),
  );
  return new Set(
    [...pagesByKey]
      .filter(
        ([, pageIndexes]) =>
          pageIndexes.length >= minPages || hasStreak(pageIndexes),
      )
      .map(([key]) => key),
  );
}

/**
 * Groups one page's lines into paragraphs. A new paragraph starts after extra
 * spacing, at a font size change, at a list item, after a table of contents
 * entry, or after a sentence that ends on a short line or before an indent.
 */
function pageToBlocks(lines: PdfLine[]): PageBlocks {
  // The lower quartile is the spacing inside paragraphs, even on pages with many short paragraphs.
  const lineGap = quantile(
    lines
      .slice(1)
      .map((line, index) => line.top - lines[index].top)
      .filter((gap) => gap > 0),
    0.25,
  );
  const left = quantile(
    lines.map((line) => line.x),
    0.1,
  );
  const right = quantile(
    lines.map((line) => line.right),
    0.9,
  );
  const width = Math.max((right ?? 0) - (left ?? 0), 1);
  const isShort = (line: PdfLine) =>
    (right ?? line.right) - line.right > width * SHORT_LINE_RATIO;
  const isIndented = (line: PdfLine) =>
    line.x - (left ?? line.x) > line.fontSize;
  const startsParagraph = (line: PdfLine) =>
    isIndented(line) || LIST_ITEM_START.test(line.text);

  const blocks: Block[] = [];
  let previous: PdfLine | null = null;
  for (const line of lines) {
    const block = blocks.at(-1);
    if (block && previous) {
      const gap = line.top - previous.top;
      const expectedGap = lineGap ?? line.fontSize * 1.2;
      const previousEndsParagraph =
        isTocEntry(block.text) ||
        (ENDS_SENTENCE.test(previous.text) &&
          (isShort(previous) || startsParagraph(line)));
      const continuesBlock =
        gap > 0 &&
        gap <= expectedGap * PARAGRAPH_GAP_RATIO &&
        similarFontSize(line.fontSize, block.fontSize) &&
        !previousEndsParagraph &&
        !LIST_ITEM_START.test(line.text) &&
        !SECTION_NUMBER.test(line.text);
      if (continuesBlock) {
        block.text = joinLines(block.text, line.text);
        block.lineCount += 1;
        block.wideGaps = Math.max(block.wideGaps, line.wideGaps);
        previous = line;
        continue;
      }
    }
    blocks.push({
      text: line.text,
      fontSize: line.fontSize,
      lineCount: 1,
      wideGaps: line.wideGaps,
    });
    previous = line;
  }

  const first = lines[0];
  const last = lines.at(-1);
  return {
    blocks,
    startsNewParagraph: first ? startsParagraph(first) : true,
    endsWithFullLine: last ? !isShort(last) : false,
  };
}

function roundToHalfPoint(size: number): number {
  return Math.round(size * 2) / 2;
}

/** The font size that carries the most text. */
function bodyFontSize(blocks: Block[]): number {
  const characters = new Map<number, number>();
  for (const block of blocks) {
    const size = roundToHalfPoint(block.fontSize);
    characters.set(size, (characters.get(size) ?? 0) + block.text.length);
  }
  let body = 0;
  let mostCharacters = -1;
  for (const [size, count] of characters) {
    if (count > mostCharacters) {
      body = size;
      mostCharacters = count;
    }
  }
  return body;
}

/** Table rows have two or more column gaps; a heading has at most a tab after its number. */
function canBeHeading(block: Block): boolean {
  return (
    block.text.length <= MAX_HEADING_LENGTH &&
    letterCount(block.text) >= MIN_HEADING_LETTERS &&
    block.wideGaps < 2 &&
    !isTocEntry(block.text)
  );
}

/**
 * Maps the font sizes of short, larger-than-body blocks to heading levels by
 * rank, so the largest size is level 1 whatever the document's absolute sizes.
 */
function headingLevelsBySize(blocks: Block[]): Map<number, HeadingLevel> {
  const bodySize = bodyFontSize(blocks);
  const sizes = new Set(
    blocks
      .filter(
        (block) =>
          canBeHeading(block) &&
          block.fontSize >= bodySize * MIN_HEADING_SIZE_RATIO,
      )
      .map((block) => roundToHalfPoint(block.fontSize)),
  );
  const levels: HeadingLevel[] = [1, 2, 3];
  return new Map(
    [...sizes]
      .sort((a, b) => b - a)
      .map((size, rank) => [size, levels[Math.min(rank, levels.length - 1)]]),
  );
}

/**
 * Headings set in the body font size, often bold, which pdf.js can't tell
 * apart: a single short line with a section number ("A.1.1 Title", level by
 * depth) or in all caps.
 */
function sameSizeHeadingLevel(block: Block): HeadingLevel | undefined {
  if (
    block.lineCount > 1 ||
    block.text.length > MAX_SAME_SIZE_HEADING_LENGTH ||
    ENDS_SENTENCE.test(block.text)
  ) {
    return undefined;
  }
  const sectionNumber = SECTION_NUMBER.exec(block.text)?.[1];
  if (sectionNumber) {
    const depth = sectionNumber.split(".").length - 1;
    return Math.min(Math.max(depth, 1), 3) as HeadingLevel;
  }
  return block.wideGaps === 0 && isAllCapsTitle(block.text) ? 1 : undefined;
}

/**
 * Rebuilds a PDF's text as Tiptap headings and paragraphs. Drops running
 * headers and footers, and joins paragraphs that continue over a page break.
 * Does not detect tables, lists, columns, or images.
 */
export function buildPdfDocument(pages: PdfPage[]): {
  content: JSONContent;
  stats: PdfConversionStats;
} {
  const runningLines = findRunningLines(pages);
  let removedRunningLines = 0;
  const blocks: Block[] = [];
  let previousPageEndsWithFullLine = false;

  for (const page of pages) {
    const lines = page.lines.filter((line) => {
      const isRunning =
        isInMargin(line, page.height) && runningLines.has(runningLineKey(line));
      if (isRunning) removedRunningLines += 1;
      return !isRunning;
    });
    if (lines.length === 0) continue;

    const {
      blocks: pageBlocks,
      startsNewParagraph,
      endsWithFullLine,
    } = pageToBlocks(lines);
    const last = blocks.at(-1);
    const first = pageBlocks[0];
    const continuesOverPageBreak =
      last &&
      first &&
      !startsNewParagraph &&
      !isTocEntry(last.text) &&
      similarFontSize(first.fontSize, last.fontSize) &&
      (previousPageEndsWithFullLine ||
        (!ENDS_SENTENCE.test(last.text) && /^\p{Ll}/u.test(first.text)));
    if (continuesOverPageBreak) {
      last.text = joinLines(last.text, first.text);
      last.lineCount += first.lineCount;
      last.wideGaps = Math.max(last.wideGaps, first.wideGaps);
      pageBlocks.shift();
    }
    blocks.push(...pageBlocks);
    previousPageEndsWithFullLine = endsWithFullLine;
  }

  const levelsBySize = headingLevelsBySize(blocks);
  let headings = 0;
  let characters = 0;
  const content = blocks.map((block): JSONContent => {
    characters += block.text.length;
    const text = [{ type: "text", text: block.text }];
    const level = canBeHeading(block)
      ? (levelsBySize.get(roundToHalfPoint(block.fontSize)) ??
        sameSizeHeadingLevel(block))
      : undefined;
    if (!level) return { type: "paragraph", content: text };
    headings += 1;
    return { type: "heading", attrs: { level }, content: text };
  });

  return {
    content: { type: "doc", content },
    stats: {
      pages: pages.length,
      paragraphs: blocks.length - headings,
      headings,
      removedRunningLines,
      characters,
    },
  };
}
