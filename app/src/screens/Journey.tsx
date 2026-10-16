import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { LESSON_REWARD_COINS, useApp } from "../state/useApp";
import {
  ActionBar,
  Screen,
  Txt,
  Title,
  Label,
  Row,
  Button,
  Kiko,
  KikoNote,
  Card,
  Nav,
  c,
  useReduceMotion,
} from "../components/ui";
import { CoinReward, RewardCelebration } from "../components/RewardCelebration";
import { lessons } from "./Onboarding";
import { ApiLesson } from "../components/ApiLesson";
import { useBonusLessons, serverLessonId } from "../api/lessons";
import { LanguageChooser } from "../components/LanguageChooser";
import { AccountHeader } from "../components/AccountHeader";
import { layout } from "../theme/tokens";

const STREAK_ICON_SIZE = 24;
export { Roadmap } from "./Roadmap";
export function Lesson() {
  const { id = "budget" } = useLocalSearchParams<{ id: string }>();
  const state = useApp();
  const lessonId = serverLessonId(id, state) ?? id;
  return (
    <ApiLesson
      key={`${state.language}-${lessonId}`}
      routeId={id}
      lessonId={lessonId}
    />
  );
}
export function Success() {
  const { rewarded } = useLocalSearchParams<{ rewarded: string }>();
  const { t } = useTranslation();
  const simple = useApp((s) => s.simple);
  const still = useReduceMotion() || simple;
  return (
    <Screen
      footer={
        <ActionBar>
          <Button
            title={t("keep")}
            icon="arrow-right"
            onPress={() => router.replace("/roadmap")}
          />
        </ActionBar>
      }
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: layout.sectionGap,
        }}
      >
        <RewardCelebration still={still} />
        <View style={{ alignItems: "center", gap: layout.itemGap }}>
          <Txt variant="title" accessibilityRole="header">
            {t("app.successTitle")}
          </Txt>
          {rewarded === "false" ? (
            <Txt tone="reward" weight="bold">
              {`✓ ${t("app.practiceComplete")}`}
            </Txt>
          ) : (
            <CoinReward count={LESSON_REWARD_COINS} still={still} />
          )}
          <Txt style={{ textAlign: "center" }}>{t("app.successBody")}</Txt>
        </View>
      </View>
    </Screen>
  );
}
export { Shop } from "./Shop";
export function Practice() {
  const s = useApp();
  const { t } = useTranslation();
  const bonus = useBonusLessons();
  const practiceLessons = [
    ...lessons.map((lesson) => ({
      ...lesson,
      title: t(`confidenceTopics.${lesson.id}`),
    })),
    ...s.bonus.map((_, index) => ({
      id: `bonus-${index}`,
      title: bonus[index]?.data?.title ?? t("app.bonusLesson"),
    })),
  ];
  return (
    <Screen footer={<Nav active="practice" />}>
      <AccountHeader />
      <View>
        <Label>{t("app.practiceLabel")}</Label>
        <Title>{t("app.practiceTitle")}</Title>
      </View>
      <Txt style={{ color: c.midBlue }}>{t("app.practiceBody")}</Txt>
      {s.completed.length === 0 && (
        <>
          <KikoNote message={t("app.practiceEmpty")} />
          <Button
            title={t("app.keepLearning")}
            icon="arrow-right"
            onPress={() => router.replace("/roadmap")}
          />
        </>
      )}
      {practiceLessons
        .filter((l) => s.completed.includes(l.id))
        .map((l) => (
          <Card key={l.id}>
            <Txt variant="subheading">{l.title}</Txt>
            <Button
              secondary
              icon="rotate-ccw"
              title={t("app.practiceAgain")}
              onPress={() =>
                router.push({ pathname: "/lesson", params: { id: l.id } })
              }
            />
          </Card>
        ))}
      <LanguageChooser />
    </Screen>
  );
}
export function Leagues() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen footer={<Nav active="leagues" />}>
      <AccountHeader />
      <View>
        <Label>{t("app.personalBest")}</Label>
        <Title>{t("app.smallWins")}</Title>
      </View>
      <Kiko mood={s.streak > 0 ? "cheer" : "happy"} />
      <Card>
        <Row style={{ justifyContent: "flex-start" }}>
          <Feather name="zap" size={STREAK_ICON_SIZE} color={c.coinGoldText} />
          <Txt variant="heading">{t("app.streak", { count: s.streak })}</Txt>
        </Row>
        <Txt>{t("app.lessonCount", { count: s.completed.length })}</Txt>
        <Txt>● {t("app.coinsSaved", { count: s.coins })}</Txt>
      </Card>
      <Txt style={{ color: c.midBlue }}>{t("app.leaguesSoon")}</Txt>
      <Button
        icon="arrow-right"
        title={t("app.keepLearning")}
        onPress={() => router.replace("/roadmap")}
      />
      <LanguageChooser />
    </Screen>
  );
}
