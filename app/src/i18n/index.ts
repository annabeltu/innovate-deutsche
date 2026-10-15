import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import sw from "./locales/sw.json";

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    sw: { translation: sw },
  },
  lng: "en",
  fallbackLng: false,
  interpolation: { escapeValue: false },
});
export default i18n;
