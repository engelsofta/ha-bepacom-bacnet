// Shared visual language with RoomControl and CoverControl. Keep appearance
// tokens here so light/dark surfaces and shadow-DOM controls stay in sync.
const icon = (paths: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const ENGELSOFT_NAV_ICONS = {
  configuration: icon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  live: icon('<path d="M3 12h4l3-7 4 14 3-7h4"/>'),
  diagnostics: icon('<path d="M4 19V9m8 10V4m8 15v-7"/><circle cx="4" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="9" r="2"/>'),
  gateway: icon('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8m-4-4v4M7 8h4m-4 4h8"/><circle cx="17" cy="8" r=".5"/>'),
  beacon: icon('<path d="M8 21h8l-1-10H9L8 21ZM9 7a3 3 0 0 1 6 0v4H9V7ZM3 7h2m14 0h2M5 2l2 2m10 0 2-2M12 1v2"/>'),
};

export const ENGELSOFT_THEME = `
  :host { height:100dvh; overflow:hidden; font-family:"Segoe UI Variable",Inter,"Segoe UI",sans-serif; }
  .wrap {
    --es-ink:#f4f2ed; --es-muted:#bab6ae; --es-accent:#c6a368;
    --es-line:rgba(223,216,192,.18); --es-highlight:rgba(255,255,255,.13);
    --es-surface:rgba(43,42,40,.76); --es-inset:rgba(255,255,255,.035);
    --es-field:rgba(255,255,255,.055); --es-elevated:#333230; --es-cell:#2d2c29;
    --es-active:rgba(255,255,255,.085); --es-hover:rgba(255,255,255,.045);
    --es-shadow:0 18px 44px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.1);
    --es-radius:20px; --es-control-radius:10px; --es-rail:48px; --es-rail-gap:8px;
    --primary-color:var(--es-accent); --accent-color:var(--es-accent);
    --primary-text-color:var(--es-ink); --text-primary-color:var(--es-ink);
    --secondary-text-color:var(--es-muted); --divider-color:var(--es-line);
    --card-background-color:var(--es-cell); --secondary-background-color:var(--es-elevated);
    --bepacom-gold:var(--es-accent); --bepacom-gold-deep:#a48550;
    --bepacom-border:var(--es-line); --bp-radius:var(--es-radius); --bp-shadow:var(--es-shadow);
    width:100%; max-width:none; height:100dvh; padding:20px 22px; margin:0;
    color:var(--es-ink); color-scheme:dark; overflow:hidden;
  }
  .wrap.theme-dark {
    background:linear-gradient(90deg,rgba(7,8,8,.24),rgba(9,9,8,.42) 48%,rgba(8,7,6,.2)),
      url('/bepacom_static/engelsoft-background-dark.png?v=0694') center center / cover fixed,#171512;
  }
  .wrap.theme-light {
    --es-ink:#36332f; --es-muted:#746e65; --es-accent:#866b3f;
    --es-line:rgba(86,78,66,.18); --es-highlight:rgba(255,255,255,.8);
    --es-surface:rgba(247,245,240,.82); --es-inset:rgba(255,255,255,.3);
    --es-field:rgba(255,255,255,.5); --es-elevated:#eeece6; --es-cell:#f1efe9;
    --es-active:rgba(112,98,76,.08); --es-hover:rgba(112,98,76,.045);
    --es-shadow:0 18px 44px rgba(57,50,40,.1),inset 0 1px rgba(255,255,255,.7);
    --primary-color:var(--es-accent); --accent-color:var(--es-accent);
    --primary-text-color:var(--es-ink); --secondary-text-color:var(--es-muted);
    --text-primary-color:var(--es-ink); --card-background-color:var(--es-cell);
    --secondary-background-color:var(--es-elevated); --divider-color:var(--es-line);
    --bepacom-border:var(--es-line); color:var(--es-ink); color-scheme:light;
    background:radial-gradient(ellipse 48% 35% at 25% 35%,rgba(202,220,238,.48),transparent 80%),
      linear-gradient(115deg,rgba(224,232,239,.82),rgba(237,231,216,.78)),
      url('/bepacom_static/engelsoft-background-light.png') center center / cover fixed,#dfe5e9;
  }
  .engelsoft-shell { display:grid; grid-template-columns:var(--es-rail) minmax(0,1fr); gap:18px; width:100%; max-width:1840px; margin:auto; flex:1; min-height:0; height:100%; align-items:start; }
  .workspace { display:flex; flex-direction:column; min-width:0; min-height:0; height:100%; box-sizing:border-box; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; backdrop-filter:none; overflow:hidden; }
  .wrap .header { margin:0 0 20px; padding:0; min-height:60px; border:0; background:transparent; gap:16px; }
  .wrap .brand-lockup { gap:12px; }
  .wrap .brand-mark { width:42px; height:42px; flex-basis:42px; border:1px solid var(--es-line); border-radius:13px; color:var(--es-accent); background:var(--es-field); box-shadow:inset 0 1px var(--es-highlight); }
  .brand-mark svg { width:27px; height:27px; }
  .wrap .brand-eyebrow { margin:0 0 5px; color:var(--es-muted); font-size:9px; font-weight:500; letter-spacing:.14em; }
  .wrap h1 { color:var(--es-ink); font-size:25px; font-weight:450; line-height:1.12; letter-spacing:-.035em; }
  .brand-heading { display:flex; align-items:center; gap:16px; min-width:0; }
  .brand-section { display:flex; align-items:center; gap:16px; color:var(--es-accent); font-size:19px; font-weight:400; line-height:1.25; white-space:nowrap; }
  .brand-section::before { content:""; display:block; width:1px; height:26px; flex:none; background:linear-gradient(transparent,var(--es-accent) 18%,var(--es-accent) 82%,transparent); opacity:.75; }
  .wrap .frontend-version { margin:5px 0 0; color:var(--es-muted); font-size:9px; opacity:.75; }
  .wrap .main-nav { display:flex; flex-direction:column; align-items:center; align-self:start; width:48px; min-height:0; box-sizing:border-box; margin:16px 0 0; padding:9px 5px; gap:8px; border:1px solid var(--es-line); border-top-color:var(--es-highlight); border-radius:24px; background:var(--es-surface); box-shadow:var(--es-shadow); backdrop-filter:blur(24px); }
  .wrap .main-nav-item,.wrap .main-nav-item:hover:not(:disabled) { display:flex; align-items:center; justify-content:center; flex:0 0 36px; width:36px; min-width:36px; height:36px; min-height:36px; box-sizing:border-box; margin:0; padding:0; border:0; border-radius:50%; color:var(--es-muted); background:transparent; box-shadow:none; transform:none; }
  .wrap .main-nav-item:hover:not(:disabled) { color:var(--es-ink); background:var(--es-hover); }
  .wrap .main-nav-item.active,.wrap .main-nav-item.active:hover:not(:disabled) { color:var(--es-accent); background:var(--es-active); box-shadow:inset 0 0 0 1px var(--es-line); }
  .wrap .main-nav-icon { display:grid; place-items:center; width:19px; height:19px; font-size:19px; }
  .main-nav-icon svg { display:block; width:19px; height:19px; }
  .wrap .main-nav-copy { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
  .wrap .main-status-strip { display:grid; grid-template-columns:1.3fr .9fr .85fr 1.1fr; gap:0; flex:0 0 auto; margin:0 0 18px; padding:10px 4px; border:1px solid var(--es-line); border-radius:13px; background:var(--es-inset); box-shadow:none; }
  .wrap .main-status-strip > .dashboard-headline-card { min-height:72px; padding:8px 14px; border:0; border-right:1px solid var(--es-line); border-radius:0; background:transparent; box-shadow:none; }
  .wrap .main-status-strip > .dashboard-headline-card:last-child { border-right:0; }
  .wrap .main-status-strip .status-overview-value { border-right:0; }
  .wrap .dashboard-headline-card { min-width:0; min-height:82px; padding:12px 14px; border:1px solid var(--es-line); border-radius:13px; background:var(--es-inset); box-shadow:inset 0 1px rgba(255,255,255,.035); }
  .wrap .dashboard-headline-card.status-overview { padding:12px 14px; }
  .wrap .status-overview-grid { gap:10px; }
  .wrap .status-overview-value { padding-right:8px; border-color:var(--es-line); }
  .wrap .status-overview-value strong { font-size:22px; font-weight:450; letter-spacing:-.035em; font-variant-numeric:tabular-nums; }
  .wrap .status-overview-value small { color:var(--es-muted); font-size:8px; font-weight:500; letter-spacing:.04em; }
  .wrap .status-overview-value.total strong,.wrap .status-overview-value.efficiency strong { color:var(--es-ink); }
  .wrap .status-overview-value.errors:not(.has-errors) strong { color:var(--es-muted); }
  .wrap .status-overview-value.active strong,.wrap .status-overview-value.connected strong { color:#a8c497; }
  .theme-light .status-overview-value.active strong,.theme-light .status-overview-value.connected strong { color:#557d49; }
  .wrap .status-overview-value.disabled strong { color:var(--es-muted); }
  .wrap .status-transport-line,.wrap .api-protocol-meta { color:var(--es-muted); font-size:9px; font-weight:450; }
  .wrap .status-transport-line i { width:5px; height:5px; flex-basis:5px; box-shadow:none; }
  .wrap .api-protocol-title { color:var(--es-muted); font-weight:500; }
  .wrap .api-protocol-name { color:var(--es-ink); font-size:15px; font-weight:500; }
  .wrap .api-protocol-card.protocol-v2 .api-protocol-name { color:#a8c497; }
  .wrap.theme-light .api-protocol-card.protocol-v2 .api-protocol-name { color:#557d49; }
  .wrap .api-protocol-card::after { display:none; }
  .wrap .api-protocol-badge { color:var(--es-muted); border:0; background:transparent; font-weight:450; }
  .wrap button.secondary,.wrap .more-actions-toggle,.wrap .view-tab,.wrap .icon-action { color:var(--es-ink); border:1px solid var(--es-line); border-radius:var(--es-control-radius); background:var(--es-field); box-shadow:none; font-weight:500; }
  .wrap button:hover:not(:disabled) { transform:none; filter:none; }
  .wrap button.secondary:hover:not(:disabled),.wrap .view-tab:hover { color:var(--es-accent); border-color:var(--es-accent); background:var(--es-hover); }
  .wrap button.primary { color:var(--es-ink); border:1px solid var(--es-line); border-radius:var(--es-control-radius); background:var(--es-active); box-shadow:none; font-weight:550; }
  .wrap button.primary:disabled { opacity:.35; }
  .wrap button:focus-visible,.wrap a:focus-visible,.wrap input:focus-visible,.wrap select:focus-visible { outline:2px solid var(--es-accent); outline-offset:3px; }
  .wrap .header-actions-menu.open > .header-action-buttons { border-color:var(--es-line); background:var(--es-elevated); border-radius:14px; box-shadow:var(--es-shadow); }
  .wrap .card,.wrap .toolbar,.wrap .table-wrap,.wrap .side,.wrap .main-dashboard .dashboard-shell { border:1px solid var(--es-line); border-radius:14px; background:var(--es-inset); box-shadow:none; backdrop-filter:none; }
  .wrap .table-wrap { border-radius:13px; }
  .wrap th,.wrap .table-wrap th,.wrap th.object-col { color:var(--es-muted); background:var(--es-elevated); border-color:var(--es-line); font-weight:500; font-size:10px; letter-spacing:.035em; }
  .wrap td { color:var(--es-ink); border-color:var(--es-line); }
  .wrap td.select-col,.wrap td[data-col='object'] { background:var(--es-cell); }
  .wrap .table-wrap .name { color:var(--es-muted); font-weight:450; }
  .wrap .table-wrap .entity-link { color:var(--es-ink); font-weight:450; }
  .wrap .table-wrap .transport-state-ok b { color:var(--es-muted); font-weight:450; }
  .wrap .table-wrap .transport-state-stack b { font-weight:450; }
  .wrap .table-wrap .unit-display { color:var(--es-muted); font-weight:450; }
  .wrap .table-wrap .value-link { color:var(--es-ink); font-size:15px; font-weight:450; font-variant-numeric:tabular-nums; }
  .wrap .table-wrap tr:hover { background:var(--es-hover); }
  .wrap .table-wrap tr.selected { background:var(--es-active); }
  .wrap .table-wrap .group-row td { background:transparent; box-shadow:none; border-color:var(--es-line); }
  .wrap .group-toggle { color:var(--es-ink); font-weight:500; }
  .wrap .pill { color:var(--es-muted); border-color:var(--es-line); background:transparent; font-weight:450; }
  .wrap .pill.ok { color:var(--es-accent); background:var(--es-active); }
  .wrap .table-wrap .pill,.wrap .table-wrap .pill.ok { padding:0; border:0; border-radius:0; color:var(--es-muted); background:transparent; box-shadow:none; font-weight:450; font-size:11px; }
  .wrap .muted,.wrap label { color:var(--es-muted); }
  .wrap .side { padding:0; overflow:hidden; }
  .wrap .point-inspector-head { flex-direction:column; align-items:stretch; gap:12px; margin:0; padding:16px; border-bottom:1px solid var(--es-line); border-radius:0; background:var(--es-elevated); box-shadow:none; backdrop-filter:none; }
  .wrap .point-inspector-head h2 { color:var(--es-accent); font-size:16px; font-weight:500; overflow-wrap:anywhere; }
  .wrap .inspector-head-actions { width:100%; justify-content:flex-start; flex-wrap:wrap; }
  .wrap .inspector-head-actions button { color:var(--es-ink); background:var(--es-field); border:1px solid var(--es-line); border-radius:var(--es-control-radius); font-weight:500; }
  .wrap #saveOverride { color:var(--es-accent); background:var(--es-active); border:1px solid var(--es-line); box-shadow:none; }
  .wrap .side-body { padding:0 16px 16px; }
  .wrap .side-section-head { margin:0 0 14px; padding:20px 0 14px; background:transparent; border-bottom:1px solid var(--es-line); }
  .wrap .side-section-head h2 { margin:0 0 7px; color:var(--es-ink); font-size:16px; line-height:1.35; font-weight:500; letter-spacing:-.015em; }
  .wrap .side-section-head .muted { font-size:12px; line-height:1.5; }
  .wrap .point-title,.wrap .section-title { color:var(--es-accent); font-weight:500; }
  .wrap .side-tabs { background:transparent; border-color:var(--es-line); }
  .wrap .side-tab { color:var(--es-muted); border:0; background:transparent; }
  .wrap .side-tab.active { color:var(--es-accent); background:var(--es-active); box-shadow:none; }
  .wrap input,.wrap select,.wrap textarea,.wrap .live-filters input,.wrap .live-filters select { color:var(--es-ink); background:var(--es-field); border:1px solid var(--es-line); border-radius:var(--es-control-radius); color-scheme:inherit; }
  .wrap input[type="checkbox"] { appearance:auto; width:14px; height:14px; min-width:14px; min-height:14px; padding:0; margin:0; border:0; border-radius:0; box-shadow:none; vertical-align:middle; accent-color:var(--es-accent); }
  .wrap select option,.wrap select optgroup { color:var(--es-ink); background:var(--es-elevated); }
  .wrap .view-tab.active,.wrap.theme-light .view-tab.active { color:var(--es-accent)!important; border-color:var(--es-line)!important; background:var(--es-active)!important; box-shadow:none; }
  .wrap .dashboard-page-heading { padding:18px 20px; background:transparent; }
  .wrap .main-dashboard .dashboard-content { padding:16px 20px 18px; }
  .wrap .dashboard-toggle-title { color:var(--es-ink); font-weight:450; }
  .wrap .dashboard-summary,.wrap .live-summary { color:var(--es-muted); }
  /* Live and diagnostics share the Explorer's neutral surfaces and typography. */
  .wrap .live-chart,.wrap .live-table-wrap,.wrap .dashboard-group,
  .wrap .dashboard-diagnostics-grid > .dashboard-group { background:var(--es-inset); border-color:var(--es-line); box-shadow:none; }
  .wrap .dashboard-content-live .dashboard-monitor-group { padding:0; border:0; background:transparent; }
  .wrap .live-summary { gap:8px 16px; font-size:11px; }
  .wrap .live-summary b { color:var(--es-ink); font-weight:500; font-variant-numeric:tabular-nums; }
  .wrap .live-chart { background:transparent; border:0; border-bottom:1px solid var(--es-line); border-radius:0; }
  .wrap .live-chart i { background:var(--es-accent); opacity:.55; border-radius:2px 2px 0 0; }
  .wrap .live-table th { background:var(--es-elevated)!important; color:var(--es-muted); font-size:10px; font-weight:500; letter-spacing:.035em; text-transform:none; }
  .wrap .live-table td { font-weight:450; font-variant-numeric:tabular-nums; }
  .wrap .live-table td b { font-size:12px; font-weight:450; }
  .wrap .live-table td small,.wrap .live-foot { color:var(--es-muted); }
  .wrap .live-table tbody tr:hover { background:var(--es-hover); }
  .wrap .live-value span { color:var(--es-muted); }
  .wrap .live-source { padding:0; border:0; border-radius:0; color:var(--es-muted); background:transparent; font-weight:450; }
  .wrap .live-dot { width:5px; height:5px; box-shadow:none; }
  .wrap .dashboard-title { color:var(--es-muted); border-color:var(--es-line); font-size:11px; font-weight:500; letter-spacing:.02em; text-transform:none; }
  .wrap .protocol-health { background:transparent; border-color:var(--es-line); border-radius:10px; padding:10px; }
  .wrap .protocol-health-lead,.wrap .protocol-health-item { background:transparent; }
  .wrap .protocol-health small { color:var(--es-muted); font-size:10px; font-weight:500; letter-spacing:.035em; text-transform:none; }
  .wrap .protocol-health strong { color:var(--es-ink); font-size:18px; font-weight:450; font-variant-numeric:tabular-nums; }
  .wrap .protocol-health-lead strong { font-size:16px; }
  .wrap .protocol-health-lead em,.wrap .protocol-health-item span,.wrap .protocol-health-version { color:var(--es-muted); font-weight:450; }
  .wrap .protocol-health-lead > i { width:6px; height:6px; flex-basis:6px; box-shadow:none; animation:none; }
  .wrap .protocol-health.offline .protocol-health-lead > i { box-shadow:none; }
  .wrap .protocol-health.offline .protocol-health-lead strong,.wrap .protocol-health-item.warn strong { color:var(--error-color,#db665c); }
  .wrap .diagnostic-flow-step,.wrap .diagnostic-flow-step:hover { background:var(--es-inset); border-color:var(--es-line); border-radius:10px; box-shadow:none; transform:none; animation:none; transition:none; }
  .wrap .diagnostic-flow-step small,.wrap .diagnostic-flow-step span { color:var(--es-muted); font-weight:450; letter-spacing:.02em; text-transform:none; }
  .wrap .diagnostic-flow .diagnostic-flow-step strong { color:var(--es-ink); font-size:23px; font-weight:450; font-variant-numeric:tabular-nums; }
  .wrap .diagnostic-flow .diagnostic-flow-head b { color:var(--es-muted); background:transparent; font-weight:450; }
  .wrap .diagnostic-flow > i { background:var(--es-line); }
  .wrap .diagnostic-flow > i::before,.wrap .diagnostic-flow > i::after,.wrap .diagnostic-flow-step::after { display:none; }
  /* The page is an open canvas; only individual content cards carry glass. */
  .wrap .main-status-strip,.wrap .card,.wrap .toolbar,.wrap .table-wrap,.wrap .side,
  .wrap .dashboard-diagnostics-grid > .dashboard-group,
  .wrap .dashboard-content-live .dashboard-monitor-group {
    background:var(--es-surface); border:1px solid var(--es-line); border-top-color:var(--es-highlight);
    border-radius:14px; box-shadow:var(--es-shadow); backdrop-filter:blur(24px);
  }
  .wrap .main-dashboard .dashboard-shell { background:transparent; border:0; border-radius:0; box-shadow:none; backdrop-filter:none; }
  .wrap .main-dashboard .dashboard-content { padding:0; }
  .wrap .dashboard-content-live .dashboard-monitor-group { padding:16px; }
  .wrap .detail-rail-toggle { border-color:var(--es-line); background:var(--es-field); color:var(--es-accent); }
  @media(min-width:1101px) { .wrap .content { grid-template-columns:minmax(0,1fr) 28px minmax(390px,440px); gap:10px; } .wrap .content.details-hidden { grid-template-columns:minmax(0,1fr) 28px; } }
  @media(max-width:1300px) { .wrap .main-status-strip { grid-template-columns:repeat(2,minmax(0,1fr)); gap:0; margin-bottom:12px; } .wrap .main-status-strip > .dashboard-headline-card:nth-child(2) { border-right:0; } .wrap .main-status-strip > .dashboard-headline-card:nth-child(-n+2) { border-bottom:1px solid var(--es-line); } .wrap .header { margin-bottom:16px; } }
  @media(min-width:901px) and (max-width:1100px) { :host { height:100dvh; overflow:hidden; } .wrap { height:100dvh; overflow:auto; } .workspace { overflow:auto; } .wrap .content { flex:none; } .wrap #explorerView { flex:none; overflow:visible; } .wrap .table-wrap { height:65dvh; min-height:320px; } }
  @media(max-width:900px) {
    :host { height:100dvh; overflow:hidden; }
    .wrap { height:100dvh; padding:12px; overflow:auto; }
    .engelsoft-shell { display:flex; flex-direction:column; gap:12px; height:auto; min-height:100%; flex:none; }
    .wrap .main-nav { flex-direction:row; align-self:flex-end; width:auto; margin:0; padding:5px; border-radius:24px; }
    .workspace { width:100%; height:auto; min-height:0; padding:0; flex:1; overflow:visible; }
    .wrap .header { flex-direction:row; align-items:center; flex-wrap:wrap; gap:12px; min-height:0; }
    .wrap .mobile-header-row { width:auto; }
    .wrap .ha-menu-toggle,.wrap.ha-narrow .ha-menu-toggle { display:none; }
    .wrap .header-primary-actions { display:flex; width:auto; gap:6px; margin-left:auto; }
    .wrap .header-primary-actions > button { min-height:36px; padding:7px 11px; font-size:11px; }
    .wrap .content { display:block; height:auto; overflow:visible; }
    .wrap #explorerView { flex:none; overflow:visible; }
    .wrap .table-wrap { height:68dvh; min-height:300px; max-height:none; }
    .wrap .side { margin-top:12px; height:70dvh; min-height:400px; }
  }
  @media(max-width:700px) {
    .wrap { padding:10px; }
    .workspace { padding:0; border-radius:0; }
    .wrap .brand-lockup { display:none; }
    .wrap .header { flex-direction:row; align-items:center; flex-wrap:nowrap; gap:6px; margin-bottom:12px; }
    .wrap .mobile-header-row { display:none; }
    .wrap .header-primary-actions { display:flex; width:auto; min-width:0; flex:1; flex-wrap:wrap; justify-content:flex-end; }
    .wrap .header-primary-actions > button { flex:none; width:auto; padding:7px 8px; font-size:10px; }
    .wrap .more-actions-toggle { min-width:36px; height:36px; padding:0 8px; font-size:11px; }
    .wrap .main-status-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .wrap .dashboard-headline-card,.wrap .dashboard-headline-card.status-overview { padding:8px; min-height:64px; }
    .wrap .main-status-strip > .dashboard-headline-card { padding:10px 8px; min-height:64px; }
    .wrap .status-overview-grid { gap:6px; }
    .wrap .status-overview-value { padding-right:4px; }
    .wrap .status-overview-value strong { font-size:18px; }
    .wrap .status-overview-value small { font-size:7px; }
    .wrap .status-transport-line { flex-wrap:wrap; font-size:8px; gap:4px; }
    .wrap .api-protocol-name { font-size:12px; }
    .wrap .api-protocol-meta { font-size:8px; }
    .wrap .transport-overview .status-overview-grid { grid-template-columns:1fr; }
    .wrap .transport-overview .status-overview-value { border:0; }
    .wrap .transport-overview .status-overview-value.efficiency { display:none; }
    .wrap .table-wrap { border:0; background:transparent; border-radius:0; box-shadow:none; backdrop-filter:none; }
    .wrap .table-wrap > table > tbody > tr.point-card { background:var(--es-surface); border-color:var(--es-line); box-shadow:none; backdrop-filter:blur(24px); }
    .wrap .table-wrap > table > tbody > tr.point-card > td[data-col='object'] { background:var(--es-active)!important; }
    .wrap .dashboard-page-heading { padding:14px; }
    .wrap .main-dashboard .dashboard-content { padding:0; }
    .wrap .dashboard-content-live .dashboard-monitor-group { padding:12px; }
    .wrap .pending-reload { max-width:100%; font-size:9px; }
  }
  @media(prefers-reduced-motion:reduce) { .wrap *,.wrap *::before,.wrap *::after { scroll-behavior:auto!important; animation:none!important; transition:none!important; } }
`;
