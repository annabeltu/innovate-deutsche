import { personalizePath } from "./personalized-path";

/** Keep roadmap ordering in sync with the preview and unlock one unfinished lesson. */
export function buildRoadmap(confidence: number[], completed: string[]) {
  const path = personalizePath(confidence);
  const currentTopic = path.find(
    (lesson) => !completed.includes(lesson.topic),
  )?.topic;
  return path.map((lesson) => ({
    ...lesson,
    status: completed.includes(lesson.topic)
      ? "completed"
      : lesson.topic === currentTopic
        ? "current"
        : "locked",
  }));
}
