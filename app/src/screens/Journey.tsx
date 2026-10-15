import React, { useEffect, useState } from "react";
import { View, Pressable, Alert, AccessibilityInfo } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import Svg, { Path } from "react-native-svg";
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
  Landscape,
  Card,
  Nav,
  c,
} from "../components/ui";
import { lessons } from "./Onboarding";
import { ApiLesson } from "../components/ApiLesson";
import { isApiConfigured } from "../api/client";
import { serverLessonId } from "../api/lessons";
const money = { US: "$", MX: "MX$", KE: "KSh" };
export function Roadmap() {
  const s = useApp();
  return (
    <Screen dark footer={<Nav active="path" />}>
      <Row>
        {[`♨ ${s.streak}`, `● ${s.coins}`, `♥ ${s.hearts}`].map((text) => (
          <View
            key={text}
            style={{
              backgroundColor: c.darkBlue,
              padding: 13,
              borderRadius: 16,
            }}
          >
            <Txt style={{ color: c.white, fontWeight: "700" }}>{text}</Txt>
          </View>
        ))}
      </Row>
      <Card
        style={{ backgroundColor: c.deepBlue, borderBottomColor: c.darkBlue }}
      >
        <Label light>UNIT 1</Label>
        <Row>
          <Txt style={{ color: c.white, fontSize: 25, fontWeight: "700" }}>
            Money basics
          </Txt>
          <Txt style={{ color: c.lightBlue }}>
            {s.completed.length} / {lessons.length}
          </Txt>
        </Row>
      </Card>
      <View style={{ position: "relative", paddingVertical: 15, gap: 32 }}>
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 640"
            preserveAspectRatio="none"
          >
            <Path
              d="M48 30 C48 140 95 180 48 260 S48 440 48 620"
              fill="none"
              stroke={c.lightBlue}
              strokeWidth="4"
              strokeDasharray="6 8"
            />
          </Svg>
        </View>
        {[
          ...lessons,
          ...s.bonus.map((title, i) => ({ id: `bonus-${i}`, title })),
        ].map((lesson, i) => {
          const done = s.completed.includes(lesson.id);
          const locked =
            i > 0 &&
            !s.completed.includes(lessons[i - 1]?.id) &&
            !lesson.id.startsWith("bonus");
          return (
            <Pressable
              key={lesson.id}
              accessibilityRole="button"
              accessibilityLabel={`${lesson.title}, ${done ? "completed" : locked ? "locked" : "available"}`}
              accessibilityState={{ disabled: locked }}
              onPress={() => {
                if (locked) {
                  Alert.alert(
                    "Keep going",
                    "Complete the previous lesson to unlock this one.",
                  );
                  return;
                }
                router.push({ pathname: "/lesson", params: { id: lesson.id } });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 20,
                minHeight: 92,
              }}
            >
              <View
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 45,
                  borderWidth: 7,
                  borderColor: done
                    ? "#FFE08A"
                    : locked
                      ? "#E3E8F0"
                      : c.brightBlue,
                  backgroundColor: done
                    ? c.coinGold
                    : locked
                      ? c.grey
                      : c.deepBlue,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt
                  style={{ color: c.white, fontSize: 34, fontWeight: "800" }}
                >
                  {done ? "✓" : locked ? "▣" : "➜"}
                </Txt>
              </View>
              <Card
                style={{ flex: 1, padding: 14, opacity: locked ? 0.75 : 1 }}
              >
                <Txt style={{ fontWeight: "700" }}>{lesson.title}</Txt>
                <Txt style={{ fontSize: 12, color: c.midBlue }}>
                  {done
                    ? "Completed"
                    : locked
                      ? "Locked lesson"
                      : "10 min · beginner"}
                </Txt>
              </Card>
            </Pressable>
          );
        })}
        <Row style={{ justifyContent: "flex-start" }}>
          <View
            style={{
              backgroundColor: c.coinGold,
              padding: 18,
              borderRadius: 12,
            }}
          >
            <Txt>✦</Txt>
          </View>
          <Txt style={{ color: c.white, fontWeight: "700" }}>Unit treasure</Txt>
        </Row>
      </View>
      <Landscape country={s.country} />
      <View style={{ position: "absolute", right: 0, bottom: 45 }}>
        <Button title="♩  Ask Kiko" onPress={() => router.push("/ask")} />
      </View>
    </Screen>
  );
}
export function Lesson() {
  const { id = "budget" } = useLocalSearchParams<{ id: string }>();
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const s = useApp();
  const { t } = useTranslation();
  const apiLessonId = serverLessonId(id, s);
  if (isApiConfigured() && apiLessonId) {
    return <ApiLesson routeId={id} lessonId={apiLessonId} />;
  }
  const scam = id === "scams";
  const budget = id === "budget";
  const title =
    lessons.find((l) => l.id === id)?.title ||
    s.bonus[Number(id.split("-")[1])] ||
    "Money basics";
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
        <Choice title="‹" onPress={() => router.replace("/roadmap")} />
        <Progress value={0.6} />
        <Txt>♥ {s.hearts}</Txt>
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
          "Small steps. Stronger future."
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
          <Txt>
            {id === "saving"
              ? "An emergency fund helps you handle unexpected costs. Start with a small amount you can save regularly."
              : id === "borrowing"
                ? "Before borrowing, compare the total repayment, fees, and due dates. Only borrow what you can afford to repay."
                : id.startsWith("bonus")
                  ? "Compare transfer fees and the exchange rate. Use a trusted provider and never share your PIN."
                  : "A bank account can keep your money secure. Keep your PIN private, even if someone claims to work for your bank."}
          </Txt>
          <Txt style={{ fontWeight: "700" }}>Which is the safer choice?</Txt>
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
          A.{" "}
          {id === "borrowing"
            ? "Compare total repayment"
            : id.startsWith("bonus")
              ? "Compare fees and use a trusted provider"
              : "Keep your money and PIN safe"}
          {"\n"}B.{" "}
          {id === "borrowing"
            ? "Borrow without checking fees"
            : "Share your PIN with a stranger"}
        </Txt>
      )}
      {checked && !correct && (
        <Card style={{ backgroundColor: "#FFF1F1" }}>
          <Txt accessibilityLiveRegion="polite" style={{ color: c.error }}>
            Try again.{" "}
            {scam
              ? "A bank will never ask for your PIN. Urgent pressure and shortened links are warning signs."
              : budget
                ? "Protect essentials first. Savings can give you room for an unexpected repair."
                : "Choose the option that protects your money."}
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
        <Label>THAT’S THE WAY</Label>
        <Txt style={{ fontSize: 58, lineHeight: 70, color: c.success }}>
          Nice!
        </Txt>
        <Card style={{ backgroundColor: "#FFF5CF", borderBottomWidth: 0 }}>
          <Txt style={{ color: "#906900", fontWeight: "700" }}>
            {rewarded === "false" ? "✓ Practice complete" : "● +10 coins"}
          </Txt>
        </Card>
        <Txt style={{ textAlign: "center", color: c.midBlue }}>
          One more step toward feeling good about money. Future-you says thanks.
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
    ["freeze", "❄️", "Streak Freeze", 40],
    ["heart", "❤️", "Extra Heart", 60],
    ["family", "👪", "Family Pack lessons", 120],
    [
      "outfit",
      "✦",
      `${{ US: "United States", MX: "Mexico", KE: "Kenya" }[s.country]} Kiko outfit`,
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
            accessibilityLabel={`${name}, ${price} coins${s.purchases.includes(id) ? ", owned" : ""}`}
            accessibilityState={{
              disabled: s.purchases.includes(id) || s.coins < price,
            }}
            onPress={() => {
              if (s.purchases.includes(id)) return;
              const ok = s.buy(id, price);
              setMessage(
                ok
                  ? `${name} added to your collection!`
                  : "You need more coins. Complete lessons to earn them.",
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
          ♛ <Txt style={{ fontWeight: "700" }}>Every lesson is free.</Txt> Shop
          items are just here to make your journey more fun.
        </Txt>
      </Card>
      {s.purchases.length > 0 && (
        <Card>
          <Label>YOUR COLLECTION</Label>
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
  return (
    <Screen footer={<Nav active="practice" />}>
      <Label>A LITTLE EVERY DAY</Label>
      <Title>Practice makes progress.</Title>
      <Txt style={{ color: c.midBlue }}>
        Revisit a lesson. Build your confidence.
      </Txt>
      {lessons
        .filter((l) => s.completed.includes(l.id))
        .map((l) => (
          <Card key={l.id}>
            <Txt style={{ fontWeight: "700" }}>{l.title}</Txt>
            <Button
              secondary
              title="Practice again →"
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
  return (
    <Screen footer={<Nav active="leagues" />}>
      <Label>YOUR PERSONAL BEST</Label>
      <Title>Small wins add up.</Title>
      <Kiko />
      <Card>
        <Txt style={{ fontSize: 28, fontWeight: "700" }}>
          ♨ {s.streak} day streak
        </Txt>
        <Txt>{s.completed.length} lessons completed</Txt>
        <Txt>● {s.coins} coins earned and saved</Txt>
      </Card>
      <Txt style={{ color: c.midBlue }}>
        Community leagues are coming soon. For now, celebrate your own progress.
      </Txt>
      <Button
        title="Keep learning →"
        onPress={() => router.replace("/roadmap")}
      />
    </Screen>
  );
}
