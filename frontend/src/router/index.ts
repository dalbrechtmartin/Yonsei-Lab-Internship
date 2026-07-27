import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import HomeView from "../views/HomeView.vue";
import VisualizationView from "../views/VisualizationView.vue";
import ExtractionView from "../views/ExtractionView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/visualization",
    name: "visualization",
    component: VisualizationView,
  },
  {
    path: "/extraction",
    name: "extraction",
    component: ExtractionView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Extraction is locked in deployed builds while its next version is being
// reworked -- see the matching lock in AppNavbar.vue. This guard is what
// actually blocks the route (typing /extraction directly, old bookmarks),
// the navbar lock icon is just the visible hint.
router.beforeEach((to) => {
  if (import.meta.env.PROD && to.path === "/extraction") {
    return { path: "/" };
  }
});

export default router;