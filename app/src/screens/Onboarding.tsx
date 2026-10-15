import React from "react";
import { View } from "react-native";
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
  Kiko,
  Card,
  c,
} from "../components/ui";
const countryNames = { US: "United States", MX: "Mexico", KE: "Kenya" };
export { Welcome as Setup } from "./Welcome";
export { JourneySetup as About } from "./JourneySetup";
export { Confidence } from "./Confidence";
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
