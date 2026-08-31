<template>
  <svg
    class="photon-mascot"
    viewBox="0 0 512 512"
    width="1em"
    height="1em"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Whole-head wobble for "confused" only -- rotates the entire eagle
         (not just one feature), centered on the head's own middle, so it
         reads as "Photon tilting its head" rather than any one part
         drifting out of place. Every other expression stays perfectly
         still, matching the validated wireframe (Claude Design project
         "Screen wireframes progress", artboard 8a) -- no idle animation was
         part of that approval, so none is added here beyond this one
         uncertainty cue and the two small accent-only animations below. -->
    <g :transform="wobbleTransform">
      <!-- Head + wing-tuft silhouette -- identical across all four
           expressions in 8a, so drawn once instead of once per branch. -->
      <path
        d="M256,472l-48,16l-16-16l-64,16c0,0,0.596-24.298,0-24c-30.667,15.333-64,16-64,16l32-64l-80,40l32-64c0,0-40,9.333-40,8c0-59.333,40-144,40-144l-24-8c8-26.667,48-112,48-112s-16.578-7.256-16-8c36.5-47,112-72,112-72l-14.667-9.333C177.333,34.667,214.956,24,256,24s78.667,10.667,102.667,22.667L344,56c0,0,75.5,25,112,72c0.578,0.744-16,8-16,8s40,85.333,48,112l-24,8c0,0,40,84.667,40,144c0,1.333-40-8-40-8l32,64l-80-40l32,64c0,0-33.333-0.667-64-16c-0.596-0.298,0,24,0,24l-64-16l-16,16L256,472z"
        fill="#eef3f7"
        stroke="#1c2541"
        stroke-width="6"
        stroke-linejoin="round"
      />
      <path
        d="M153.875,280.999c0,0-8,111.2,104,139l-24-46.333C233.875,364.399,209.875,299.532,153.875,280.999z"
        fill="#c3bcaa"
        opacity="0.6"
      />
      <path
        d="M361.875,280.999c-56,18.533-80,83.4-80,92.667l-24,46.333C369.875,392.199,361.875,280.999,361.875,280.999z"
        fill="#c3bcaa"
        opacity="0.6"
      />

      <!-- Eyes + accent: the only parts that actually differ per expression. -->
      <template v-if="expression === 'thinking'">
        <circle cx="131" cy="208" r="20" fill="#1c2541" />
        <circle cx="137" cy="201" r="5" fill="#5bc0be" />
        <circle cx="396" cy="208" r="20" fill="#1c2541" />
        <circle cx="402" cy="201" r="5" fill="#5bc0be" />
        <!-- Three trailing dots -- the wireframe's own "processing" cue,
             given a gentle staggered pulse rather than left static. -->
        <g opacity="0.9">
          <circle cx="430" cy="45" r="13" fill="#5bc0be">
            <animate
              v-if="playAnimations"
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              begin="0s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="460" cy="22" r="9" fill="#5bc0be">
            <animate
              v-if="playAnimations"
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="482" cy="5" r="6" fill="#5bc0be">
            <animate
              v-if="playAnimations"
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.4s"
              begin="0.4s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </template>

      <template v-else-if="expression === 'happy'">
        <path
          d="M103,212 Q123,192 143,212"
          stroke="#1c2541"
          stroke-width="11"
          fill="none"
          stroke-linecap="round"
        />
        <path
          d="M368,212 Q388,192 408,212"
          stroke="#1c2541"
          stroke-width="11"
          fill="none"
          stroke-linecap="round"
        />
        <!-- Sparkle -- the wireframe's own "pleased" accent, twinkling
             rather than left flat. -->
        <polygon
          points="430,38 434,52 448,56 434,60 430,74 426,60 412,56 426,52"
          fill="#e69f00"
        >
          <animate
            v-if="playAnimations"
            attributeName="opacity"
            values="0.35;1;0.35"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </polygon>
      </template>

      <template v-else-if="expression === 'confused'">
        <circle cx="123" cy="212" r="20" fill="#1c2541" />
        <circle cx="129" cy="205" r="5" fill="#5bc0be" />
        <circle cx="388" cy="212" r="20" fill="#1c2541" />
        <circle cx="382" cy="205" r="5" fill="#5bc0be" />
        <path d="M100,194 L144,182" stroke="#1c2541" stroke-width="7" stroke-linecap="round" />
        <path d="M368,182 L412,194" stroke="#1c2541" stroke-width="7" stroke-linecap="round" />
        <!-- Tear -- replaces an earlier closed-eyes version that read as
             sleepy rather than uncertain (see the design project's own
             turn-8 notes). -->
        <path
          d="M430,55 C430,55 412,82 412,95 C412,107 420,115 430,115 C440,115 448,107 448,95 C448,82 430,55 430,55 Z"
          fill="#8ec9ea"
          stroke="#1c2541"
          stroke-width="3"
        />
        <ellipse cx="424" cy="98" rx="4" ry="6" fill="#fff" opacity="0.6" />
      </template>

      <template v-else>
        <!-- neutral -->
        <circle cx="123" cy="212" r="20" fill="#1c2541" />
        <circle cx="129" cy="205" r="5" fill="#5bc0be" />
        <circle cx="388" cy="212" r="20" fill="#1c2541" />
        <circle cx="382" cy="205" r="5" fill="#5bc0be" />
      </template>

      <!-- Beak + nostrils -- identical across all four expressions. -->
      <path
        d="M257.475,191.999c35.789,0,50.855,67,53.368,88c1.559,13.021,3.13,41.525-6.702,56c-16.756,24.667-46.918,104-46.918,104s-31.492-79.333-48.987-104c-10.267-14.475-8.625-42.979-6.998-56C203.862,258.999,220.107,191.999,257.475,191.999z"
        fill="#e69f00"
        stroke="#1c2541"
        stroke-width="5"
      />
      <circle cx="232" cy="246" r="5" fill="#1c2541" />
      <circle cx="280" cy="246" r="5" fill="#1c2541" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Photon's four conversational expressions -- ported verbatim from the
 * validated Claude Design wireframe (project "Screen wireframes progress",
 * artboard 8a: "Tete d'aigle -- 7a corrige (base)"), not an original
 * illustration. "neutral" is the resting/greeting state, "thinking" covers
 * an in-flight request (usePhoton()'s `isSending`), "happy" is for a
 * landed, reassuring answer, and "confused" marks a failed turn -- never a
 * harsh/destructive read, just "that one didn't land, here's Retry".
 */
export type PhotonExpression = "neutral" | "thinking" | "happy" | "confused";

const props = withDefaults(
  defineProps<{
    expression?: PhotonExpression;
    /** Set false to freeze the one animation this mascot has (the
     * "confused" head wobble; the thinking-dots pulse and happy-sparkle
     * twinkle are also gated by this) -- e.g. for a static avatar repeated
     * many times down a long transcript. Independent of the OS-level
     * prefers-reduced-motion check this component already applies on its
     * own; either one turns animation off. */
    animated?: boolean;
  }>(),
  { expression: "neutral", animated: true },
);

// This component has no size prop on purpose -- every call site sizes it
// the same way every lucide icon in this app is sized, with a Tailwind
// class on the element itself (`class="size-10"`, `class="size-6
// shrink-0"`, see PhotonMessageList.vue) that Vue's default attrs
// fallthrough merges onto the root <svg>. The `width`/`height="1em"`
// attributes here are just a sane fallback for a call site that forgets to
// size it -- CSS from an explicit sizing class still wins over them.

// Read once at setup, not tracked live -- this is a small per-message
// avatar, not something that needs to react mid-conversation to the user
// toggling their OS motion setting. `animated` above is the per-call-site
// override for the same effect; either turns animation off.
const prefersReducedMotion =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

const playAnimations = computed(() => props.animated && !prefersReducedMotion);

// A static tilt (no <animateTransform>, which would need its own
// start/end keyframes and just looks like a twitch on a component this
// small) reads as "puzzled head-tilt" without needing motion at all --
// applied only while genuinely confused, and only when animation isn't
// suppressed, so a reduced-motion/frozen instance still shows the plain,
// unrotated head rather than a confusing static tilt with no visible cause.
const wobbleTransform = computed(() =>
  props.expression === "confused" && playAnimations.value ? "rotate(-4 256 256)" : undefined,
);
</script>
