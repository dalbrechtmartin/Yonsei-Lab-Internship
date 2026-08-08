// Shared between GuideMarkRing.vue and GuideMarkLegend.vue -- the numbered
// red badge look used throughout the guide to tie a callout ring to its
// legend entry.
export const MARK_COLOR = "#d6272c";
export const markNumBadgeStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  borderRadius: "9999px",
  background: MARK_COLOR,
  color: "#fff",
  fontSize: "10px",
  fontWeight: "700",
  boxShadow: "0 0 0 2px #fff",
};
