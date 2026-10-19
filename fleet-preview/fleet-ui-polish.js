/* SDAS Fleet Manager — preview-only branding polish.
   Presentation only: no authentication, fleet records or event handlers are replaced. */
(() => {
  "use strict";
  const LABEL = "SOME DUDES FLEET MANAGER";
  const normalized = button => (button.textContent || "").replace(/\s+/g, "").toLowerCase();

  const apply = () => {
    const masthead = document.querySelector("#sdas-fleet-masthead");
    if (masthead) {
      const heading = masthead.querySelector(".fleet-title.fleet-gold");
      if (heading && heading.textContent.trim() !== LABEL) heading.textContent = LABEL;
    }

    // Limit changes to top-of-page controls; do not reparent buttons or alter remaining handlers.
    const nav = document.querySelector("#nav");
    if (!nav) return;
    const topButtons = [...document.querySelectorAll("button")].filter(
      button => Boolean(button.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    // Remove only the redundant hero import shortcut. The Data / Import
    // page and its real import handlers remain intact.
    const redundantImport = topButtons.find(button =>
      /import.*(existing|local).*ships?/.test(normalized(button))
    );
    if (redundantImport) redundantImport.remove();

    const actionPatterns = [
      /refresh.*org.*fleet/,
      /edit.*pilot.*name/
    ];
    const actions = actionPatterns.map(pattern => topButtons.find(
      button => pattern.test(normalized(button))
    ));
    if (actions.some(button => !button)) return;
    for (const button of actions) button.classList.add("sdas-top-action");

    // The original container retains its children and delegated event handlers.
    const parent = actions[0].parentElement;
    if (parent && actions.every(button => button.parentElement === parent)) {
      parent.classList.add("sdas-top-action-group");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; apply(); });
  });
  const start = () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
