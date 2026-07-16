import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import i18n from "./services/i18n.js";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono";

createApp(App).use(i18n).mount("#app");
