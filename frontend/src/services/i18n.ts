import { createI18n } from "vue-i18n";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import ko from "../locales/ko.json";
import zh from "../locales/zh.json";

const i18n = createI18n({
  legacy: false,
  locale: "en", // Default language
  fallbackLocale: "en",
  messages: { en, fr, ko, zh },
});

export default i18n;