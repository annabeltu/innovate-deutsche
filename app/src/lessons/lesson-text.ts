/** A piece of card text; `key` marks a number or amount to highlight. */
export type TextRun = { text: string; key: boolean };

// Money (with a symbol or code), percentages and other numbers. A match ends
// on a digit so sentence punctuation stays outside the highlight.
const KEY_NUMBER =
  /((?:MX\$|KSh|US\$|\$|€|£)\s?\d(?:[\d,.]*\d)?|\d(?:[\d,.]*\d)?\s?%|\d(?:[\d,.]*\d)?)/g;
const WHOLE_KEY_NUMBER = new RegExp(`^${KEY_NUMBER.source}$`);
const SENTENCE_END = /([.!?])\s+/;

/** Split card text into sentences, keeping each sentence's punctuation. */
export function splitSentences(text: string): string[] {
  const parts = text.trim().split(SENTENCE_END);
  const sentences: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const sentence = `${parts[index]}${parts[index + 1] ?? ""}`.trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}

/** Split text into plain runs and key runs (numbers and amounts) to highlight. */
export function highlightRuns(text: string): TextRun[] {
  return text
    .split(KEY_NUMBER)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      key: WHOLE_KEY_NUMBER.test(part),
    }));
}

/** A card as a short bold title plus at most a few short rows. */
export function cardSections(text: string): { title: string; rows: string[] } {
  const [title = "", ...rows] = splitSentences(text);
  return { title, rows };
}

/**
 * A scam card's message and question: the question is the final sentence
 * ending in "?"; everything before it is the message to judge.
 */
export function scamParts(text: string): { message: string; question: string } {
  const sentences = splitSentences(text);
  const last = sentences[sentences.length - 1] ?? "";
  if (sentences.length > 1 && last.endsWith("?"))
    return { message: sentences.slice(0, -1).join(" "), question: last };
  return { message: text.trim(), question: "" };
}

/**
 * Whether a bridge card is a "people like you" comparison (its first
 * sentence has a number), so it can show as the two flip cards. Older
 * generated lessons used bridge for plain advice; those read as concepts.
 */
export function isComparisonBridge(text: string): boolean {
  const [first = ""] = splitSentences(text);
  return highlightRuns(first).some((run) => run.key);
}
