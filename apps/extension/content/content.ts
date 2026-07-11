/**
 * Verdict — Content Script
 *
 * Injected into every page. Responsibilities:
 * 1. Announce readiness to the background worker.
 * 2. Listen for VERDICT_RESULT messages and render the overlay.
 * 3. YouTube: observe caption DOM and buffer text for auto fact-checking.
 * 4. Never block the main thread — use requestAnimationFrame for DOM work.
 */

import type { ExtensionMessage, FactCheckResult, ExtensionSettings } from "@verdict/shared-types";
import { DEFAULT_SETTINGS } from "@verdict/shared-types";
import { createOverlay, showVerdictCard, showLoadingState, hideLoadingState } from "./overlay.ts";

// ─── Initialization ────────────────────────────────────────────────────────────

let overlayReady = false;
let settings: ExtensionSettings = DEFAULT_SETTINGS;

async function init() {
  // Fetch settings from background
  const response = await chrome.runtime.sendMessage({ type: "VERDICT_SETTINGS_GET" });
  settings = response?.payload ?? DEFAULT_SETTINGS;

  if (!settings.enabled) return;

  // Create the Shadow DOM overlay host
  createOverlay();
  overlayReady = true;

  // Announce readiness to background
  chrome.runtime.sendMessage({ type: "VERDICT_CONTENT_READY" });

  // Start YouTube subtitle observer if on YouTube
  if (settings.youtubeEnabled && isYouTube()) {
    observeYouTubeCaptions();
  }
}

// Run init — deferred so the page DOM is fully available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ─── Message Listener (from Background) ───────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (!overlayReady) return;

  switch (message.type) {
    case "VERDICT_RESULT":
      hideLoadingState();
      showVerdictCard(message.payload as FactCheckResult);
      break;
    case "VERDICT_LOADING_START":
      showLoadingState();
      break;
    case "VERDICT_LOADING_STOP":
      hideLoadingState();
      break;
    case "VERDICT_SHOW_OVERLAY":
      // Toggle overlay visibility
      break;
  }
  // Return false = no async response needed
  return false;
});

// ─── YouTube Caption Observer ─────────────────────────────────────────────────

const YOUTUBE_CAPTION_SELECTOR = ".ytp-caption-segment";
const BUFFER_DELAY_MS = 4000;

let captionBuffer = "";
let captionTimer: ReturnType<typeof setTimeout> | null = null;
let lastSentText = "";

function isYouTube(): boolean {
  return location.hostname.includes("youtube.com");
}

function observeYouTubeCaptions() {
  const observer = new MutationObserver(() => {
    // Batch DOM reads using requestAnimationFrame to avoid blocking
    requestAnimationFrame(() => {
      const segments = document.querySelectorAll<HTMLElement>(YOUTUBE_CAPTION_SELECTOR);
      if (!segments.length) return;

      const captionText = Array.from(segments)
        .map((el) => el.textContent ?? "")
        .join(" ")
        .trim();

      if (!captionText || captionText === lastSentText) return;

      captionBuffer += " " + captionText;

      // Debounce: wait for a natural pause in speech
      if (captionTimer) clearTimeout(captionTimer);
      captionTimer = setTimeout(async () => {
        const textToSend = captionBuffer.trim();
        if (textToSend.length < 30) return;

        lastSentText = captionText;
        captionBuffer = "";

        await chrome.runtime.sendMessage({
          type: "VERDICT_CHECK_TEXT",
          payload: {
            text: textToSend,
            sourceUrl: location.href,
            context: "youtube",
          },
        });
      }, BUFFER_DELAY_MS);
    });
  });

  // Observe the entire player container for caption changes
  const playerContainer = document.querySelector("#movie_player") ?? document.body;
  observer.observe(playerContainer, { childList: true, subtree: true, characterData: true });
}
