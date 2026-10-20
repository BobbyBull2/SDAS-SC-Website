/* SDAS Fleet Manager preview — one cohesive branded header.
   Preserve all original button nodes and onclick listeners (Supabase/Discord remain unchanged).
   Only the obsolete local-import shortcut and preview-label pill are removed. */
(() => {
  "use strict";
  const LABEL = "SOME DUDES FLEET MANAGER";
  const normalized = text => String(text || "").replace(/\s+/g, " ").trim().toUpperCase();

  const apply = () => {
    const masthead = document.getElementById("sdas-fleet-masthead");
    const title = masthead?.querySelector(".fleet-title.fleet-gold");
    if (title && title.textContent.trim() !== LABEL) title.textContent = LABEL;

    // The old code gave .shell the top-action-group class, turning the entire
    // application into an action row. Never style or remove the shell as a button group.
    document.querySelector(".shell")?.classList.remove("sdas-top-action-group");

    const header = document.querySelector(".header");
    const nav = document.getElementById("nav");
    if (!header || !nav) return;

    // Terminal already has a monitor-shaped CSS glyph. Remove only the
    // obsolete leading home character in its text node, leaving events intact.
    const terminal = nav.querySelector('button[data-view="home"]');
    const firstNode = terminal?.firstChild;
    if (firstNode?.nodeType === Node.TEXT_NODE &&
        firstNode.textContent.trimStart().startsWith("⌂")) {
      firstNode.textContent = firstNode.textContent.replace("⌂", "").trimStart();
    }


    // Remove only the exact preview-indicator pill, including its status dot.
    // Do not remove its parent toolbar or any unrelated member/auth controls.
    const previewBadge = [...header.querySelectorAll(".pill, .badge, [role='status'], span, div, button")]
      .filter(el => !el.closest("#sdas-auth-preview"))
      .find(el => el.textContent?.toUpperCase().includes("PRIVATE FUNCTIONAL PREVIEW") &&
        (!el.querySelector("*") ||
          ![...el.children].some(child => child.textContent?.toUpperCase().includes("PRIVATE FUNCTIONAL PREVIEW"))));
    if (previewBadge) previewBadge.remove();

    const commands = [...document.querySelectorAll("button")].filter(
      button => !button.closest("#app, #nav, #sdas-golden-live, #sdas-auth-preview")
    );
    // The Data / Import tab and its controls are NOT removed.
    const oldImport = commands.find(button => normalized(button.textContent) === "IMPORT MY EXISTING LOCAL SHIPS");
    oldImport?.remove();

    const auth = document.getElementById("sdas-auth-preview");
    if (!auth || !header.contains(auth)) return;

    // Do not put these into #sdas-auth-actions: the auth script calls
    // replaceChildren() whenever roles/session refresh, deleting those nodes.
    let rail = document.getElementById("sdas-fleet-header-actions");
    if (!rail) {
      rail = document.createElement("div");
      rail.id = "sdas-fleet-header-actions";
      rail.setAttribute("aria-label", "Fleet quick controls");
    }
    if (rail.nextElementSibling !== auth) auth.insertAdjacentElement("beforebegin", rail);

    // Direct return route to the official SDAS site, before the fleet controls.
    let siteLink = document.getElementById("sdas-site-header-link");
    if (!siteLink) {
      siteLink = document.createElement("a");
      siteLink.id = "sdas-site-header-link";
      siteLink.className = "sdas-header-action";
      siteLink.href = "https://sdas.space/";
      siteLink.target = "_blank";
      siteLink.rel = "noopener noreferrer";
      siteLink.textContent = "SDAS.SPACE";
      siteLink.setAttribute("aria-label", "Open SDAS.space website in a new tab");
    }
    if (rail.firstElementChild !== siteLink) rail.prepend(siteLink);

    const refresh = commands.find(button => normalized(button.textContent) === "REFRESH ORG FLEET");
    const edit = commands.find(button => normalized(button.textContent) === "EDIT PILOT NAME");
    for (const button of [refresh, edit]) {
      if (!button) continue;
      button.classList.add("sdas-header-action");
      button.classList.remove("sdas-top-action");
      if (!rail.contains(button)) rail.append(button); // preserves attached onclick
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else apply();

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  });
  const watch = () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch, { once: true });
  } else watch();
})();
