<template>
  <div class="pd-wrap" :class="{ 'pd-wrap--folded': !expanded }">
    <!-- One persistent button for both states -- toggling used to swap in
         a whole separate element (via Transition mode="out-in"), which
         necessarily unmounts the old one before mounting the new one,
         showing nothing in between for a beat. Same element throughout
         means nothing ever disappears, and collapsed/expanded only ever
         differ by the trailing label + chevron. -->
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center gap-3 rounded-2xl border border-secondary/15 bg-card/80 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-colors hover:border-primary/30 hover:bg-primary/5"
      @click="expanded ? collapse() : expand()"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Gamepad2 class="size-4" />
      </span>
      <span class="min-w-0 flex-1 text-sm font-semibold text-ink">{{
        t("extraction.minigame.title")
      }}</span>
      <span class="flex shrink-0 items-center gap-1 text-xs font-medium text-secondary">
        {{ expanded ? t("extraction.minigame.fold") : t("extraction.minigame.teaser") }}
        <ChevronUp v-if="expanded" class="size-3.5" aria-hidden="true" />
        <ChevronRight v-else class="size-3.5" aria-hidden="true" />
      </span>
    </button>

    <div
      v-if="
        expanded &&
        extractionDone &&
        !bannerDismissed &&
        (phase === 'playing' || phase === 'dying')
      "
      class="mb-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-3.5 py-2.5 text-xs font-medium text-emerald-950"
    >
      <span>{{ t("extraction.minigame.jobDone.message") }}</span>
      <button
        type="button"
        class="shrink-0 text-emerald-900/60 transition-colors hover:text-emerald-900"
        :aria-label="t('extraction.minigame.closeAria')"
        @click="bannerDismissed = true"
      >
        <X class="size-3.5" />
      </button>
    </div>

    <div
      ref="frameEl"
      class="pd-frame"
      :class="{ 'pd-frame--folded': !expanded }"
      role="application"
      :aria-label="t('extraction.minigame.title')"
      :inert="!expanded"
    >
      <canvas ref="canvasEl" class="pd-canvas" />

      <button type="button" class="pd-sound" @click="toggleMute">
        <span class="pd-sound-dot" :class="{ 'pd-sound-dot--on': !muted }" />
        <span>{{
          muted
            ? t("extraction.minigame.hud.soundOff")
            : t("extraction.minigame.hud.soundOn")
        }}</span>
      </button>

      <div v-if="phase === 'playing'" class="pd-status">
        <div v-if="hud.shieldActive" class="pd-pill pd-pill-shield">
          {{ t("extraction.minigame.hud.shield", { count: hud.shieldCount }) }}
        </div>
        <div v-if="hud.superActive" class="pd-timer-pill pd-timer-pill-super">
          <span class="pd-timer-label pd-timer-label-super">{{
            t("extraction.minigame.hud.superShield")
          }}</span>
          <div class="pd-timer-track">
            <div
              class="pd-timer-fill pd-timer-fill-super"
              :class="{ 'pd-timer-fill--warn': hud.superWarn }"
              :style="{ width: hud.superPct + '%' }"
            />
          </div>
        </div>
        <div v-if="hud.doubleActive" class="pd-timer-pill pd-timer-pill-double">
          <span class="pd-timer-label pd-timer-label-double">{{
            t("extraction.minigame.hud.doubleJump")
          }}</span>
          <div class="pd-timer-track">
            <div
              class="pd-timer-fill pd-timer-fill-double"
              :class="{ 'pd-timer-fill--warn': hud.doubleWarn }"
              :style="{ width: hud.doublePct + '%' }"
            />
          </div>
        </div>
      </div>

      <div class="pd-hud">
        <div class="pd-hud-box pd-hud-box-accent">
          <div class="pd-hud-label">{{ t("extraction.minigame.hud.fom") }}</div>
          <div class="pd-hud-value pd-hud-value-accent">{{ scoreStr }}</div>
        </div>
        <div class="pd-hud-box">
          <div class="pd-hud-label">
            {{ t("extraction.minigame.hud.best") }}
          </div>
          <div class="pd-hud-value">{{ bestStr }}</div>
        </div>
      </div>

      <div
        v-if="paused"
        class="pd-overlay pd-overlay-paused"
        @click="resumeGame"
      >
        <div class="pd-panel">
          <span class="pd-corner pd-corner-tl" />
          <span class="pd-corner pd-corner-tr" />
          <span class="pd-corner pd-corner-bl" />
          <span class="pd-corner pd-corner-br" />
          <div class="pd-eyebrow-row">
            <span class="pd-dot" />
            <span class="pd-eyebrow">{{
              t("extraction.minigame.paused.eyebrow")
            }}</span>
          </div>
          <div class="pd-title-sm">
            {{ t("extraction.minigame.paused.title") }}
          </div>
          <div class="pd-divider" />
          <div class="pd-hint">
            {{ t("extraction.minigame.paused.resume") }}
          </div>
        </div>
      </div>

      <div v-if="phase === 'start'" class="pd-overlay" @click="action">
        <div class="pd-panel" @click.stop>
          <span class="pd-corner pd-corner-tl" />
          <span class="pd-corner pd-corner-tr" />
          <span class="pd-corner pd-corner-bl" />
          <span class="pd-corner pd-corner-br" />
          <button
            type="button"
            class="pd-help-btn"
            :aria-label="t('extraction.minigame.helpAria')"
            @click.stop="toggleRules"
          >
            ?
          </button>
          <div class="pd-eyebrow-row">
            <span class="pd-dot" />
            <span class="pd-eyebrow">{{
              t("extraction.minigame.eyebrow")
            }}</span>
          </div>
          <div class="pd-title">{{ t("extraction.minigame.title") }}</div>
          <div class="pd-divider" />
          <button type="button" class="pd-cta" @click.stop="action">
            <span class="pd-blink">{{
              t("extraction.minigame.startCta")
            }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="showRules"
        class="pd-overlay pd-overlay-rules"
        @click="toggleRules"
      >
        <div class="pd-panel pd-panel-rules" @click.stop>
          <button
            type="button"
            class="pd-close-btn"
            :aria-label="t('extraction.minigame.closeAria')"
            @click.stop="toggleRules"
          >
            ×
          </button>
          <div class="pd-eyebrow">
            {{ t("extraction.minigame.rules.title") }}
          </div>
          <p class="pd-rules-text">
            {{ t("extraction.minigame.rules.intro") }}
          </p>
          <canvas ref="legendCanvasEl" class="pd-legend-canvas" />
          <p class="pd-rules-text">
            {{ t("extraction.minigame.rules.powerups") }}
          </p>
          <p class="pd-rules-text">
            {{ t("extraction.minigame.rules.floating") }}
          </p>
        </div>
      </div>

      <div
        v-if="phase === 'gameover'"
        class="pd-overlay pd-overlay-over"
        @click="restart"
      >
        <div class="pd-panel pd-panel-over" @click.stop>
          <span class="pd-corner pd-corner-tl" />
          <span class="pd-corner pd-corner-tr" />
          <span class="pd-corner pd-corner-bl" />
          <span class="pd-corner pd-corner-br" />
          <div class="pd-eyebrow-row">
            <span class="pd-dot pd-dot-red" />
            <span class="pd-eyebrow pd-eyebrow-red">{{
              t("extraction.minigame.gameOver.eyebrow")
            }}</span>
          </div>
          <div class="pd-title-sm">
            {{ t("extraction.minigame.gameOver.title") }}
          </div>
          <div class="pd-divider" />
          <span class="pd-small-label">{{
            t("extraction.minigame.gameOver.scoreLabel")
          }}</span>
          <div class="pd-score">{{ scoreStr }}</div>
          <div class="pd-tier-pill">{{ tierName }}</div>
          <input
            v-model="certName"
            type="text"
            class="pd-name-input"
            :placeholder="t('extraction.minigame.gameOver.namePlaceholder')"
            maxlength="28"
          />
          <button
            type="button"
            class="pd-download-btn"
            @click="downloadCertificate"
          >
            {{ t("extraction.minigame.gameOver.download") }}
          </button>
          <div class="pd-hint">
            {{ t("extraction.minigame.gameOver.replayHint") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronRight, ChevronUp, Gamepad2, X } from "@lucide/vue";

const { t, locale } = useI18n();

const props = withDefaults(
  defineProps<{
    // Surfaces the "extraction finished, want to keep playing?" banner --
    // owned by the parent (ExtractionView), which is the one that knows
    // whether a batch just completed.
    extractionDone?: boolean;
    // False on the dedicated /play page (see PlayView), where playing IS
    // the point of the page -- there's nothing to fold it back into, so
    // neither the teaser nor the fold button make sense there. True on the
    // extraction page, where the game is a side activity the researcher
    // can tuck away.
    collapsible?: boolean;
  }>(),
  { extractionDone: false, collapsible: true },
);

const emit = defineEmits<{
  (e: "expanded-change", expanded: boolean): void;
}>();

// Fixed internal canvas resolution -- CSS scales the element (width:100%;
// height:auto), the drawing coordinate space itself never changes.
const W = 960;
const H = 480;
const G = 384; // ground line, in canvas pixels
const PX = 140; // photon's fixed x position
const PHOTON_R = 13;
const DOUBLE_DURATION = 600; // frames (~10s at 60fps)
const SUPER_DURATION = 600;
const WARN_FRAMES = 120;
const SHIELD_TO_SUPER = 3; // stacked shields that auto-convert into a super shield
const OBSTACLE_BREAK_SCORE = 12; // points per obstacle destroyed while super is active
const GATE_SCORE = 30; // points for double-jumping through an air gate

type ObstacleType = "noise" | "block" | "peak" | "drift";
interface Obstacle {
  type: ObstacleType;
  x: number;
  w: number;
  h: number;
  spikes?: number[];
  floatY?: number;
  scored?: boolean;
}

type OrbKind = "shield" | "double" | "super" | "Q" | "FOM";
interface Orb {
  kind: OrbKind;
  val: number;
  x: number;
  y: number;
  taken?: boolean;
}

// Airborne bonus ring, only spawned while double jump is active -- placed
// above single-jump apex height so reaching it proves the player actually
// used the second jump rather than just being airborne.
interface Gate {
  x: number;
  y: number;
  r: number;
  taken?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  scale: number;
  kind: OrbKind;
}

interface RunState {
  photon: { y: number; vy: number; grounded: boolean };
  obstacles: Obstacle[];
  orbs: Orb[];
  gates: Gate[];
  particles: Particle[];
  floats: FloatText[];
  speed: number;
  dist: number;
  bonus: number;
  near: number;
  airborneCollect: number;
  nextObs: number;
  nextOrb: number;
  nextGate: number;
  frame: number;
  jumpsUsed: number;
  doubleTimer: number;
  superTimer: number;
  shieldCount: number;
  shieldFlash: number;
  dyingFrames: number;
  pendingScore: number;
}

type Phase = "start" | "playing" | "dying" | "gameover";

const TIER_MINS = [0, 1500, 4000, 9000, 18000];

function tierIndexFor(scoreVal: number): number {
  let idx = 0;
  for (let i = 0; i < TIER_MINS.length; i++) {
    if (scoreVal >= TIER_MINS[i]) idx = i;
  }
  return idx;
}

function wrapCenter(
  c: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  c.textAlign = "center";
  lines.forEach((l, i) => c.fillText(l, cx, startY + i * lineHeight));
}

const DATE_LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ko: "ko-KR",
  zh: "zh-CN",
};

const canvasEl = ref<HTMLCanvasElement | null>(null);
const legendCanvasEl = ref<HTMLCanvasElement | null>(null);

const phase = ref<Phase>("start");
const score = ref(0);
const best = ref(0);
const muted = ref(true);
const certName = ref("");
const showRules = ref(false);
// Folded by default on the extraction page -- ExtractionRunningStep shows
// a live PDF preview of the current file in the space this vacates, so the
// researcher has something useful to read before opting into the game.
// Always expanded on the standalone /play page (collapsible is false
// there): there's no fold button and nothing else to show in its place.
const expanded = ref(!props.collapsible);
// True while a round is frozen -- either the player clicked outside the
// game frame (see onDocumentPointerDown) or just re-expanded a folded
// game that was mid-round (see expand()). Only meaningful during
// "playing"; update()/loop() below skip simulating the run while this
// is set, so nothing moves and nothing can kill the player off-screen.
const paused = ref(false);
const bannerDismissed = ref(false);
const frameEl = ref<HTMLElement | null>(null);
// Bumped to force the throttled `hud` computed below to re-read `run`
// (a plain, non-reactive object -- see the comment on `run`).
const hudTick = ref(0);

// `run`, `tick`, `ctx` etc. are deliberately plain variables, not Vue
// refs/reactive(): they're mutated dozens of times per animation frame
// (array pushes/filters, position updates) and are only ever read from
// the imperative draw()/update() functions, never bound in the template.
// Wrapping them in Vue's reactivity would proxy every one of those
// mutations for no benefit -- the canvas render loop stays entirely
// outside Vue's reactivity system, which is what keeps this cheap at
// 60fps. The small "hud" pill data below is the one bit of run state the
// template needs, so it's surfaced through the throttled hudTick poke.
let run: RunState | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let legendCtx: CanvasRenderingContext2D | null = null;
let raf = 0;
let tick = 0;
let overAt = 0;
let audioCtx: AudioContext | null = null;

const scoreStr = computed(() => String(score.value).padStart(4, "0"));
const bestStr = computed(() => String(best.value).padStart(4, "0"));
const tierName = computed(() =>
  t(`extraction.minigame.tiers.${tierIndexFor(score.value)}`),
);

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

const hud = computed(() => {
  const _tick = hudTick.value; // eslint: underscore marks a deliberately-unused read
  void _tick;
  const r = run;
  const playing = phase.value === "playing";
  return {
    shieldActive: !!r && r.shieldCount > 0 && playing,
    shieldCount: r ? r.shieldCount : 0,
    doubleActive: !!r && r.doubleTimer > 0 && playing,
    doublePct: r ? clampPct((r.doubleTimer / DOUBLE_DURATION) * 100) : 0,
    doubleWarn: !!r && r.doubleTimer > 0 && r.doubleTimer < WARN_FRAMES,
    superActive: !!r && r.superTimer > 0 && playing,
    superPct: r ? clampPct((r.superTimer / SUPER_DURATION) * 100) : 0,
    superWarn: !!r && r.superTimer > 0 && r.superTimer < WARN_FRAMES,
  };
});

function newRun(): RunState {
  return {
    photon: { y: G - PHOTON_R, vy: 0, grounded: true },
    obstacles: [],
    orbs: [],
    gates: [],
    particles: [],
    floats: [],
    speed: 4.2,
    dist: 0,
    bonus: 0,
    near: 0,
    airborneCollect: 0,
    nextObs: 150,
    nextOrb: 150,
    nextGate: 60,
    frame: 0,
    jumpsUsed: 0,
    doubleTimer: 0,
    superTimer: 0,
    shieldCount: 0,
    shieldFlash: 0,
    dyingFrames: 0,
    pendingScore: 0,
  };
}

function startGame() {
  run = newRun();
  score.value = 0;
  phase.value = "playing";
  paused.value = false;
  bannerDismissed.value = false;
  hudTick.value++;
}

function restart() {
  startGame();
}

/** Starts/stops the rAF loop to match whether the game is actually visible
 * -- folded (see `expanded`) or on a backgrounded tab (see
 * onVisibilityChange) both mean nothing needs to be simulated or drawn, so
 * this is the single place both paths funnel through instead of each
 * managing `raf` independently. */
function syncLoop() {
  const shouldRun = expanded.value && !document.hidden;
  if (shouldRun && !raf) {
    raf = requestAnimationFrame(loop);
  } else if (!shouldRun && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function expand() {
  expanded.value = true;
  // Re-opening a folded game that was mid-run lands paused rather than
  // instantly live -- obstacles would otherwise be barrelling toward the
  // photon the instant the frame reappears, before the player's even
  // looked at the screen again.
  if (phase.value === "playing") paused.value = true;
  syncLoop();
  emit("expanded-change", true);
}

function collapse() {
  if (!props.collapsible) return;
  expanded.value = false;
  syncLoop();
  emit("expanded-change", false);
}

function resumeGame() {
  paused.value = false;
}

function ensureAudio(): AudioContext | null {
  if (!audioCtx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

function beep(
  freq: number,
  dur = 0.08,
  type: OscillatorType = "sine",
  gain = 0.05,
) {
  if (muted.value) return;
  const ctxA = ensureAudio();
  if (!ctxA) return;
  const osc = ctxA.createOscillator();
  const g = ctxA.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ctxA.currentTime + dur);
  osc.connect(g);
  g.connect(ctxA.destination);
  osc.start();
  osc.stop(ctxA.currentTime + dur);
}

function doJump() {
  if (!run) return;
  const p = run.photon;
  if (p.grounded) {
    p.vy = -13.5;
    p.grounded = false;
    run.jumpsUsed = 1;
    beep(420, 0.07);
  } else if (run.doubleTimer > 0 && run.jumpsUsed < 2) {
    p.vy = -13.5;
    run.jumpsUsed = 2;
    beep(560, 0.07);
  }
}

function action() {
  if (phase.value === "start") return startGame();
  if (phase.value === "playing") return doJump();
  if (phase.value === "gameover" && performance.now() - overAt > 350) {
    startGame();
  }
}

function toggleMute() {
  muted.value = !muted.value;
}

function toggleRules() {
  showRules.value = !showRules.value;
}

function spawnObstacle() {
  if (!run) return;
  const roll = Math.random();
  let o: Obstacle;
  if (roll < 0.32) {
    o = {
      type: "noise",
      x: 1000,
      w: 46,
      h: 36 + Math.random() * 14,
      spikes: Array.from({ length: 5 }, () => 0.45 + Math.random() * 0.55),
    };
  } else if (roll < 0.56) {
    o = { type: "block", x: 1000, w: 50, h: 30 + Math.random() * 12 };
  } else if (roll < 0.78) {
    o = { type: "peak", x: 1000, w: 110 + Math.random() * 50, h: 30 };
  } else {
    o = {
      type: "drift",
      x: 1000,
      w: 54,
      h: 22,
      floatY: 384 - (95 + Math.random() * 55),
    };
  }
  run.obstacles.push(o);
}

function spawnOrb() {
  if (!run) return;
  const roll = Math.random();
  const kind: OrbKind =
    roll < 0.08
      ? "shield"
      : roll < 0.16
        ? "double"
        : roll < 0.21
          ? "super"
          : roll < 0.55
            ? "Q"
            : "FOM";
  const val = kind === "Q" ? 45 : kind === "FOM" ? 18 : 0;
  run.orbs.push({
    kind,
    val,
    x: 1000 + Math.random() * 80,
    y: 384 - (75 + Math.random() * 85),
  });
}

function spawnGate() {
  if (!run) return;
  // 190-250px above ground: clears a single jump's ~175px apex, so only a
  // well-timed double jump can actually reach one.
  const height = 190 + Math.random() * 60;
  run.gates.push({ x: 1000 + Math.random() * 60, y: G - height, r: 30 });
}

function burstAt(
  cx: number,
  cy: number,
  colorA = "230,159,0",
  colorB = "255,214,110",
) {
  if (!run) return;
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.2 + Math.random() * 3.8;
    run.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1.5,
      size: 1.5 + Math.random() * 2.5,
      alpha: 1,
      color: Math.random() < 0.6 ? colorA : colorB,
    });
  }
}

function triggerDeath() {
  if (!run) return;
  const p = run.photon;
  run.speed = 0;
  run.dyingFrames = 0;
  run.particles = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4.5;
    run.particles.push({
      x: PX,
      y: p.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1,
      size: 2 + Math.random() * 3,
      alpha: 1,
      color: Math.random() < 0.5 ? "91,192,190" : "238,243,247",
    });
  }
  beep(180, 0.25, "sawtooth", 0.06);
  phase.value = "dying";
}

function finalizeGameOver() {
  overAt = performance.now();
  const finalScore = run?.pendingScore ?? score.value;
  score.value = finalScore;
  best.value = Math.max(best.value, finalScore);
  phase.value = "gameover";
  hudTick.value++;
}

function updateParticles() {
  if (!run) return;
  run.dyingFrames++;
  for (const pt of run.particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.28;
    pt.alpha -= 0.02;
  }
  run.particles = run.particles.filter((pt) => pt.alpha > 0);
  if (run.dyingFrames > 46) finalizeGameOver();
}

function update() {
  if (!run) return;
  const r = run;
  const p = r.photon;
  r.frame++;
  const rampStart = 480;
  if (r.frame > rampStart) r.speed = Math.min(6, r.speed + 0.0005);
  const effSpeed = r.superTimer > 0 ? r.speed * 1.6 : r.speed;
  r.dist += effSpeed;
  if (r.doubleTimer > 0) r.doubleTimer--;
  p.vy += 0.52;
  p.y += p.vy;
  if (p.y >= G - PHOTON_R) {
    p.y = G - PHOTON_R;
    p.vy = 0;
    if (!p.grounded) {
      p.grounded = true;
      r.jumpsUsed = 0;
      r.airborneCollect = 0;
    }
  }
  const gapScale = r.frame < rampStart ? 1.4 : 1;
  if (--r.nextObs <= 0) {
    spawnObstacle();
    r.nextObs = (85 + Math.random() * 95) * gapScale;
  }
  if (--r.nextOrb <= 0) {
    spawnOrb();
    r.nextOrb = 130 + Math.random() * 160;
  }
  if (--r.nextGate <= 0) {
    r.nextGate = 90 + Math.random() * 80;
    if (r.doubleTimer > 0) spawnGate();
  }
  for (const o of r.obstacles) o.x -= effSpeed;
  for (const o of r.orbs) o.x -= effSpeed;
  for (const g of r.gates) g.x -= effSpeed;
  for (const o of r.obstacles) {
    if (!o.scored && o.x + o.w < PX - 30) {
      o.scored = true;
      if (Math.abs(p.y - (G - PHOTON_R)) > 24) r.near += 5;
    }
  }
  r.obstacles = r.obstacles.filter((o) => o.x + o.w > -60);
  for (const o of r.orbs) {
    const dx = PX - o.x;
    const dy = p.y - o.y;
    if (!o.taken && dx * dx + dy * dy < 26 * 26) {
      o.taken = true;
      if (o.kind === "shield") {
        r.shieldCount++;
        beep(500, 0.1);
        if (r.shieldCount >= SHIELD_TO_SUPER) {
          r.shieldCount = 0;
          r.superTimer = SUPER_DURATION;
          burstAt(PX, p.y);
          beep(880, 0.18);
        }
      } else if (o.kind === "double") {
        r.doubleTimer = DOUBLE_DURATION;
        beep(700, 0.12);
      } else if (o.kind === "super") {
        r.superTimer = SUPER_DURATION;
        beep(880, 0.15);
      } else {
        if (!p.grounded) r.airborneCollect++;
        const mult =
          1 + Math.min(2, (p.grounded ? 0 : r.airborneCollect - 1) * 0.5);
        const gained = Math.round(o.val * mult);
        r.bonus += gained;
        r.floats.push({
          x: o.x,
          y: o.y,
          text: "+" + gained,
          alpha: 1,
          vy: -1.1,
          scale: 0.6,
          kind: o.kind,
        });
        beep(o.kind === "Q" ? 660 : 520, 0.07);
      }
    }
  }
  r.orbs = r.orbs.filter((o) => !o.taken && o.x > -60);
  for (const g of r.gates) {
    const dx = PX - g.x;
    const dy = p.y - g.y;
    if (!g.taken && dx * dx + dy * dy < (g.r + PHOTON_R) * (g.r + PHOTON_R)) {
      g.taken = true;
      r.bonus += GATE_SCORE;
      r.floats.push({
        x: g.x,
        y: g.y,
        text: "+" + GATE_SCORE,
        alpha: 1,
        vy: -1.1,
        scale: 0.6,
        kind: "double",
      });
      beep(760, 0.1);
    }
  }
  r.gates = r.gates.filter((g) => !g.taken && g.x > -80);
  if (r.shieldFlash > 0) r.shieldFlash--;
  for (const o of r.obstacles) {
    let cx: number;
    let cy: number;
    if (o.type === "drift") {
      cx = Math.max(o.x, Math.min(PX, o.x + o.w));
      const floatY = o.floatY ?? 0;
      const topY = floatY - o.h / 2;
      const botY = floatY + o.h / 2;
      cy = Math.max(topY, Math.min(p.y, botY));
    } else {
      let ox = o.x;
      let ow = o.w;
      let oh = o.h;
      if (o.type === "peak") {
        ox += ow * 0.14;
        ow *= 0.72;
        oh *= 0.9;
      }
      cx = Math.max(ox, Math.min(PX, ox + ow));
      cy = Math.max(G - oh, Math.min(p.y, G));
    }
    const dx = PX - cx;
    const dy = p.y - cy;
    if (dx * dx + dy * dy < 100) {
      if (r.superTimer > 0) {
        burstAt(cx, cy);
        o.x = -999;
        r.bonus += OBSTACLE_BREAK_SCORE;
        r.floats.push({
          x: cx,
          y: cy,
          text: "+" + OBSTACLE_BREAK_SCORE,
          alpha: 1,
          vy: -1.1,
          scale: 0.6,
          kind: "super",
        });
        beep(300, 0.08, "square", 0.04);
      } else if (r.shieldCount > 0) {
        r.shieldCount--;
        r.shieldFlash = 10;
        burstAt(cx, cy, "91,192,190", "223,253,252");
        o.x = -999;
        beep(200, 0.12, "square", 0.05);
      } else {
        triggerDeath();
        return;
      }
    }
  }
  if (r.superTimer > 0) r.superTimer--;
  if (r.particles.length) {
    for (const pt of r.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.28;
      pt.alpha -= 0.03;
    }
    r.particles = r.particles.filter((pt) => pt.alpha > 0);
  }
  if (r.floats.length) {
    for (const f of r.floats) {
      f.x -= r.speed;
      f.y += f.vy;
      f.vy *= 0.96;
      f.scale = Math.min(1, f.scale + 0.12);
      f.alpha -= 0.018;
    }
    r.floats = r.floats.filter((f) => f.alpha > 0);
  }
  const survivalMult = 1 + Math.min(1, r.frame / 1800);
  const sc = Math.floor((r.dist / 12) * survivalMult) + r.bonus + r.near;
  r.pendingScore = sc;
  if (sc !== score.value && r.frame % 5 === 0) score.value = sc;
  if (r.frame % 4 === 0) hudTick.value = r.frame;
}

function drawFloats(c: CanvasRenderingContext2D) {
  if (!run) return;
  for (const f of run.floats) {
    const color =
      f.kind === "Q"
        ? "255,214,110"
        : f.kind === "double"
          ? "204,121,167"
          : "230,159,0";
    c.save();
    c.globalAlpha = Math.max(0, f.alpha);
    c.font = `700 ${13 * f.scale}px 'IBM Plex Mono', monospace`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = `rgba(${color},0.8)`;
    c.shadowBlur = 6;
    c.fillStyle = `rgb(${color})`;
    c.fillText(f.text, f.x, f.y);
    c.restore();
  }
}

function drawParticles(c: CanvasRenderingContext2D) {
  if (!run) return;
  for (const pt of run.particles) {
    c.fillStyle = `rgba(${pt.color},${Math.max(0, pt.alpha)})`;
    c.beginPath();
    c.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    c.fill();
  }
}

function drawObstacle(c: CanvasRenderingContext2D, o: Obstacle) {
  if (o.type === "drift") {
    const floatY = o.floatY ?? 0;
    const cy = floatY + Math.sin(tick * 0.08 + o.x * 0.05) * 4;
    const cx0 = o.x + o.w / 2;
    c.save();
    const glow = c.createRadialGradient(cx0, cy, 2, cx0, cy, o.w * 0.65);
    glow.addColorStop(0, "rgba(238,243,247,0.3)");
    glow.addColorStop(1, "rgba(238,243,247,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(cx0, cy, o.w * 0.6, o.h * 1.4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(238,243,247,0.9)";
    c.lineWidth = 2;
    c.shadowColor = "rgba(91,192,190,0.6)";
    c.shadowBlur = 7;
    c.beginPath();
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const tt = i / 20;
      const x = o.x + tt * o.w;
      const y = cy + Math.sin(tt * Math.PI * 3 + tick * 0.15) * o.h * 0.42;
      pts.push([x, y]);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = "#eef3f7";
    [0, 10, 20].forEach((i) => {
      const [x, y] = pts[i];
      c.beginPath();
      c.arc(x, y, 2.4, 0, Math.PI * 2);
      c.fill();
    });
    c.restore();
    return;
  }
  if (o.type === "noise") {
    const spikes = o.spikes ?? [];
    const n = spikes.length;
    const barW = (o.w / n) * 0.58;
    c.save();
    c.shadowColor = "rgba(238,243,247,0.35)";
    c.shadowBlur = 4;
    for (let i = 0; i < n; i++) {
      const bh = o.h * spikes[i];
      const bx = o.x + (o.w * (i + 0.5)) / n - barW / 2;
      const by = G - bh;
      const grad = c.createLinearGradient(0, by, 0, G);
      grad.addColorStop(0, "rgba(238,243,247,0.95)");
      grad.addColorStop(1, "rgba(238,243,247,0.2)");
      c.fillStyle = grad;
      const rad = 2.5;
      c.beginPath();
      c.moveTo(bx + rad, by);
      c.arcTo(bx + barW, by, bx + barW, by + rad, rad);
      c.lineTo(bx + barW, G);
      c.lineTo(bx, G);
      c.lineTo(bx, by + rad);
      c.arcTo(bx, by, bx + rad, by, rad);
      c.closePath();
      c.fill();
    }
    c.restore();
  } else if (o.type === "block") {
    c.fillStyle = "rgba(140,170,210,0.14)";
    c.fillRect(o.x, G - o.h, o.w, o.h);
    c.strokeStyle = "rgba(220,232,244,0.7)";
    c.lineWidth = 1.5;
    c.strokeRect(o.x, G - o.h, o.w, o.h);
    c.strokeStyle = "rgba(220,232,244,0.25)";
    c.beginPath();
    c.moveTo(o.x + 4, G - 4);
    c.lineTo(o.x + o.w - 4, G - o.h + 4);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(o.x, G);
    c.bezierCurveTo(
      o.x + o.w * 0.3,
      G,
      o.x + o.w * 0.2,
      G - o.h,
      o.x + o.w * 0.5,
      G - o.h,
    );
    c.bezierCurveTo(o.x + o.w * 0.8, G - o.h, o.x + o.w * 0.7, G, o.x + o.w, G);
    c.closePath();
    c.fillStyle = "rgba(91,192,190,0.38)";
    c.fill();
    c.strokeStyle = "rgba(91,192,190,0.8)";
    c.lineWidth = 2;
    c.stroke();
  }
}

function drawOrb(c: CanvasRenderingContext2D, o: Orb) {
  const pulse = 1 + Math.sin(tick * 0.15 + o.x * 0.01) * 0.08;
  c.save();
  if (o.kind === "shield") {
    c.shadowColor = "rgba(91,192,190,0.9)";
    c.shadowBlur = 6;
    c.strokeStyle = "#dffdfc";
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const x = o.x + Math.cos(a) * 13 * pulse;
      const y = o.y + Math.sin(a) * 13 * pulse;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.stroke();
    c.fillStyle = "rgba(91,192,190,0.18)";
    c.fill();
    c.restore();
    return;
  }
  if (o.kind === "super") {
    c.shadowColor = "rgba(230,159,0,0.95)";
    c.shadowBlur = 10;
    const g = c.createRadialGradient(o.x, o.y, 1, o.x, o.y, 15 * pulse);
    g.addColorStop(0, "#fff3d0");
    g.addColorStop(0.5, "#ffd66e");
    g.addColorStop(1, "#e69f00");
    c.fillStyle = g;
    c.beginPath();
    const spikes = 5;
    const outer = 12 * pulse;
    const inner = 5 * pulse;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      const x = o.x + Math.cos(a) * rad;
      const y = o.y + Math.sin(a) * rad;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = "#fff3d0";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
    return;
  }
  if (o.kind === "double") {
    c.shadowColor = "rgba(204,121,167,0.9)";
    c.shadowBlur = 7;
    c.strokeStyle = "#f5d9e8";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(o.x - 5, o.y, 10 * pulse, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(o.x + 5, o.y, 10 * pulse, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(204,121,167,0.16)";
    c.beginPath();
    c.arc(o.x - 5, o.y, 10 * pulse, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(o.x + 5, o.y, 10 * pulse, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return;
  }
  c.shadowColor = "rgba(230,159,0,0.9)";
  c.shadowBlur = 7;
  if (o.kind === "Q") {
    const g = c.createRadialGradient(o.x - 3, o.y - 3, 2, o.x, o.y, 14 * pulse);
    g.addColorStop(0, "#ffd66e");
    g.addColorStop(1, "#e69f00");
    c.fillStyle = g;
    c.beginPath();
    c.arc(o.x, o.y, 13 * pulse, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "#0b132b";
    c.font = "700 12px 'IBM Plex Mono', monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("Q", o.x, o.y + 1);
  } else {
    c.fillStyle = "#e69f00";
    c.font = "700 13px 'IBM Plex Mono', monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("FOM", o.x, o.y);
    c.strokeStyle = "rgba(230,159,0,0.7)";
    c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + tick * 0.02;
      c.beginPath();
      c.moveTo(o.x + Math.cos(a) * 17, o.y + Math.sin(a) * 17);
      c.lineTo(
        o.x + Math.cos(a) * (21 * pulse),
        o.y + Math.sin(a) * (21 * pulse),
      );
      c.stroke();
    }
  }
  c.restore();
}

function drawGate(c: CanvasRenderingContext2D, g: Gate) {
  const pulse = 1 + Math.sin(tick * 0.1 + g.x * 0.02) * 0.06;
  c.save();
  c.strokeStyle = "rgba(204,121,167,0.75)";
  c.lineWidth = 2;
  c.shadowColor = "rgba(204,121,167,0.6)";
  c.shadowBlur = 6;
  c.setLineDash([6, 6]);
  c.beginPath();
  c.arc(g.x, g.y, g.r * pulse, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function drawPhoton(c: CanvasRenderingContext2D, py: number) {
  const pulse = 1 + Math.sin(tick * 0.12) * 0.1;
  for (let i = 1; i <= 5; i++) {
    const tx = PX - i * 11;
    const ty = py + Math.sin((tick - i * 3) * 0.15) * 2.5;
    const alpha = 0.28 * (1 - i / 6);
    const r = 5.5 * (1 - i / 7);
    c.fillStyle = "rgba(91,192,190," + alpha + ")";
    c.beginPath();
    c.arc(tx, ty, r, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = "rgba(91,192,190,0.4)";
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(PX, py, 18 * pulse, 0, Math.PI * 2);
  c.stroke();
  const g = c.createRadialGradient(PX, py, 1, PX, py, 24 * pulse);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.4, "rgba(91,192,190,0.45)");
  g.addColorStop(1, "rgba(91,192,190,0)");
  c.fillStyle = g;
  c.beginPath();
  c.arc(PX, py, 24 * pulse, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#dffdfc";
  c.beginPath();
  c.arc(PX, py, 9, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#5bc0be";
  c.lineWidth = 2;
  c.stroke();
}

function draw() {
  if (!ctx) return;
  const c = ctx;
  const baseTop: [number, number, number] = [28, 37, 65];
  let tint: [number, number, number] | null = null;
  let warn = 1;
  if (run && run.superTimer > 0) {
    tint = [230, 159, 0];
    if (run.superTimer < WARN_FRAMES) {
      warn = 0.55 + 0.45 * Math.abs(Math.sin(tick * 0.08));
    }
  } else if (run && run.doubleTimer > 0) {
    tint = [204, 121, 167];
    if (run.doubleTimer < WARN_FRAMES) {
      warn = 0.55 + 0.45 * Math.abs(Math.sin(tick * 0.08));
    }
  } else if (run && run.shieldCount > 0) {
    tint = [0, 158, 115];
  }
  const mix = (a: number, b: number, tt: number) =>
    Math.round(a + (b - a) * tt);
  const topC = tint
    ? baseTop.map((v, i) => mix(v, tint![i], 0.32 * warn))
    : baseTop;
  const top = `rgb(${topC.join(",")})`;
  const bot = "#0b132b";
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, top);
  bg.addColorStop(1, bot);
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  const off = run ? run.dist : tick * 1.2;
  c.save();
  c.globalAlpha = 0.07;
  c.strokeStyle = "#5bc0be";
  c.lineWidth = 1.5;
  c.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = 157 + Math.sin((x + off * 0.35) * 0.02) * 30;
    if (x === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.globalAlpha = 0.04;
  c.strokeStyle = "#eef3f7";
  c.lineWidth = 1;
  const gOff = (off * 0.5) % 80;
  for (let x = -gOff; x < W; x += 80) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  c.restore();

  c.save();
  c.shadowColor = "#5bc0be";
  c.shadowBlur = 6;
  c.strokeStyle = "#5bc0be";
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(0, G);
  c.lineTo(W, G);
  c.stroke();
  c.restore();
  c.fillStyle = "rgba(91,192,190,0.06)";
  c.fillRect(0, G, W, H - G);
  c.strokeStyle = "rgba(91,192,190,0.25)";
  c.lineWidth = 1;
  const tOff = off % 60;
  for (let x = -tOff; x < W; x += 60) {
    c.beginPath();
    c.moveTo(x, G + 12);
    c.lineTo(x + 14, G + 12);
    c.stroke();
  }

  if (run) {
    for (const o of run.obstacles) drawObstacle(c, o);
    for (const g of run.gates) drawGate(c, g);
    for (const o of run.orbs) drawOrb(c, o);
    if (phase.value === "dying") {
      drawParticles(c);
    } else {
      drawPhoton(c, run.photon.y);
      if (run.particles.length) drawParticles(c);
    }
    if (run.floats.length) drawFloats(c);
    if (run.shieldFlash > 0) {
      c.strokeStyle = `rgba(91,192,190,${run.shieldFlash / 10})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(PX, run.photon.y, 30, 0, Math.PI * 2);
      c.stroke();
    }
    if (run.shieldCount > 0 && phase.value === "playing") {
      c.strokeStyle = "rgba(91,192,190,0.55)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(PX, run.photon.y, 20, 0, Math.PI * 2);
      c.stroke();
      if (run.shieldCount > 1) {
        c.beginPath();
        c.arc(PX, run.photon.y, 25, 0, Math.PI * 2);
        c.stroke();
      }
    }
    if (run.doubleTimer > 0 && phase.value === "playing") {
      c.strokeStyle = "rgba(204,121,167,0.6)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(PX, run.photon.y, 24, 0, Math.PI * 2);
      c.stroke();
    }
    if (run.superTimer > 0 && phase.value === "playing") {
      const pulse = 1 + Math.sin(tick * 0.2) * 0.15;
      c.strokeStyle = "rgba(230,159,0,0.8)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(PX, run.photon.y, 30 * pulse, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = "rgba(255,214,110,0.5)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(PX, run.photon.y, 36 * pulse, 0, Math.PI * 2);
      c.stroke();
    }
  } else {
    drawPhoton(c, G - PHOTON_R);
  }
}

function drawLegend() {
  if (!legendCtx) return;
  const c = legendCtx;
  const LW = 340;
  const LH = 92;
  c.clearRect(0, 0, LW, LH);
  const items: { kind: OrbKind; label: string }[] = [
    { kind: "FOM", label: t("extraction.minigame.legend.fom") },
    { kind: "Q", label: t("extraction.minigame.legend.q") },
    { kind: "shield", label: t("extraction.minigame.legend.shield") },
    { kind: "double", label: t("extraction.minigame.legend.double") },
    { kind: "super", label: t("extraction.minigame.legend.super") },
  ];
  items.forEach((it, i) => {
    const x = 36 + i * 68;
    const y = 30;
    drawOrb(c, { kind: it.kind, val: 0, x, y });
    c.fillStyle = "rgba(238,243,247,0.7)";
    c.font = "600 9px 'Inter', sans-serif";
    wrapCenter(c, it.label, x, y + 32, 64, 11);
  });
}

function downloadCertificate() {
  const name =
    certName.value.trim() || t("extraction.minigame.certificate.anonymous");
  const finalScore = score.value;
  const tierIdx = tierIndexFor(finalScore);
  const dateTag = DATE_LOCALE_TAGS[locale.value] ?? "en-US";
  const date = new Date().toLocaleDateString(dateTag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const CW = 1200;
  const CH = 850;
  const cv = document.createElement("canvas");
  cv.width = CW;
  cv.height = CH;
  const c = cv.getContext("2d");
  if (!c) return;

  const bg = c.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#1c2541");
  bg.addColorStop(1, "#0b132b");
  c.fillStyle = bg;
  c.fillRect(0, 0, CW, CH);
  const glow = c.createRadialGradient(CW / 2, 150, 10, CW / 2, 150, 220);
  glow.addColorStop(0, "rgba(91,192,190,0.22)");
  glow.addColorStop(1, "rgba(91,192,190,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, CW, 380);
  c.strokeStyle = "rgba(91,192,190,0.35)";
  c.lineWidth = 2;
  c.strokeRect(34, 34, CW - 68, CH - 68);
  c.strokeStyle = "rgba(91,192,190,0.15)";
  c.lineWidth = 1;
  c.strokeRect(46, 46, CW - 92, CH - 92);
  c.strokeStyle = "rgba(91,192,190,0.4)";
  c.lineWidth = 1.5;
  (
    [
      [70, 70],
      [CW - 70, 70],
      [70, CH - 70],
      [CW - 70, CH - 70],
    ] as [number, number][]
  ).forEach(([cx, cy]) => {
    c.beginPath();
    c.moveTo(cx - 14, cy);
    c.lineTo(cx + 14, cy);
    c.stroke();
    c.beginPath();
    c.moveTo(cx, cy - 14);
    c.lineTo(cx, cy + 14);
    c.stroke();
  });
  c.strokeStyle = "rgba(91,192,190,0.25)";
  c.lineWidth = 1;
  c.setLineDash([6, 6]);
  c.beginPath();
  c.moveTo(120, 470);
  c.lineTo(CW - 120, 470);
  c.stroke();
  c.setLineDash([]);
  for (const rad of [42, 30]) {
    c.strokeStyle = "rgba(91,192,190,0.4)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(CW / 2, 150, rad, 0, Math.PI * 2);
    c.stroke();
  }
  const core = c.createRadialGradient(CW / 2, 150, 1, CW / 2, 150, 20);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, "rgba(91,192,190,0.8)");
  core.addColorStop(1, "rgba(91,192,190,0)");
  c.fillStyle = core;
  c.beginPath();
  c.arc(CW / 2, 150, 20, 0, Math.PI * 2);
  c.fill();

  c.textAlign = "center";
  c.fillStyle = "#5bc0be";
  c.font = "700 18px 'IBM Plex Mono', monospace";
  c.fillText("λLENS", CW / 2, 225);
  c.fillStyle = "#eef3f7";
  c.font = "700 30px 'Inter', sans-serif";
  wrapCenter(
    c,
    t("extraction.minigame.certificate.heading").toUpperCase(),
    CW / 2,
    270,
    CW - 200,
    36,
  );
  c.fillStyle = "rgba(238,243,247,0.65)";
  c.font = "400 18px 'Inter', sans-serif";
  c.fillText(t("extraction.minigame.certificate.certifies"), CW / 2, 330);
  c.fillStyle = "#ffffff";
  c.font = "700 52px 'Inter', sans-serif";
  c.fillText(name, CW / 2, 395);
  c.fillStyle = "rgba(238,243,247,0.8)";
  c.font = "400 20px 'Inter', sans-serif";
  c.fillText(
    t("extraction.minigame.certificate.achieved", { score: finalScore, date }),
    CW / 2,
    440,
  );

  const n = TIER_MINS.length;
  const ladderY = 560;
  const spacing = (CW - 200) / n;
  const chipW = spacing - 18;
  const chipH = 78;
  TIER_MINS.forEach((min, i) => {
    const x = 100 + i * spacing + 9;
    const achieved = i <= tierIdx;
    const isCurrent = i === tierIdx;
    c.fillStyle = isCurrent
      ? "rgba(91,192,190,0.22)"
      : achieved
        ? "rgba(91,192,190,0.1)"
        : "rgba(238,243,247,0.04)";
    c.strokeStyle = isCurrent
      ? "#5bc0be"
      : achieved
        ? "rgba(91,192,190,0.5)"
        : "rgba(238,243,247,0.18)";
    c.lineWidth = isCurrent ? 2.5 : 1;
    const rr = 12;
    c.beginPath();
    c.moveTo(x + rr, ladderY);
    c.arcTo(x + chipW, ladderY, x + chipW, ladderY + chipH, rr);
    c.arcTo(x + chipW, ladderY + chipH, x, ladderY + chipH, rr);
    c.arcTo(x, ladderY + chipH, x, ladderY, rr);
    c.arcTo(x, ladderY, x + chipW, ladderY, rr);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = isCurrent
      ? "#dffdfc"
      : achieved
        ? "rgba(238,243,247,0.85)"
        : "rgba(238,243,247,0.4)";
    c.font = (isCurrent ? "700 " : "600 ") + "13px 'Inter', sans-serif";
    wrapCenter(
      c,
      t(`extraction.minigame.tiers.${i}`),
      x + chipW / 2,
      ladderY + 30,
      chipW - 12,
      15,
    );
    c.fillStyle = isCurrent ? "#e69f00" : "rgba(238,243,247,0.4)";
    c.font = "600 11px 'IBM Plex Mono', monospace";
    c.textAlign = "center";
    c.fillText(`≥ ${min}`, x + chipW / 2, ladderY + chipH - 12);
  });
  c.fillStyle = "rgba(238,243,247,0.4)";
  c.font = "600 11px 'Inter', sans-serif";
  c.textAlign = "left";
  c.fillText(
    t("extraction.minigame.certificate.tiersHeading").toUpperCase(),
    100,
    ladderY - 14,
  );

  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `photon-dash-certificate-${finalScore}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (!ctx) return;
  tick++;
  if (phase.value === "playing" && !paused.value) update();
  else if (phase.value === "dying") updateParticles();
  draw();
  if (showRules.value && legendCtx) drawLegend();
}

function onKeydown(e: KeyboardEvent) {
  if (e.code !== "Space" && e.code !== "ArrowUp") return;
  // Global by design (see below), but a certificate name can contain
  // spaces -- don't hijack the key while the player is actually typing.
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }
  e.preventDefault();
  if (paused.value) {
    resumeGame();
    return;
  }
  action();
}

function onPress(e: MouseEvent | TouchEvent) {
  e.preventDefault();
  if (paused.value) {
    resumeGame();
    return;
  }
  action();
}

/** A click/tap anywhere outside the game frame while a round is live pauses
 * it -- see resumeGame (clicking back inside, canvas or the pause panel
 * itself) for the other half. Only relevant mid-"playing": the start,
 * game-over and rules overlays already have their own outside-click
 * behavior, and there's nothing to protect once the round isn't live. */
function onDocumentPointerDown(e: MouseEvent | TouchEvent) {
  if (!expanded.value || phase.value !== "playing" || paused.value) return;
  const frame = frameEl.value;
  if (frame && !frame.contains(e.target as Node)) {
    paused.value = true;
  }
}

function onVisibilityChange() {
  // No point animating (or running the sim) on a background tab -- pause
  // the loop entirely instead of letting rAF's own throttling do it.
  syncLoop();
}

watch(legendCanvasEl, (el) => {
  if (!el) {
    legendCtx = null;
    return;
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  el.width = 340 * dpr;
  el.height = 92 * dpr;
  legendCtx = el.getContext("2d");
  legendCtx?.scale(dpr, dpr);
});

onMounted(() => {
  const el = canvasEl.value;
  if (el) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * dpr;
    el.height = H * dpr;
    ctx = el.getContext("2d");
    ctx?.scale(dpr, dpr);
    el.addEventListener("mousedown", onPress);
    el.addEventListener("touchstart", onPress, { passive: false });
  }
  window.addEventListener("keydown", onKeydown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("mousedown", onDocumentPointerDown);
  document.addEventListener("touchstart", onDocumentPointerDown, {
    passive: true,
  });
  syncLoop();
  // expanded starts true (see its declaration above), but that's the ref's
  // own initial value, not a call to expand() -- without this, a parent
  // tracking expanded-change (see ExtractionView's gameExpanded) would
  // wrongly believe the game starts folded.
  if (expanded.value) emit("expanded-change", true);
});

onUnmounted(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("keydown", onKeydown);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  document.removeEventListener("mousedown", onDocumentPointerDown);
  document.removeEventListener("touchstart", onDocumentPointerDown);
  const el = canvasEl.value;
  if (el) {
    el.removeEventListener("mousedown", onPress);
    el.removeEventListener("touchstart", onPress);
  }
  if (audioCtx) {
    void audioCtx.close();
    audioCtx = null;
  }
});
</script>

<style scoped>
.pd-wrap {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

/* Folded: the frame collapses to nothing (see .pd-frame--folded), so
   claiming flex-grow here would just reserve dead space below the toggle
   button. Shrinking to content height instead lets a sibling -- the
   extraction page's PDF preview -- take the room that opens up. */
.pd-wrap--folded {
  flex: 0 0 auto;
  height: auto;
}

.pd-frame {
  position: relative;
  /* Matches the running step's other "hero" cards (ExtractionCurrentFileCard,
     the collapsed teaser button above) instead of its own larger value, so
     toggling between collapsed/expanded doesn't also shift the corner
     rounding. */
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(58, 80, 107, 0.28);
  box-shadow: 0 28px 64px rgba(11, 19, 43, 0.28);
  background: #0b132b;
  line-height: 0;
  max-height: 640px;
  opacity: 1;
  transform: none;
  /* Auto top/bottom margins center the frame in whatever height the
     column above (ExtractionRunningStep) has left over below the header,
     instead of it sitting flush at the top with dead space underneath. */
  margin-top: auto;
  margin-bottom: auto;
  transition:
    max-height 320ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 220ms ease,
    transform 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms ease;
}

.pd-frame--folded {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
  border-color: transparent;
  box-shadow: none;
  pointer-events: none;
}

.pd-canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: pointer;
}

.pd-sound {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(11, 19, 43, 0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(238, 243, 247, 0.14);
  border-radius: 999px;
  padding: 5px 12px;
  line-height: 1.2;
  user-select: none;
}
.pd-sound-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(238, 243, 247, 0.25);
}
.pd-sound-dot--on {
  background: #5bc0be;
}
.pd-sound span:last-child {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(238, 243, 247, 0.7);
  font-weight: 600;
}

.pd-status {
  position: absolute;
  top: 52px;
  left: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.2;
}
.pd-pill {
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
}
.pd-pill-shield {
  background: rgba(91, 192, 190, 0.16);
  border: 1px solid rgba(91, 192, 190, 0.5);
  color: #dffdfc;
}
.pd-timer-pill {
  border-radius: 0.5rem;
  padding: 5px 12px 7px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pd-timer-pill-super {
  background: rgba(230, 159, 0, 0.16);
  border: 1px solid rgba(230, 159, 0, 0.55);
}
.pd-timer-pill-double {
  background: rgba(204, 121, 167, 0.18);
  border: 1px solid rgba(204, 121, 167, 0.55);
}
.pd-timer-label {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
}
.pd-timer-label-super {
  color: #ffd66e;
}
.pd-timer-label-double {
  color: #f5d9e8;
}
.pd-timer-track {
  width: 100%;
  height: 3px;
  background: rgba(11, 19, 43, 0.5);
  border-radius: 999px;
  overflow: hidden;
}
.pd-timer-fill {
  height: 100%;
  border-radius: 999px;
}
.pd-timer-fill-super {
  background: linear-gradient(90deg, #e69f00, #ffd66e);
}
.pd-timer-fill-double {
  background: linear-gradient(90deg, #cc79a7, #f5d9e8);
}
.pd-timer-fill--warn {
  animation: pd-warn-pulse 1.8s ease infinite;
}

.pd-hud {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 8px;
  pointer-events: none;
  line-height: 1.3;
}
.pd-hud-box {
  background: rgba(11, 19, 43, 0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(238, 243, 247, 0.12);
  border-radius: 0.5rem;
  padding: 6px 14px;
  text-align: center;
}
.pd-hud-box-accent {
  border-color: rgba(91, 192, 190, 0.25);
}
.pd-hud-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(238, 243, 247, 0.5);
  font-weight: 600;
}
.pd-hud-value {
  font-family: "IBM Plex Mono", monospace;
  color: rgba(238, 243, 247, 0.75);
  font-size: 18px;
  font-weight: 600;
}
.pd-hud-value-accent {
  color: #5bc0be;
}

.pd-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 19, 43, 0.55);
  backdrop-filter: blur(3px);
  cursor: pointer;
}
.pd-overlay-rules {
  background: rgba(11, 19, 43, 0.72);
  backdrop-filter: blur(4px);
  z-index: 5;
}
.pd-overlay-over {
  background: rgba(11, 19, 43, 0.72);
  backdrop-filter: blur(4px);
}
.pd-overlay-paused {
  background: rgba(11, 19, 43, 0.62);
  backdrop-filter: blur(4px);
}

.pd-panel {
  position: relative;
  box-sizing: border-box;
  width: min(420px, 88%);
  background: rgba(11, 19, 43, 0.88);
  border: 1px solid rgba(91, 192, 190, 0.28);
  border-radius: 0.75rem;
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.45),
    inset 0 0 60px rgba(91, 192, 190, 0.05);
  padding: clamp(22px, 5vw, 32px) clamp(22px, 6vw, 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  line-height: 1.35;
  cursor: default;
}
.pd-panel-rules {
  width: min(400px, 88%);
  max-height: 88%;
  overflow: auto;
  background: rgba(11, 19, 43, 0.94);
  border-color: rgba(91, 192, 190, 0.3);
  padding: clamp(18px, 4.5vw, 26px);
  text-align: left;
  line-height: 1.5;
}
.pd-panel-over {
  width: min(420px, 88%);
  max-height: 92%;
  overflow: hidden;
  padding: clamp(14px, 3.2vw, 22px) clamp(16px, 4.5vw, 28px);
  gap: 6px;
  line-height: 1.3;
}

.pd-corner {
  position: absolute;
  width: 16px;
  height: 16px;
}
.pd-corner-tl {
  top: -1px;
  left: -1px;
  border-top: 2px solid #5bc0be;
  border-left: 2px solid #5bc0be;
  border-top-left-radius: 0.75rem;
}
.pd-corner-tr {
  top: -1px;
  right: -1px;
  border-top: 2px solid #5bc0be;
  border-right: 2px solid #5bc0be;
  border-top-right-radius: 0.75rem;
}
.pd-corner-bl {
  bottom: -1px;
  left: -1px;
  border-bottom: 2px solid #5bc0be;
  border-left: 2px solid #5bc0be;
  border-bottom-left-radius: 0.75rem;
}
.pd-corner-br {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid #5bc0be;
  border-right: 2px solid #5bc0be;
  border-bottom-right-radius: 0.75rem;
}

.pd-help-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(91, 192, 190, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5bc0be;
  font-size: 13px;
  font-weight: 700;
  background: transparent;
  font-family: "Inter Variable", sans-serif;
  line-height: 1;
}

.pd-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(238, 243, 247, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(238, 243, 247, 0.7);
  font-size: 14px;
  background: transparent;
  font-family: "Inter Variable", sans-serif;
  line-height: 1;
}

.pd-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pd-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5bc0be;
}
.pd-dot-red {
  background: #c14d5f;
}
.pd-eyebrow {
  font-size: clamp(9px, 1.4vw, 10px);
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #5bc0be;
  font-weight: 700;
}
.pd-eyebrow-red {
  color: #d98090;
}

.pd-title {
  font-family: "Inter Variable", sans-serif;
  font-size: clamp(22px, 4.4vw, 30px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #f4f8fb;
}
.pd-title-sm {
  font-family: "Inter Variable", sans-serif;
  font-size: clamp(18px, 3.6vw, 24px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #f4f8fb;
}

.pd-divider {
  width: 100%;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(91, 192, 190, 0.4) 0 6px,
    transparent 6px 12px
  );
  margin: 2px 0;
}

.pd-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 8px 18px;
  border-radius: 0.375rem;
  border: 1px solid rgba(91, 192, 190, 0.55);
  background: linear-gradient(
    180deg,
    rgba(91, 192, 190, 0.28),
    rgba(91, 192, 190, 0.14)
  );
  box-shadow: 0 0 16px rgba(91, 192, 190, 0.15);
}
.pd-blink {
  font-size: clamp(12px, 2.4vw, 14px);
  font-weight: 600;
  color: #eef3f7;
  animation: pd-blink 1.6s ease infinite;
}

.pd-rules-text {
  margin: 0;
  font-size: 13px;
  color: rgba(238, 243, 247, 0.75);
  line-height: 1.6;
}
.pd-legend-canvas {
  display: block;
  width: 100%;
  height: auto;
  margin: 2px 0;
}

.pd-small-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(238, 243, 247, 0.5);
  font-weight: 600;
}
.pd-score {
  font-family: "IBM Plex Mono", monospace;
  font-size: clamp(24px, 4.8vw, 32px);
  font-weight: 600;
  color: #5bc0be;
  text-shadow: 0 0 20px rgba(91, 192, 190, 0.45);
  margin-top: -4px;
}
.pd-tier-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(230, 159, 0, 0.4);
  background: rgba(230, 159, 0, 0.1);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e69f00;
  font-weight: 700;
}
.pd-name-input {
  margin-top: 6px;
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(91, 192, 190, 0.3);
  border-radius: 0;
  padding: 5px 4px;
  color: #eef3f7;
  font-size: 12px;
  font-family: "IBM Plex Mono", monospace;
  outline: none;
  text-align: center;
}
.pd-name-input::placeholder {
  color: rgba(238, 243, 247, 0.35);
}
.pd-download-btn {
  cursor: pointer;
  margin-top: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 18px;
  border-radius: 0.375rem;
  border: 1px solid rgba(91, 192, 190, 0.55);
  background: linear-gradient(
    180deg,
    rgba(91, 192, 190, 0.28),
    rgba(91, 192, 190, 0.14)
  );
  color: #eef3f7;
  font-size: 13px;
  font-weight: 600;
  font-family: "Inter Variable", sans-serif;
  box-shadow: 0 0 16px rgba(91, 192, 190, 0.15);
}
.pd-hint {
  font-size: 11px;
  color: rgba(238, 243, 247, 0.4);
  margin-top: 2px;
}

@keyframes pd-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
@keyframes pd-warn-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
