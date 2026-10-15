import { TransferLesson } from "./TransferLesson";
import { TRANSFER_LESSON } from "../shop/catalog";
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
  const bonus = useApp((state) => state.bonus);
  if (id === "budget") return <BudgetChallenge key={`budget-${country}`} />;
  if (id === "scams") return <ScamChallenge key="scams" />;
  if (/^bonus-\d+$/.test(id) && bonus[Number(id.slice(6))] === TRANSFER_LESSON)
    return <TransferLesson key={id} id={id} />;
  return <Lesson key={id} />;
}
