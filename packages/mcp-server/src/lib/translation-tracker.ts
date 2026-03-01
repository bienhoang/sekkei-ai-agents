/**
 * Hash-based section tracking for incremental (delta-only) translation.
 * Splits markdown by ## headings, computes SHA-256 hashes, and detects changed sections.
 * Uses <!-- sekkei:translated:{hash} --> HTML comments as invisible markers.
 */
import { createHash } from "node:crypto";

export interface Section {
  heading: string;
  body: string;
  hash: string;
  startLine: number;
}

const HEADING_RE = /^## /m;
const HASH_MARKER_RE = /<!-- sekkei:translated:([a-f0-9]{12}) -->/;

/** Compute SHA-256 hash of content, truncated to 12 hex chars. */
export function hashSection(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/** Split markdown content into sections by ## headings. Content before first heading becomes "_intro".
 *  Note: Only ## level headings create section boundaries. Changes within ### subsections
 *  trigger retranslation of their parent ## section — acceptable tradeoff for simplicity. */
export function splitSections(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let currentHeading = "_intro";
  let currentBody: string[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i]) && i > 0) {
      // Flush previous section
      const sectionContent = currentHeading === "_intro"
        ? currentBody.join("\n")
        : `${currentHeading}\n${currentBody.join("\n")}`;
      if (sectionContent.trim()) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join("\n"),
          hash: hashSection(sectionContent),
          startLine,
        });
      }
      currentHeading = lines[i];
      currentBody = [];
      startLine = i;
    } else if (HEADING_RE.test(lines[i]) && i === 0) {
      currentHeading = lines[i];
      startLine = 0;
    } else {
      currentBody.push(lines[i]);
    }
  }

  // Flush last section
  const sectionContent = currentHeading === "_intro"
    ? currentBody.join("\n")
    : `${currentHeading}\n${currentBody.join("\n")}`;
  if (sectionContent.trim()) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join("\n"),
      hash: hashSection(sectionContent),
      startLine,
    });
  }

  return sections;
}

/** Insert hash markers before each ## heading in translated content. Position-based — works even when headings are translated. */
export function insertHashes(translated: string, sourceSections: Section[]): string {
  // Collect hashes in order (skip _intro)
  const hashes = sourceSections.filter((s) => s.heading !== "_intro").map((s) => s.hash);
  let hashIdx = 0;

  const lines = translated.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    if (HEADING_RE.test(line) && hashIdx < hashes.length) {
      result.push(`<!-- sekkei:translated:${hashes[hashIdx]} -->`);
      hashIdx++;
    }
    result.push(line);
  }

  return result.join("\n");
}

/** Extract hash markers from a previously translated document. Returns ordered array of hashes (position-based). */
export function extractHashes(translated: string): string[] {
  const hashes: string[] = [];
  const lines = translated.split("\n");

  for (const line of lines) {
    const match = HASH_MARKER_RE.exec(line);
    if (match) {
      hashes.push(match[1]);
    }
  }

  return hashes;
}

/** Compare source sections against existing translation hashes (position-based). Returns only changed sections. */
export function findChangedSections(
  sourceSections: Section[],
  existingHashes: string[],
): Section[] {
  return sourceSections.filter((s, i) => {
    // _intro sections don't get hash markers, so compare non-intro by position
    const nonIntroIdx = s.heading === "_intro" ? -1 : sourceSections.filter((x, j) => j < i && x.heading !== "_intro").length;
    if (nonIntroIdx < 0) {
      // Intro section — always retranslate (no hash marker stored)
      return true;
    }
    const existingHash = existingHashes[nonIntroIdx];
    return !existingHash || existingHash !== s.hash;
  });
}
