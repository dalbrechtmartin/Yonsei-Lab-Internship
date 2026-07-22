import { createApp } from "vue";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono";
import "flag-icons/css/flag-icons.min.css";
import "./style.css";
import App from "./App.vue";
import i18n from "./services/i18n";
import router from "./router";

createApp(App).use(i18n).use(router).mount("#app");