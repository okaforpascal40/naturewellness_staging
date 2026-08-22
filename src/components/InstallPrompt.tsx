import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Add to home screen" banner.
 *
 * Chromium fires `beforeinstallprompt`, which we capture and replay when the
 * user accepts. iOS Safari fires nothing and has no programmatic install, so
 * there we show the manual Share → Add to Home Screen instruction instead —
 * without it, iOS users (a large share of a consumer health app) would never
 * see an install path at all.
 *
 * Shown at most once per session, and never again once dismissed or installed.
 */

/** Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SESSION_KEY = "nw:install-prompt-seen";
const DISMISSED_KEY = "nw:install-prompt-dismissed";
/** Let the results land before interrupting with a banner. */
const APPEAR_DELAY_MS = 4000;

const safeGet = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode / storage disabled — the banner simply reappears next time.
  }
};

const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
};

const isIos = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (safeGet(localStorage, DISMISSED_KEY)) return;
    if (safeGet(sessionStorage, SESSION_KEY)) return;

    const onBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar so ours is the only prompt.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
      safeSet(sessionStorage, SESSION_KEY, "1");
    };

    const onInstalled = () => {
      setVisible(false);
      safeSet(localStorage, DISMISSED_KEY, "installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — offer the manual route on a timer.
    let timer: number | undefined;
    if (isIos()) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
        safeSet(sessionStorage, SESSION_KEY, "1");
      }, APPEAR_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    safeSet(localStorage, DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") safeSet(localStorage, DISMISSED_KEY, "installed");
    } catch (err) {
      console.error("Install prompt failed:", err);
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      className="animate-slide-up fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-6"
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-primary/25 bg-card p-4 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-primary">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p id="install-prompt-title" className="text-sm font-semibold text-foreground">
            Add NatureWellness to your home screen
          </p>
          {iosHint ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-muted-foreground">
              Tap
              <Share className="inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="font-medium text-foreground/80">Share</span>, then
              <span className="font-medium text-foreground/80">Add to Home Screen</span>
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Open it like an app and keep your saved conditions available offline.
            </p>
          )}

          {!iosHint && (
            <Button
              onClick={install}
              className="mt-3 h-9 rounded-xl bg-primary px-4 text-sm font-semibold hover:bg-primary/90"
            >
              Install
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
