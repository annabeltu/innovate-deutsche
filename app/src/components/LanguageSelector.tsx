import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LANGUAGES_BY_COUNTRY } from "../api/learner";
import { useApp, type Language } from "../state/useApp";

/** Language options use their native names so learners can recognize them. */
export const languageOptions: { code: Language; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "sw", name: "Kiswahili" },
];

/** Three evenly sized choices, stacked for small screens and larger text. */
export function LanguageSelector({ stacked = false }: { stacked?: boolean }) {
  const country = useApp((state) => state.country);
  const language = useApp((state) => state.language);
  const { t } = useTranslation();
  return (
    <View className={`mt-2 gap-2 ${stacked ? "flex-col" : "flex-row"}`}>
      {languageOptions
        .filter((option) => LANGUAGES_BY_COUNTRY[country].includes(option.code))
        .map(({ code, name }) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityHint={t("languageSelectHint")}
            accessibilityState={{ checked: language === code }}
            onPress={() => useApp.getState().set({ language: code })}
            className={`min-h-12 items-center justify-center rounded-2xl border-2 px-2 py-3 ${stacked ? "w-full" : "flex-1"} ${language === code ? "border-brand bg-ice" : "border-transparent bg-white"}`}
          >
            <Text className="text-center font-bold text-ink">{name}</Text>
          </Pressable>
        ))}
    </View>
  );
}
