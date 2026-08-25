import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
  },
  {
    path: "/visualization",
    name: "visualization",
    component: () => import("../views/VisualizationView.vue"),
  },
  {
    path: "/extraction",
    name: "extraction",
    component: () => import("../views/ExtractionView.vue"),
  },
  {
    // Not linked from the main nav on purpose -- reachable only via the
    // discreet gamepad icon in the footer (see AppFooter.vue), so playing
    // Photon Dash outside of an extraction run stays an easter egg rather
    // than a listed feature.
    path: "/play",
    name: "play",
    component: () => import("../views/PlayView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
