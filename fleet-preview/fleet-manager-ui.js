/* SDAS Fleet Manager branded dashboard. Preserves existing app and role verification implementations. */
(function fleetManagerUpgrade() {
  "use strict";
  document.title = "Some Dudes and a Fleet Manager | SDAS Preview";
  const heading = document.querySelector(".terminal-heading");
  if (heading) {
    heading.innerHTML = '<div class="fleet-kicker">A STAR CITIZEN COMMUNITY</div><h1 class="fleet-wordmark"><span class="word-top">SOME DUDES</span><span class="word-connector">AND A</span><span class="word-bottom">FLEET MANAGER</span></h1>';
  }
  const footer = document.querySelector(".shell > footer");
  if (footer) {
    footer.textContent = footer.textContent.replace("SDAS FLEET TERMINAL / V2.5 PREVIEW", "SOME DUDES AND A FLEET MANAGER / PREVIEW");
  }
  if (typeof window.home !== "function" || typeof window.render !== "function") {
    console.warn("Fleet Manager preview: original fleet functionality was not loaded.");
    return;
  }
  window.home = function() {
    const sharedShips = shared();
    const myShips = db.ships.filter(s => own(s));
    const pilotsCount = new Set(sharedShips.map(s => s.owner)).size;
    const typesCount = new Set(sharedShips.map(s => s.name)).size;
    const shownShips = sharedShips.slice(0, 7);
    const pilot = who(current);
    const demoRole = pilot.role === "Officer" ? "Board Member (demo)" : pilot.role === "Admin" ? "Super Admin (demo)" : "Patch (demo)";
    return `<div class="fleet-home">
      <section class="fleet-hero" aria-labelledby="overviewHeading">
        <div><div class="eyebrow">SDAS // COMMUNITY FLEET OPERATIONS</div>
          <h2 id="overviewHeading">FLEET <span>OVERVIEW</span></h2>
          <p>Welcome, ${esc(pilot.name)}. Find a ship, explore the organization's fleet, and manage your own hangar, components and loadouts.</p>
        </div>
        <button class="btn primary" data-go="hangar">OPEN MY HANGAR →</button>
      </section>
      <div class="fleet-kpis">
        <div class="fleet-metric"><div class="metric-label">SHARED SHIPS</div><strong>${sharedShips.length}</strong><small>Visible organization fleet</small></div>
        <div class="fleet-metric"><div class="metric-label">REGISTERED PILOTS</div><strong>${pilotsCount}</strong><small>Pilots with shared ships</small></div>
        <div class="fleet-metric"><div class="metric-label">SHIP MODELS</div><strong>${typesCount}</strong><small>Unique shared types</small></div>
        <div class="fleet-metric"><div class="metric-label">MY HANGAR</div><strong>${myShips.length}</strong><small>Personal fleet records</small></div>
      </div>
      <div class="fleet-dashboard">
        <section class="panel" aria-label="Fleet Registry Preview">
          <div class="fleet-panel-heading">
            <div><div class="eyebrow">ORGANIZATION ASSET INDEX</div><h2>FLEET REGISTRY</h2></div>
            <button class="btn" data-go="registry">VIEW ALL →</button>
          </div>
          <div class="table-wrap"><table class="fleet-ship-table">
            <thead><tr><th>VESSEL</th><th>PILOT</th><th>ROLE</th><th>OWNERSHIP</th></tr></thead>
            <tbody>${shownShips.map(s => `<tr data-open="${attr(s.id)}" tabindex="0" role="button" aria-label="View ${attr(s.name)}"><td><strong>${esc(s.name)}</strong><div class="small muted">${esc(s.nickname || "—")}</div></td><td>${esc(who(s.owner).name)}</td><td><span class="role-tag">${esc(s.role)}</span></td><td>${esc(s.origin)}</td></tr>`).join("") || '<tr><td colspan="4" class="fleet-empty">No shared ships yet. Add a ship in My Hangar and choose organization visibility.</td></tr>'}</tbody>
          </table></div>
          <p class="fleet-note">Select a vessel to view its profile and component loadout. Only shared ships appear here.</p>
        </section>
        <aside class="fleet-sidebar">
          <section class="panel">
            <div class="side-kicker">CONNECTION MONITOR</div><h3>SYNC STATUS</h3>
            <div class="side-status">LOCAL PREVIEW</div>
            <p class="side-copy">This preview uses browser-local demo data. Live Discord and fleet-cloud synchronization are not enabled on this page.</p>
          </section>
          <section class="panel">
            <div class="side-kicker">PILOT COMMANDS</div><h3>QUICK ACTIONS</h3>
            <div class="side-actions">
              <button class="btn" data-go="hangar">MY HANGAR <span>↗</span></button>
              <button class="btn" data-add>+ REGISTER SHIP <span>↗</span></button>
              <button class="btn" data-go="pilots">PILOT DIRECTORY <span>↗</span></button>
              <button class="btn" data-go="data">IMPORT / EXPORT <span>↗</span></button>
            </div>
          </section>
          <section class="panel">
            <div class="side-kicker">SDAS MEMBERSHIP TIERS</div><h3>ROLE ACCESS</h3>
            <div class="role-grid">
              <div>Selected demo pilot: <strong>${esc(pilot.name)}</strong></div>
              <div>Simulated tier: <strong>${demoRole}</strong></div>
              <div>Super Admin → Fleet Admin</div>
              <div>Board Member → Fleet Officer</div>
              <div>Patch → Fleet Member</div>
            </div>
            <p class="fleet-note">Preview roles are illustrative, not verified Discord permissions. Prospects and visitors remain restricted when real access rules are enabled.</p>
          </section>
        </aside>
      </div>
    </div>`;
  };
  const app = document.getElementById("app");
  if (app) {
    app.addEventListener("keydown", e => {
      const row = e.target.closest("tr[data-open]");
      if (row && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        row.click();
      }
    });
  }
  window.render();
})();
