/**
 * Horizon Client-Side Syllabus Text Parser
 * Intelligently transforms raw pasted curriculum outlines into structured section arrays.
 * Handles numbered lists, Roman numerals, Markdown headers/bullets, and cleans durations.
 */

// Boilerplate course headers to ignore
const IGNORED_HEADER_REGEX = /^(course content|curriculum|syllabus|table of contents|overview|course outline|modules|sections|lectures|what you'll learn)$/i;

// Regex to detect and strip leading list markers (numbers 1-999 or Roman numerals I-XX)
// Does NOT match standard letters like A, B, C, D to preserve "Module A: ...", "Module B: ..."
const LIST_PREFIX_REGEX = /^\s*(?:(?:module|section|chapter|part|unit|day|week|lecture)\s+)?(?:(?:\d{1,3})|(?:X{0,2}(?:IX|IV|V?I{1,3})))(?:[\.\)\:\-\–\—\s]+|\s+)(?:-\s+)?/i;

// Regex to strip Markdown bullets & headers
const MARKDOWN_PREFIX_REGEX = /^\s*(?:[#]{1,6}|[\*\-\+\•\–\—]|\>)\s+/;

// Regex to strip trailing duration annotations: (45 mins), [1 hr 30 mins], (12:45), - 2 hours, etc.
const TRAILING_DURATION_REGEX = /\s*(?:[\(\[\{]\s*(?:(?:\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s*)+|\d+:\d+(?::\d+)?)\s*[\)\]\}]|[\-\–\—]\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\s*)$/i;

/**
 * Parses raw multi-line syllabus text into an array of clean section titles
 * @param {string} rawText - Multi-line string pasted by user
 * @returns {Array<string>} Array of normalized section title strings
 */
export function parseSyllabusText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const sections = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();

    if (!line) continue;

    // Skip generic boilerplate headers
    if (IGNORED_HEADER_REGEX.test(line)) continue;

    // 1. Strip Markdown bullet / heading markers
    line = line.replace(MARKDOWN_PREFIX_REGEX, '');

    // 2. Strip numbered / Roman numeral prefixes (e.g., "1. ", "Section I: ", "Module 02 - ")
    line = line.replace(LIST_PREFIX_REGEX, '');

    // 3. Strip trailing durations: (45 mins), [1 hr 30 mins], - 2 hours, etc.
    line = line.replace(TRAILING_DURATION_REGEX, '');

    // 4. Normalize spaces and quotes
    line = line
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // 5. Length sanity check (must be a meaningful title)
    if (line.length >= 3 && line.length <= 150) {
      // Prevent accidental duplicates in consecutive lines
      if (sections[sections.length - 1] !== line) {
        sections.push(line);
      }
    }
  }

  return sections;
}

/**
 * Pre-formatted sample syllabus outline for quick demo and testing
 */
export const SAMPLE_SYLLABUS_TEXT = `1. Foundations and First Projects (45 mins)
2. Frontier APIs and Customer Service Chatbots (1 hr 15 mins)
3. Embracing Open-Source Models (50 mins)
4. LLM Selection and Code Generation (1 hr)
5. Retrieval-Augmented Generation (RAG) (1 hr 30 mins)
6. Transitioning to Training & Fine-Tuning (2 hrs)
7. Advanced Training Techniques (1 hr 10 mins)
8. Deployment and Finalization (40 mins)`;
