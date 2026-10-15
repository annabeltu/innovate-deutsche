import React from "react";
import { useLocalSearchParams } from "expo-router";
import { BudgetChallenge } from "./BudgetChallenge";
import { ScamChallenge } from "./ScamChallenge";
import { useApp } from "../state/useApp";
import { Lesson } from "./Journey";

/** Select the designed challenge for its roadmap topic. */
export function LessonScreen() {
  const { id = "budget" } = useLocalSearchParams<{ id: string }>();
  const country = useApp((state) => state.country);
  if (id === "budget") return <BudgetChallenge key={`budget-${country}`} />;
  if (id === "scams") return <ScamChallenge key="scams" />;
  return <Lesson key={id} />;
}
