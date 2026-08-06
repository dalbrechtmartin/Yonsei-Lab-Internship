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

export default router;