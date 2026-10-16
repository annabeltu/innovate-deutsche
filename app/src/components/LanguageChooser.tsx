import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LANGUAGES_BY_COUNTRY, ensureLearner } from "../api/learner";
import { useApp } from "../state/useApp";
import type { Language } from "../types/api";
import { Button, Card, OptionRow, Txt } from "./ui";

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  es: "Español",
  sw: "Kiswahili",
};

/** Changes lesson language on the same learner and refreshes translated lessons. */
export function LanguageChooser() {
  const country = useApp((state) => state.country);
  const language = useApp((state) => state.language);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const client = useQueryClient();
  const { t } = useTranslation();
  async function changeLanguage(next: Language) {
    setBusy(true);
    setFailed(false);
    useApp.getState().set({ language: next });
    try {
      await ensureLearner();
      await client.invalidateQueries({ queryKey: ["lesson"] });
      await client.invalidateQueries({ queryKey: ["path"] });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Txt accessibilityRole="header" variant="subheading">
        {t("language")}
      </Txt>
      <Txt variant="small">{t("languageHint")}</Txt>
      {LANGUAGES_BY_COUNTRY[country].map((code) => (
        <OptionRow
          key={code}
          accessibilityRole="button"
          title={LANGUAGE_NAMES[code]}
          accessibilityHint={t("app.selectHint")}
          selected={code === language}
          disabled={busy}
          onPress={() => {
            if (code !== language) void changeLanguage(code);
          }}
        />
      ))}
      {busy && <Txt accessibilityLiveRegion="polite">{t("saving")}</Txt>}
      {failed && (
        <>
          <Txt accessibilityLiveRegion="polite">{t("lessonError")}</Txt>
          <Button
            title={t("tryAgain")}
            onPress={() => void changeLanguage(language)}
          />
        </>
      )}
    </Card>
  );
}
