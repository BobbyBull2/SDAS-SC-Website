/* Production Fleet Manager: one Discord sign-in action, selectable session lifetime. */
(function () {
  "use strict";

  const preferenceKey = "sdas-fleet-stay-signed-in";
  const projectPrefix = "sb-zfvfpbfkbvudaezichrh-";
  const pref = () => {
    try { return localStorage.getItem(preferenceKey) !== "false"; }
    catch { return false; }
  };

  // A Supabase-compatible storage adapter. Session mode persists across the
  // OAuth round trip in the same tab, but not across a new browser session.
  const chosen = () => pref() ? localStorage : sessionStorage;
  window.sdasFleetAuthStorage = {
    getItem(key) {
      try { return chosen().getItem(key); } catch { return null; }
    },
    setItem(key, value) {
      chosen().setItem(key, value);
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch {}
      try { sessionStorage.removeItem(key); } catch {}
    }
  };

  function clearPersistentFleetSessions() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(projectPrefix)) localStorage.removeItem(key);
      }
    } catch {}
  }
  // Do not accidentally restore an old persistent token when session-only is
  // already selected from a previous visit.
  if (!pref()) clearPersistentFleetSessions();

  const style = document.createElement("style");
  style.id = "sdas-live-signin-styles";
  style.textContent = `
    html:not(.sdas-cloud-verified) .shell:after{display:none!important}
    #sdas-live-signin-card{
      display:none;width:min(760px,calc(100% - 36px));
      box-sizing:border-box;margin:22px auto 35px;padding:23px;
      border:1px solid #3b91a4;border-radius:14px;
      background:linear-gradient(145deg,#0b2a39,#071b29);
      box-shadow:inset 0 1px #91e5f41c,0 10px 30px #0008;
      color:#c9edf5;font:400 16px/1.55 system-ui,sans-serif;
    }
    html:not(.sdas-cloud-verified) #sdas-live-signin-card{display:grid;gap:15px}
    #sdas-live-signin-button{
      width:100%;box-sizing:border-box;padding:17px 18px;cursor:pointer;
      background:linear-gradient(145deg,#175272,#0b3047);
      border:1px solid #62c9e0;border-radius:10px;
      color:#e8fcff;font:700 18px/1.4 system-ui,sans-serif;
      text-align:center;transition:background .2s,border-color .2s,transform .15s;
    }
    #sdas-live-signin-button:hover,#sdas-live-signin-button:focus-visible{
      background:linear-gradient(145deg,#217293,#10415b);border-color:#b4f4ff;
    }
    #sdas-live-signin-button:active{transform:translateY(1px)}
    #sdas-live-signin-options{
      display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
      gap:12px;font-size:14px;
    }
    #sdas-live-signin-options label{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-weight:600}
    #sdas-live-stay-signed-in{width:19px;height:19px;accent-color:#59d5e8;cursor:pointer}
    #sdas-live-signin-help{color:#a3bfca;font-size:13px;line-height:1.5}
    #sdas-live-signin-status{margin:0;color:#ffd699;font-size:14px}
    #sdas-live-signin-status:empty{display:none}
    @media(max-width:560px){
      #sdas-live-signin-card{padding:18px;width:calc(100% - 24px)}
      #sdas-live-signin-button{font-size:16px;padding:15px}
    }
  `;
  document.head.append(style);

  function initializeCard() {
    if (document.getElementById("sdas-live-signin-card")) return;
    const card = document.createElement("section");
    card.id = "sdas-live-signin-card";
    card.setAttribute("aria-label", "Sign in to the SDAS Fleet Manager");

    const button = document.createElement("button");
    button.id = "sdas-live-signin-button";
    button.type = "button";
    button.textContent = "Sign in with Discord to access the SDAS Fleet Manager";

    const row = document.createElement("div");
    row.id = "sdas-live-signin-options";
    const label = document.createElement("label");
    label.setAttribute("for", "sdas-live-stay-signed-in");
    const checkbox = document.createElement("input");
    checkbox.id = "sdas-live-stay-signed-in";
    checkbox.type = "checkbox";
    checkbox.checked = pref();
    label.append(checkbox, document.createTextNode("Stay signed in on this device"));
    row.append(label);

    const help = document.createElement("div");
    help.id = "sdas-live-signin-help";
    help.textContent = "Uncheck to keep your login only for this browser session. Use this on shared devices.";

    const status = document.createElement("p");
    status.id = "sdas-live-signin-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    checkbox.addEventListener("change", () => {
      try { localStorage.setItem(preferenceKey, checkbox.checked ? "true" : "false"); }
      catch { status.textContent = "Your browser could not save the sign-in preference."; }
      if (!checkbox.checked) clearPersistentFleetSessions();
    });
    button.addEventListener("click", async () => {
      status.textContent = "";
      if (typeof window.sdasFleetStartDiscordLogin !== "function") {
        const topLogin = [...document.querySelectorAll("#sdas-auth-actions button")]
          .find(item => /LOGIN WITH DISCORD/i.test(item.textContent || ""));
        if (topLogin) {
          topLogin.click();
          return;
        }
        status.textContent = "Discord login is unavailable. Please refresh the page and try again.";
        return;
      }
      button.disabled = true;
      try { await window.sdasFleetStartDiscordLogin(); }
      catch (error) { status.textContent = "Unable to start Discord sign-in: " + error.message; }
      finally { button.disabled = false; }
    });

    card.append(button, row, help, status);
    const shell = document.querySelector(".shell");
    if (shell) shell.insertAdjacentElement("afterend", card);
    else document.body.append(card);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCard, { once: true });
  } else initializeCard();
})();
