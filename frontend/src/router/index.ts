import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import VisualizationView from "../views/VisualizationView.vue";
import ExtractionView from "../views/ExtractionView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
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