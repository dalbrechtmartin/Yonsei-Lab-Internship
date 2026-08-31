import { computed, reactive, readonly, ref } from "vue";
import { apiService, type ExtractionRecord } from "@/services/api";

/**
 * One turn of the Photon conversation, in the shape the backend's multi-turn
 * chat endpoint expects for `history` (POST
 * .../records/{recordIndex}/chat, body { message, history }) -- "model"
 * (not "assistant") because the backend builds its turns as a Gemini
 * `contents` list, which names the non-user role "model".
 */
export interface PhotonMessage {
  role: "user" | "model";
  content: string;
}

/** What Photon's conversation is currently scoped to -- the record under
 * active review (+ the PDF page the reviewer has open, so a free-form
 * "explain this passage" question can be answered from that page's already
 * extracted text without a new text-selection layer). Supplied by whichever
 * view owns a review "cursor" (ExtractionReviewStep.vue today); Visualisation
 * has no equivalent selection yet, so it simply never calls
 * providePhotonContext and Photon stays unavailable there. */
export interface PhotonContext {
  jobId: string;
  fileId: string;
  recordIndex: number;
  record: ExtractionRecord;
  currentPage?: number | null;
}

/** Jumps the host view's PDF viewer to one of the active record's
 * Evidence/Location fragments (same multi-source click-to-locate behavior
 * ExtractionReviewDetail.vue already offers per field) -- `sourceIndex`
 * omitted means "whichever source is most relevant" and is left to the
 * handler to decide. Registered by the host view because only it owns the
 * viewer state (activeSourceIndex, current page); Photon's panel never
 * manipulates that directly. */
export type ShowEvidenceHandler = (sourceIndex?: number) => void;

// Module-level singleton state -- NOT allocated per usePhoton() call -- so
// every consumer (PhotonFab.vue, PhotonPanel.vue, PhotonChipRow.vue, ...)
// anywhere in the tree reads/writes the exact same conversation and the
// exact same registered context, the same technique useToastQueue.ts uses
// for its shared `toasts` array. Photon has exactly one active conversation
// app-wide -- scoped to whichever record is currently under review -- so
// there is nothing per-call to keep separate.
const contextGetter = ref<(() => PhotonContext | null) | null>(null);
const showEvidenceHandler = ref<ShowEvidenceHandler | null>(null);
const messages = reactive<PhotonMessage[]>([]);
const isSending = ref(false);
const error = ref<string | null>(null);
// True for a few seconds right after a reply lands successfully -- drives
// the shared "happy" mascot pulse below. Session-local UI flourish only,
// never anything a caller needs to read directly.
const justReplied = ref(false);
let celebrateTimer: ReturnType<typeof setTimeout> | null = null;
let activeContextKey: string | null = null;

function contextKeyOf(context: PhotonContext | null): string | null {
  return context ? `${context.jobId}:${context.fileId}:${context.recordIndex}` : null;
}

function readContext(): PhotonContext | null {
  return contextGetter.value ? contextGetter.value() : null;
}

function resetConversation() {
  messages.splice(0, messages.length);
  error.value = null;
  isSending.value = false;
  if (celebrateTimer) clearTimeout(celebrateTimer);
  justReplied.value = false;
}

/**
 * Registers the live source of Photon's scoping context. Takes a getter
 * (not a snapshot) so the module-level state always reflects the caller's
 * latest record/page -- e.g. ExtractionReviewStep.vue passes
 * `() => buildPhotonContext(cursor.value)` once, and every subsequent
 * cursor move is picked up on next read without re-registering.
 *
 * The conversation resets whenever the *effective* context (job/file/record)
 * changes -- moving to a different record starts Photon over, same
 * session-local-only reset principle already used for per-field confirm
 * state. Passing `null` (e.g. on unmount, or navigating away from Review)
 * marks Photon unavailable and also resets the conversation, so a later
 * unrelated context never resumes a stale chat.
 */
export function providePhotonContext(source: (() => PhotonContext | null) | null) {
  contextGetter.value = source;
  const nextKey = contextKeyOf(readContext());
  if (nextKey !== activeContextKey) {
    activeContextKey = nextKey;
    resetConversation();
  }
}

/**
 * Registers the "jump to evidence" callback for whatever view currently owns
 * the PDF viewer. Pass `null` on unmount so a stale handler from a torn-down
 * view is never invoked.
 */
export function provideShowEvidenceHandler(handler: ShowEvidenceHandler | null) {
  showEvidenceHandler.value = handler;
}

/**
 * Consumer-facing composable for every Photon UI piece (PhotonFab.vue,
 * PhotonPanel.vue, PhotonMessageList.vue, PhotonChipRow.vue). Always reads
 * the one shared conversation/context registered via providePhotonContext /
 * provideShowEvidenceHandler above -- there is no per-instance state to
 * initialize, so this is cheap to call from as many components as needed.
 */
export function usePhoton() {
  const context = computed(() => readContext());
  const isAvailable = computed(() => context.value !== null);

  /** The mascot expression for wherever Photon is shown "chrome-side" (the
   * fab icon while closed, the panel header while open) -- one shared
   * derivation so the two never drift into showing different things for the
   * same underlying state. Per-message avatars in PhotonMessageList.vue are
   * deliberately NOT driven by this (each message is a fixed point in the
   * past -- "thinking"/"confused" there mark the CURRENT pending/failed
   * turn, not a message's own history). */
  const mascotExpression = computed<"neutral" | "thinking" | "happy" | "confused">(() => {
    if (isSending.value) return "thinking";
    if (error.value) return "confused";
    if (justReplied.value) return "happy";
    return "neutral";
  });

  /** Sends `text` as a new user turn and appends Photon's reply once it
   * resolves. No-ops (rather than throwing) when there's no active context
   * or a request is already in flight, so a chip double-click or a stray
   * call while Photon is hidden can never desync the conversation. */
  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    const activeContext = readContext();
    if (!trimmed || isSending.value || !activeContext) return;

    const history = messages.map((message) => ({ ...message }));
    messages.push({ role: "user", content: trimmed });
    isSending.value = true;
    error.value = null;
    try {
      const { reply } = await apiService.chatWithPhoton(
        activeContext.jobId,
        activeContext.fileId,
        activeContext.recordIndex,
        trimmed,
        history,
      );
      messages.push({ role: "model", content: reply });
      if (celebrateTimer) clearTimeout(celebrateTimer);
      justReplied.value = true;
      celebrateTimer = setTimeout(() => {
        justReplied.value = false;
      }, 2200);
    } catch {
      // An i18n KEY, not display text -- the raw fetch/HTTP error message is
      // an English implementation detail the reviewer doesn't need, and
      // PhotonPanel.vue's UI is localized like the rest of this app.
      error.value = "photon.panel.errorGeneric";
    } finally {
      isSending.value = false;
    }
  }

  /** Delegates to the handler the host view registered via
   * provideShowEvidenceHandler -- no-ops if none is registered (e.g. the
   * view hasn't mounted its viewer yet). */
  function showEvidence(sourceIndex?: number) {
    showEvidenceHandler.value?.(sourceIndex);
  }

  function clearConversation() {
    resetConversation();
  }

  return {
    context,
    isAvailable,
    messages: readonly(messages),
    isSending: readonly(isSending),
    error: readonly(error),
    mascotExpression,
    sendMessage,
    showEvidence,
    clearConversation,
  };
}
