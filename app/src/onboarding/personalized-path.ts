import { topics } from "./request";

/** Prioritize lower-confidence topics while keeping ties in topic order. */
export function personalizePath(confidence: number[]) {
  return topics
    .map((topic, index) => {
      const score = confidence[index] ?? 0.5;
      return {
        topic,
        score,
        band: score < 0.4 ? "low" : score < 0.7 ? "medium" : "high",
      };
    })
    .sort((first, second) => first.score - second.score);
}
