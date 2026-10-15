import React, { useEffect, useState } from "react";
import { View, AccessibilityInfo } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../state/useApp";
import {
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
} from "../components/ui";
import { lessons } from "./Onboarding";
import { ApiLesson } from "../components/ApiLesson";
import { useBonusLessons, serverLessonId } from "../api/lessons";
import { LanguageChooser } from "../components/LanguageChooser";
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
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);
  return (
    <Screen>
      {!simple && !reduceMotion && (
        <LottieView
          autoPlay
          loop={false}
          source={require("../../assets/celebration.json")}
          style={{ position: "absolute", width: "100%", height: 300 }}
        />
      )}
      <View
        style={{
          backgroundColor: c.success,
          margin: -24,
          padding: 55,
          paddingTop: 80,
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
          gap: 24,
        }}
      >
        <Txt
          style={{
            color: c.coinGold,
            textAlign: "center",
            fontSize: 28,
            letterSpacing: 20,
          }}
        >
          ✦ ✧ ✦
        </Txt>
        <Kiko pulse mood="cheer" />
      </View>
      <View style={{ alignItems: "center", gap: 20, paddingVertical: 30 }}>
        <Label>{t("app.successLabel")}</Label>
        <Txt style={{ fontSize: 58, lineHeight: 70, color: c.success }}>
          {t("app.successTitle")}
        </Txt>
        <Card style={{ backgroundColor: c.coinGoldSoft, borderBottomWidth: 0 }}>
          <Txt style={{ color: c.coinGoldText, fontWeight: "700" }}>
            {rewarded === "false"
              ? `✓ ${t("app.practiceComplete")}`
              : `● ${t("app.coinsAwarded", { count: 10 })}`}
          </Txt>
        </Card>
        <Txt style={{ textAlign: "center", color: c.midBlue }}>
          {t("app.successBody")}
        </Txt>
      </View>
      <Button
        title={t("keep")}
        icon="arrow-right"
        onPress={() => router.replace("/roadmap")}
      />
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
      <LanguageChooser />
      <Label>{t("app.practiceLabel")}</Label>
      <Title>{t("app.practiceTitle")}</Title>
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
            <Txt style={{ fontWeight: "700" }}>{l.title}</Txt>
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
    </Screen>
  );
}
export function Leagues() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen footer={<Nav active="leagues" />}>
      <LanguageChooser />
      <Label>{t("app.personalBest")}</Label>
      <Title>{t("app.smallWins")}</Title>
      <Kiko mood={s.streak > 0 ? "cheer" : "happy"} />
      <Card>
        <Row style={{ justifyContent: "flex-start" }}>
          <Feather name="zap" size={26} color={c.coinGoldText} />
          <Txt style={{ fontSize: 28, lineHeight: 36, fontWeight: "700" }}>
            {t("app.streak", { count: s.streak })}
          </Txt>
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
    </Screen>
  );
}
