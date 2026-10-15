import React, { useEffect, useState } from "react";
import { View, Pressable, AccessibilityInfo } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
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
  Nav,
  c,
} from "../components/ui";
import { lessons } from "./Onboarding";
const money = { US: "$", MX: "MX$", KE: "KSh" };
/** Matches the reward granted by useApp.complete. */
const COINS_PER_LESSON = 10;
export { Roadmap } from "./Roadmap";
export function Lesson() {
  const { id = "budget" } = useLocalSearchParams<{ id: string }>();
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const s = useApp();
  const { t } = useTranslation();
  const scam = id === "scams";
  const budget = id === "budget";
  const tipKey = id.startsWith("bonus")
    ? "bonus"
    : id === "saving" || id === "borrowing"
      ? id
      : "accounts";
  const safeKey = tipKey === "saving" ? "accounts" : tipKey;
  const riskyKey = id === "borrowing" ? "borrowing" : "accounts";
  const title = lessons.some((l) => l.id === id)
    ? t(`journey.lessons.${id}`)
    : t(s.bonus[Number(id.split("-")[1])] ?? "journey.lessons.fallback");
  const correct = scam
    ? answer === "Scam"
    : budget
      ? answer === "Savings"
      : answer === "A";
  function check() {
    if (!answer) return;
    setChecked(true);
    if (correct) {
      const rewarded = !s.completed.includes(id);
      s.complete(id);
      router.replace({
        pathname: "/success",
        params: { id, rewarded: String(rewarded) },
      });
    }
  }
  return (
    <Screen>
      <Row>
        <Choice
          title="‹"
          accessibilityLabel={t("journey.lesson.back")}
          onPress={() => router.replace("/roadmap")}
        />
        <Progress value={0.6} />
        <Txt
          accessibilityLabel={t("journey.lesson.hearts", { count: s.hearts })}
        >
          ♥ {s.hearts}
        </Txt>
      </Row>
      <Label>{title.toUpperCase()}</Label>
      <Title>
        {scam ? (
          <>
            Would you{"\n"}
            <Txt style={{ fontSize: 36, lineHeight: 42, color: c.midBlue }}>
              trust this?
            </Txt>
          </>
        ) : budget ? (
          <>
            Give every coin{"\n"}
            <Txt style={{ fontSize: 36, lineHeight: 42, color: c.midBlue }}>
              a job.
            </Txt>
          </>
        ) : (
          t("journey.lesson.headline")
        )}
      </Title>
      {scam ? (
        <>
          <Card>
            <Row>
              <Txt style={{ color: c.midBlue, fontWeight: "700" }}>
                MobileBank
              </Txt>
              <Label>now</Label>
            </Row>
            <View
              style={{
                padding: 18,
                backgroundColor: c.iceBlue,
                borderRadius: 18,
                marginVertical: 16,
              }}
            >
              <Txt style={{ fontSize: 19, lineHeight: 30 }}>
                URGENT: Your account is{" "}
                <Txt style={{ color: c.error, fontWeight: "800" }}>BLOCKED</Txt>
                . Share your{" "}
                <Txt style={{ color: c.error, fontWeight: "800" }}>PIN</Txt> to
                unlock: <Txt style={{ color: c.error }}>bit.ly/3xK…</Txt>
              </Txt>
            </View>
            <Txt style={{ color: c.midBlue }}>+91 700 123 456</Txt>
          </Card>
          <Txt style={{ fontSize: 13, color: c.midBlue }}>
            ♧ You can’t lose hearts here.
          </Txt>
        </>
      ) : budget ? (
        <>
          <Card>
            <Label>MONTHLY INCOME</Label>
            <Txt style={{ fontSize: 32, lineHeight: 42, fontWeight: "700" }}>
              {money[s.country]} {s.country === "US" ? "2,000" : "32,000"}
            </Txt>
            <Row style={{ marginVertical: 12 }}>
              {[3, 2, 2, 1, 1].map((v, i) => (
                <View
                  key={i}
                  style={{
                    height: 12,
                    flex: v,
                    backgroundColor: [
                      c.brightBlue,
                      c.lightBlue,
                      c.midBlue,
                      c.deepBlue,
                      c.darkBlue,
                    ][i],
                    borderRadius: 4,
                  }}
                />
              ))}
            </Row>
            {["Rent", "Food", "Transport", "School fees", "Savings"].map(
              (name, i) => (
                <Row key={name}>
                  <Txt style={{ color: c.midBlue, fontSize: 14 }}>{name}</Txt>
                  <Txt style={{ fontWeight: "700", fontSize: 14 }}>
                    {money[s.country]}{" "}
                    {s.country === "US"
                      ? [750, 375, 250, 125, 187][i]
                      : ["12k", "6k", "4k", "2k", "3k"][i]}
                  </Txt>
                </Row>
              ),
            )}
          </Card>
          <Card
            style={{
              backgroundColor: "#FFF7DD",
              borderColor: c.coinGold,
              borderWidth: 2,
              borderBottomWidth: 2,
            }}
          >
            <Txt style={{ fontWeight: "700", color: "#8C6200" }}>
              ϟ Surprise!
            </Txt>
            <Txt>
              Your phone broke — repair costs {money[s.country]}{" "}
              {s.country === "US" ? "180" : "3,000"}.
            </Txt>
          </Card>
          <Txt style={{ fontWeight: "700" }}>What will you adjust first?</Txt>
        </>
      ) : (
        <Card>
          <Kiko size={100} />
          <Txt>{t(`journey.lesson.tips.${tipKey}`)}</Txt>
          <Txt style={{ fontWeight: "700" }}>
            {t("journey.lesson.question")}
          </Txt>
        </Card>
      )}
      <Row>
        {(scam
          ? ["Scam", "Legit"]
          : budget
            ? ["Food", "Savings", "Transport"]
            : ["A", "B"]
        ).map((option) => (
          <Choice
            key={option}
            title={scam ? (option === "Scam" ? "🚩 Scam" : "✓ Legit") : option}
            selected={answer === option}
            onPress={() => {
              setAnswer(option);
              setChecked(false);
            }}
            style={{ flex: 1 }}
          />
        ))}
      </Row>
      {!scam && !budget && (
        <Txt>
          A. {t(`journey.lesson.safe.${safeKey}`)}
          {"\n"}B. {t(`journey.lesson.risky.${riskyKey}`)}
        </Txt>
      )}
      {checked && !correct && (
        <Card style={{ backgroundColor: "#FFF1F1" }}>
          <Txt accessibilityLiveRegion="polite" style={{ color: c.error }}>
            {t("journey.lesson.tryAgain")}
          </Txt>
        </Card>
      )}
      <Button title={`${t("check")}  ✓`} disabled={!answer} onPress={check} />
    </Screen>
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
        <Kiko pulse />
      </View>
      <View style={{ alignItems: "center", gap: 20, paddingVertical: 30 }}>
        <Label>{t("journey.success.label")}</Label>
        <Txt style={{ fontSize: 58, lineHeight: 70, color: c.success }}>
          {t("journey.success.nice")}
        </Txt>
        <Card style={{ backgroundColor: "#FFF5CF", borderBottomWidth: 0 }}>
          <Txt style={{ color: "#906900", fontWeight: "700" }}>
            {rewarded === "false"
              ? `✓ ${t("journey.success.practiced")}`
              : `● ${t("journey.success.coins", { count: COINS_PER_LESSON })}`}
          </Txt>
        </Card>
        <Txt style={{ textAlign: "center", color: c.midBlue }}>
          {t("journey.success.message")}
        </Txt>
      </View>
      <Button
        title={`${t("keep")}  →`}
        onPress={() => router.replace("/roadmap")}
      />
    </Screen>
  );
}
export function Shop() {
  const s = useApp();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const items = [
    ["freeze", "❄️", t("journey.shop.items.freeze"), 40],
    ["heart", "❤️", t("journey.shop.items.heart"), 60],
    ["family", "👪", t("journey.shop.items.family"), 120],
    [
      "outfit",
      "✦",
      t("journey.shop.items.outfit", {
        country: t(`setup.countries.${s.country}`),
      }),
      90,
    ],
  ] as const;
  return (
    <Screen footer={<Nav active="shop" />}>
      <Label>{t("wallet")}</Label>
      <Txt style={{ fontSize: 38, lineHeight: 48 }}>🟡 {s.coins}</Txt>
      <View>
        <Title>{t("shop")}</Title>
        <Txt style={{ color: c.midBlue }}>{t("shopSub")}</Txt>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {items.map(([id, icon, name, price]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={
              s.purchases.includes(id)
                ? t("journey.shop.owned", { name })
                : t("journey.shop.price", { name, count: price })
            }
            accessibilityState={{
              disabled: s.purchases.includes(id) || s.coins < price,
            }}
            onPress={() => {
              if (s.purchases.includes(id)) return;
              const ok = s.buy(id, price);
              setMessage(
                ok
                  ? t("journey.shop.added", { name })
                  : t("journey.shop.needCoins"),
              );
            }}
            style={{ width: "48%" }}
          >
            <Card style={{ minHeight: 215 }}>
              <View
                style={{
                  backgroundColor: c.iceBlue,
                  borderRadius: 20,
                  padding: 14,
                  alignSelf: "flex-start",
                }}
              >
                <Txt style={{ fontSize: 34, lineHeight: 42 }}>{icon}</Txt>
              </View>
              <Txt style={{ fontWeight: "700" }}>{name}</Txt>
              <Row style={{ marginTop: "auto" }}>
                <Txt style={{ color: "#8C6200" }}>● {price}</Txt>
                <Txt style={{ fontSize: 24 }}>
                  {s.purchases.includes(id) ? "✓" : "+"}
                </Txt>
              </Row>
            </Card>
          </Pressable>
        ))}
      </View>
      {message && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
      <Card style={{ backgroundColor: c.lightBlue, borderBottomWidth: 0 }}>
        <Txt>
          ♛ <Txt style={{ fontWeight: "700" }}>{t("journey.shop.free")}</Txt>{" "}
          {t("journey.shop.freeDetail")}
        </Txt>
      </Card>
      {s.purchases.length > 0 && (
        <Card>
          <Label>{t("journey.shop.collection")}</Label>
          {items
            .filter(([id]) => s.purchases.includes(id))
            .map(([id, icon, name]) => (
              <Txt key={id}>
                {icon} {name}
              </Txt>
            ))}
        </Card>
      )}
    </Screen>
  );
}
export function Practice() {
  const s = useApp();
  const { t } = useTranslation();
  return (
    <Screen footer={<Nav active="practice" />}>
      <Label>{t("journey.practice.label")}</Label>
      <Title>{t("journey.practice.title")}</Title>
      <Txt style={{ color: c.midBlue }}>{t("journey.practice.subtitle")}</Txt>
      {lessons
        .filter((l) => s.completed.includes(l.id))
        .map((l) => (
          <Card key={l.id}>
            <Txt style={{ fontWeight: "700" }}>
              {t(`journey.lessons.${l.id}`)}
            </Txt>
            <Button
              secondary
              title={`${t("journey.practice.again")} →`}
              accessibilityLabel={t("journey.practice.again")}
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
      <Label>{t("journey.leagues.label")}</Label>
      <Title>{t("journey.leagues.title")}</Title>
      <Kiko />
      <Card>
        <Txt style={{ fontSize: 28, fontWeight: "700" }}>
          ♨ {t("journey.leagues.streak", { count: s.streak })}
        </Txt>
        <Txt>
          {t("journey.leagues.completed", { count: s.completed.length })}
        </Txt>
        <Txt>● {t("journey.leagues.coins", { count: s.coins })}</Txt>
      </Card>
      <Txt style={{ color: c.midBlue }}>{t("journey.leagues.soon")}</Txt>
      <Button
        title={`${t("journey.leagues.keepLearning")} →`}
        accessibilityLabel={t("journey.leagues.keepLearning")}
        onPress={() => router.replace("/roadmap")}
      />
    </Screen>
  );
}
