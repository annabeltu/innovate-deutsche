import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { scamParts } from "../../lessons/lesson-text";
import type { LessonCard } from "../../types/api";
import { colors, layout, radii, spacing } from "../../theme/tokens";
import { OptionRow } from "../ui";
import { Txt } from "../Txt";
import { KeyText } from "./LessonText";

const SHAKE_DISTANCE = 8;
const SHAKE_STEP_MS = 50;
const SENDER_ICON_SIZE = 18;

/** Where the learner is on a question card. */
export type AnswerState = {
  answer: string | null;
  checked: boolean;
  /** Counts wrong checks, so each one replays the shake. */
  wrongTries: number;
};

/** Shakes its children sideways each time `trigger` goes up. */
function Shake({
  trigger,
  still,
  children,
}: {
  trigger: number;
  still: boolean;
  children: React.ReactNode;
}) {
  const offset = useSharedValue(0);
  useEffect(() => {
    if (trigger === 0 || still) return;
    offset.value = withSequence(
      withTiming(-SHAKE_DISTANCE, { duration: SHAKE_STEP_MS }),
      withTiming(SHAKE_DISTANCE, { duration: SHAKE_STEP_MS }),
      withTiming(-SHAKE_DISTANCE / 2, { duration: SHAKE_STEP_MS }),
      withTiming(0, { duration: SHAKE_STEP_MS }),
    );
  }, [trigger, still, offset]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function resultFor(
  letter: string,
  { answer, checked }: AnswerState,
  correct: string | null,
): "correct" | "wrong" | undefined {
  if (!checked || answer !== letter) return undefined;
  return letter === correct ? "correct" : "wrong";
}

/** Multiple choice: the question as a short title and equal answer tiles. */
export function ChoiceCard({
  card,
  state,
  onSelect,
  still,
}: {
  card: LessonCard;
  state: AnswerState;
  onSelect: (letter: string) => void;
  still: boolean;
}) {
  const { t } = useTranslation();
  const solved = state.checked && state.answer === card.correct_option;
  return (
    <View style={{ gap: layout.sectionGap }}>
      <KeyText text={card.text} variant="heading" />
      <Shake trigger={state.wrongTries} still={still}>
        <View style={{ gap: layout.itemGap }}>
          {Object.entries(card.options).map(([letter, text]) => (
            <OptionRow
              key={letter}
              letter={letter.toUpperCase()}
              title={text}
              accessibilityLabel={`${letter.toUpperCase()}. ${text}`}
              accessibilityHint={t("quizOptionHint")}
              selected={state.answer === letter}
              result={resultFor(letter, state, card.correct_option)}
              disabled={solved}
              onPress={() => onSelect(letter)}
            />
          ))}
        </View>
      </Shake>
    </View>
  );
}

/**
 * Scam or legit: the message in a text bubble with two answer buttons.
 * Once answered correctly, the amounts in the message light up as red flags.
 */
export function ScamCard({
  card,
  state,
  onAnswer,
  still,
}: {
  card: LessonCard;
  state: AnswerState;
  onAnswer: (letter: string) => void;
  still: boolean;
}) {
  const { t } = useTranslation();
  const { message, question } = scamParts(card.text);
  const solved = state.checked && state.answer === card.correct_option;
  const options = Object.entries(card.options);
  return (
    <View style={{ gap: layout.sectionGap }}>
      <View
        style={{
          alignSelf: "flex-start",
          maxWidth: "92%",
          gap: spacing.xs,
          padding: spacing.lg,
          borderRadius: radii.card,
          borderBottomLeftRadius: spacing.xs,
          backgroundColor: colors.iceBlue,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <Feather
            name="message-square"
            size={SENDER_ICON_SIZE}
            color={colors.midBlue}
          />
          <Txt
            variant="caption"
            weight="bold"
            style={{ color: colors.midBlue }}
          >
            {t("lessonCard.message")}
          </Txt>
        </View>
        <KeyText text={message} flagged={solved} />
      </View>
      {solved && (
        <Txt variant="small" tone="danger" weight="semibold">
          {t("lessonCard.redFlags")}
        </Txt>
      )}
      {question !== "" && <Txt variant="subheading">{question}</Txt>}
      <Shake trigger={state.wrongTries} still={still}>
        <View style={{ flexDirection: "row", gap: layout.itemGap }}>
          {options.map(([letter, text], index) => (
            <View key={letter} style={{ flex: 1 }}>
              <OptionRow
                accessibilityRole="button"
                title={text}
                accessibilityLabel={`${letter.toUpperCase()}. ${text}`}
                accessibilityHint={t("quizOptionHint")}
                centered
                tone={index === 0 ? "danger" : "positive"}
                selected={state.answer === letter}
                result={resultFor(letter, state, card.correct_option)}
                disabled={solved}
                onPress={() => onAnswer(letter)}
              />
            </View>
          ))}
        </View>
      </Shake>
    </View>
  );
}
