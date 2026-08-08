import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import ko from "../locales/ko.json";
import zh from "../locales/zh.json";

const SUPPORTED_LOCALES = ["en", "fr", "ko", "zh"] as const;
export const LOCALE_STORAGE_KEY = "locale";

function detectLocale(): string {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored;
  }

  for (const browserLang of navigator.languages ?? [navigator.language]) {
    const shortLang = browserLang.split("-")[0].toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(shortLang)) {
      return shortLang;
    }
  }

  return "en";
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { en, fr, ko, zh },
});

export default i18n;
