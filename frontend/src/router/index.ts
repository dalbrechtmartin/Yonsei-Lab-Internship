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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
