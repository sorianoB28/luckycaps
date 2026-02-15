import type { Page } from "@playwright/test";

type WaitForAppReadyOptions = {
  timeout?: number;
  selectors?: string[];
  overlaySelectors?: string[];
};

const DEFAULT_READY_SELECTORS = ["main", 'header[role="banner"]', "header", "[role='main']"];
const DEFAULT_OVERLAY_SELECTORS = [
  "nextjs-portal",
  "#nextjs__container",
  '[data-nextjs-dialog-overlay="true"]',
  '[role="dialog"][aria-modal="true"]',
  'dialog[open]',
];

export async function waitForAppReady(page: Page, options: WaitForAppReadyOptions = {}) {
  const timeout = options.timeout ?? 20_000;
  const selectors = options.selectors ?? DEFAULT_READY_SELECTORS;
  const overlaySelectors = options.overlaySelectors ?? DEFAULT_OVERLAY_SELECTORS;

  await page.waitForFunction(
    ({ stableSelectors, blockers }) => {
      if (document.readyState !== "complete") return false;

      const body = document.body;
      if (!body) return false;
      const bodyStyle = window.getComputedStyle(body);
      if (bodyStyle.visibility === "hidden" || bodyStyle.display === "none" || body.clientHeight < 20) {
        return false;
      }

      const isVisible = (el: Element | null) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (!style || style.display === "none" || style.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const hasStableAnchor = stableSelectors.some((selector) => isVisible(document.querySelector(selector)));
      if (!hasStableAnchor) return false;

      const center = document.elementFromPoint(window.innerWidth / 2, Math.max(24, window.innerHeight / 2));
      const nearTop = document.elementFromPoint(window.innerWidth / 2, Math.max(10, window.innerHeight * 0.1));

      const isBlockingOverlay = (element: Element | null) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        if (!style || style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
          return false;
        }
        const rect = element.getBoundingClientRect();
        const coversMostViewport =
          rect.width >= window.innerWidth * 0.8 &&
          rect.height >= window.innerHeight * 0.7 &&
          rect.top <= window.innerHeight * 0.1 &&
          rect.left <= window.innerWidth * 0.1;
        if (!coversMostViewport) return false;
        return true;
      };

      for (const selector of blockers) {
        const candidate = document.querySelector(selector);
        if (!candidate) continue;
        if (isBlockingOverlay(candidate)) return false;

        const centerBlocked = center ? center.closest(selector) : null;
        if (isBlockingOverlay(centerBlocked)) return false;

        const topBlocked = nearTop ? nearTop.closest(selector) : null;
        if (isBlockingOverlay(topBlocked)) return false;
      }

      return true;
    },
    { stableSelectors: selectors, blockers: overlaySelectors },
    { timeout }
  );
}

