/**
 * Typed analytics wrapper.
 *
 * The goal is to keep the set of events *closed* at the type level. If you want
 * to emit a new event, you add it to `EventMap`, get type-checking at every call
 * site for free, and never typo an event name into the wild.
 *
 * The default backend is `console.debug` so dev users can watch events fire
 * without a real analytics vendor wired up. Swap `track` or call `setTracker`
 * to forward to Segment/PostHog/Amplitude/etc. from your app shell.
 *
 * Why this is worth doing on day one instead of sprinkling `posthog.capture(...)`
 * directly: once you have 50 call sites, renaming an event or changing a payload
 * shape becomes a risk-tier migration. Typing it up front costs nothing and makes
 * both of those refactors free.
 */

export type EventMap = {
  // Auth lifecycle
  "auth:sign_in": { method: "password" | "oauth" };
  "auth:sign_up": { method: "password" | "oauth" };
  "auth:sign_out": Record<string, never>;
  "auth:verify_email": Record<string, never>;

  // Items CRUD — swap for your real domain as the app grows.
  "item:create": { item_id: string };
  "item:update": { item_id: string };
  "item:delete": { item_id: string };
};

export type TrackFn = <K extends keyof EventMap>(event: K, props: EventMap[K]) => void;

let tracker: TrackFn = (event, props) => {
  if (import.meta.env.DEV) {
    console.debug("[analytics]", event, props);
  }
};

/** Swap the backend — call once at app boot from `+Layout.tsx`. */
export function setTracker(fn: TrackFn): void {
  tracker = fn;
}

/** Fire an analytics event. Typed against `EventMap`. */
export const track: TrackFn = (event, props) => tracker(event, props);
