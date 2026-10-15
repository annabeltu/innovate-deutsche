import React from "react";
import { View } from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/useApp";
import {
  Screen,
  Txt,
  Title,
  Label,
  Row,
  Button,
  Choice,
  Progress,
  Kiko,
  Card,
  c,
} from "../components/ui";
const countryNames = { US: "United States", MX: "Mexico", KE: "Kenya" };
export { Welcome as Setup } from "./Welcome";
export function About() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen>
      <Progress value={0.42} />
      <Row>
        <Txt style={{ fontWeight: "700" }}>{t("about")}</Txt>
        <Label>2 of 3</Label>
      </Row>
      <View>
        <Title>
          {t("where")}
          {"\n"}
          <Txt style={{ fontSize: 36, lineHeight: 42, color: c.midBlue }}>
            {t("now")}
          </Txt>
        </Title>
        <Txt style={{ color: c.midBlue }}>{t("grow")}</Txt>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {[
          ["Student", "🎒"],
          ["First job", "💼"],
          ["Parent", "🏡"],
          ["Retired", "🌿"],
        ].map(([name, icon]) => (
          <Choice
            key={name}
            title={name}
            icon={icon}
            selected={s.stage === name}
            onPress={() => s.set({ stage: name })}
            style={{ width: "48%", minHeight: 120 }}
          />
        ))}
      </View>
      <Txt>{t("goals")}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          "Save more",
          "Avoid debt",
          "Stay safe online",
          "Handle emergencies",
        ].map((name) => (
          <Choice
            key={name}
            title={name}
            selected={s.goal === name}
            onPress={() => s.set({ goal: name })}
          />
        ))}
      </View>
      <Txt>{t("feels")}</Txt>
      <Card>
        <Row>
          <Txt>😟</Txt>
          <Slider
            style={{ flex: 1, height: 44 }}
            accessibilityLabel="Comfort with money"
            minimumValue={0}
            maximumValue={1}
            value={s.comfort}
            onSlidingComplete={(comfort) => s.set({ comfort })}
            minimumTrackTintColor={c.brightBlue}
            maximumTrackTintColor={c.lightBlue}
            thumbTintColor={c.deepBlue}
          />
          <Txt>😎</Txt>
        </Row>
      </Card>
      <Button
        title={`${t("continue")}  →`}
        onPress={() => router.push("/confidence")}
      />
    </Screen>
  );
}
export function Confidence() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen>
      <Progress value={0.72} />
      <Row>
        <Txt style={{ fontWeight: "700" }}>{t("confidence")}</Txt>
        <Label>3 of 3</Label>
      </Row>
      <View>
        <Title>{t("confident")}</Title>
        <Txt style={{ color: c.midBlue }}>{t("noWrong")}</Txt>
      </View>
      <View style={{ gap: 22, paddingVertical: 10 }}>
        {[
          "Bank accounts & payments",
          "Saving",
          "Borrowing & credit",
          "Spotting scams",
          "Budgeting",
        ].map((name, i) => (
          <View key={name}>
            <Row>
              <Row>
                <View
                  style={{
                    backgroundColor: c.lightBlue,
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <Txt>{["↔", "◒", "↗", "!", "▥"][i]}</Txt>
                </View>
                <Txt style={{ fontWeight: "700", fontSize: 14 }}>{name}</Txt>
              </Row>
              <Txt style={{ fontSize: 24 }}>
                {s.confidence[i] < 0.3
                  ? "😟"
                  : s.confidence[i] > 0.7
                    ? "😎"
                    : "🙂"}
              </Txt>
            </Row>
            <Slider
              accessibilityLabel={name}
              minimumValue={0}
              maximumValue={1}
              step={0.1}
              value={s.confidence[i]}
              onValueChange={(value) =>
                s.set({
                  confidence: s.confidence.map((v, j) => (j === i ? value : v)),
                })
              }
              minimumTrackTintColor={c.brightBlue}
              maximumTrackTintColor={c.lightBlue}
              thumbTintColor={c.deepBlue}
              style={{ height: 44 }}
            />
          </View>
        ))}
      </View>
      <Button
        title={`${t("build")}  ✧`}
        onPress={() => {
          s.set({ onboarded: true });
          router.replace("/path");
        }}
      />
    </Screen>
  );
}
export const lessons = [
  { id: "accounts", title: "Your money, your account" },
  { id: "saving", title: "Safe saving" },
  { id: "budget", title: "Survive the month" },
  { id: "scams", title: "Spot the scam" },
  { id: "borrowing", title: "Borrowing without getting burned" },
];
export function Reveal() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen dark>
      <Txt style={{ fontSize: 32, fontWeight: "800", color: c.white }}>
        K◉mpass
      </Txt>
      <Txt
        style={{ color: c.coinGold, letterSpacing: 20, textAlign: "center" }}
      >
        ✦ · ✧ · ✦
      </Txt>
      <Kiko pulse />
      <Title light>{t("ready")}</Title>
      <Txt style={{ color: c.lightBlue }}>
        A starter path for {countryNames[s.country]}, based on your confidence
        and goals.
      </Txt>
      {[...lessons.slice(1), { id: "send", title: "Sending money abroad" }].map(
        (lesson, i) => (
          <Card key={lesson.id} style={{ padding: 14 }}>
            <Row>
              <Label>0{i + 1}</Label>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: "700" }}>{lesson.title}</Txt>
                <Txt style={{ fontSize: 12, color: c.midBlue }}>
                  Why this?{" "}
                  {i === 0
                    ? s.goal
                    : i === 1
                      ? "Make every month work"
                      : "A skill picked for you"}
                </Txt>
              </View>
            </Row>
          </Card>
        ),
      )}
      <Button
        secondary
        title={`${t("roadmap")}  →`}
        onPress={() => router.replace("/roadmap")}
      />
    </Screen>
  );
}
