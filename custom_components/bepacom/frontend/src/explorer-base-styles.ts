// Existing structural rules and component layouts. The Engelsoft skin lives in engelsoft-theme.ts.
export const EXPLORER_BASE_STYLES = `
      :host { display:block; color: var(--primary-text-color); background: var(--primary-background-color); height:100vh; overflow:hidden; }
      .wrap { height:100vh; box-sizing:border-box; padding: 12px 20px 16px; max-width: 1900px; margin: 0 auto; display:flex; flex-direction:column; overflow:hidden; }
      .header { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
      .mobile-header-row { display:flex; align-items:center; min-width:0; }
      .ha-menu-toggle { display:none; flex:0 0 42px; width:42px; height:42px; padding:0; border-radius:50%; background:transparent; color:var(--primary-text-color); font-size:24px; line-height:1; }
      .wrap.ha-narrow .ha-menu-toggle { display:flex; align-items:center; justify-content:center; }
      .header-primary-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
      .header-actions-menu { position:relative; margin:0; }
      .more-actions-toggle { display:flex; align-items:center; justify-content:center; min-width:42px; height:42px; padding:0 12px; }
      .header-action-buttons { display:none; }
      .header-actions-menu.open > .header-action-buttons { position:absolute; z-index:100; top:48px; right:0; width:270px; box-sizing:border-box; display:grid; grid-template-columns:1fr; gap:7px; padding:10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:0 8px 28px rgba(0,0,0,.35); }
      .header-action-buttons button { width:100%; }
      .toast { position:fixed; z-index:1000; right:20px; bottom:20px; max-width:min(420px,calc(100vw - 32px)); padding:12px 16px; border-radius:12px; color:#fff; background:#2e7d32; box-shadow:0 10px 30px rgba(0,0,0,.32); font-weight:600; animation:toast-in .18s ease-out; }
      .toast.info { background:#45657d; }
      .toast.error { background:var(--error-color,#c62828); }
      @keyframes toast-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      h1 { margin:0; font-size:28px; font-weight:500; }
      h2 { margin:0 0 4px 0; font-size:20px; font-weight:500; }
      h3 { margin:18px 0 8px 0; font-size:15px; font-weight:600; }
      .subtitle { color: var(--secondary-text-color); margin-top:4px; }
      .frontend-version { display:inline-flex; margin-top:6px; padding:2px 8px; border-radius:999px; border:1px solid var(--divider-color); color:var(--secondary-text-color); font-size:11px; background:var(--secondary-background-color); }
      .toolbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px; padding:8px; background:linear-gradient(135deg, color-mix(in srgb, var(--card-background-color) 96%, var(--primary-color)), var(--card-background-color)); }
      .toolbar > div { padding:4px 6px; }
      .toolbar .toolbar-nav { align-self:stretch; display:flex; align-items:center; padding:4px 12px 4px 4px; margin-right:2px; border-right:1px solid var(--divider-color); }
      .toolbar .search-field { flex:1 1 280px; min-width:220px; }
      .toolbar .filter-field { flex:0 1 145px; min-width:112px; }
      .toolbar .check-field { flex:0 1 132px; min-width:112px; }
      .toolbar .reset-field { flex:0 0 auto; }
      .toolbar .search-field input { max-width:none; border-color:color-mix(in srgb, var(--primary-color) 32%, var(--divider-color)); background:color-mix(in srgb, var(--secondary-background-color) 96%, var(--primary-color)); }
      .toolbar .search-field input:focus { outline:2px solid color-mix(in srgb, var(--primary-color) 42%, transparent); outline-offset:1px; border-color:var(--primary-color); }
      .toolbar label { margin-bottom:4px; font-size:10px; text-transform:uppercase; letter-spacing:.02em; }
      .toolbar input, .toolbar select { padding:7px 9px; font-size:12px; min-height:32px; }
      .toolbar .check { height:32px; font-size:12px; }
      .dashboard { flex:0 0 auto; margin-bottom:10px; }
      .dashboard-shell { border-radius:12px; background: var(--card-background-color); border:1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
      .dashboard-toggle { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:0; background: var(--card-background-color); color: var(--primary-text-color); text-align:left; border:0; }
      .dashboard-toggle-title { font-weight:700; white-space:nowrap; }
      .dashboard-summary { color: var(--secondary-text-color); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .chevron { font-size:16px; width:18px; }
      .dashboard-content { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 10px 10px; }
      .dashboard-group { border-radius:11px; background:var(--secondary-background-color); border:1px solid var(--divider-color); padding:10px; min-width:0; }
      .dashboard-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--secondary-text-color); margin:0 2px 8px; }
      .dashboard-group-wide { grid-column:1 / -1; }
      .dashboard-monitor-group { padding:7px 8px 8px; min-width:0; }
      .dashboard-monitor-tabs { display:flex; align-items:center; gap:4px; margin-bottom:5px; overflow-x:auto; }
      .dashboard-monitor-tab { flex:0 0 auto; padding:4px 9px; border-radius:12px; background:transparent; color:var(--secondary-text-color); border:1px solid transparent; font-size:10px; }
      .dashboard-monitor-tab.active { color:var(--primary-text-color); border-color:var(--divider-color); background:color-mix(in srgb, var(--primary-color) 14%, var(--secondary-background-color)); }
      .live-dot { display:inline-block; width:7px; height:7px; margin-left:4px; border-radius:50%; background:var(--success-color, #43a047); box-shadow:0 0 0 2px color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); }
      .live-dot.paused { background:var(--warning-color, #ffa600); }
      .live-monitor { min-width:0; }
      .live-summary { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; color:var(--secondary-text-color); font-size:11px; margin-bottom:5px; }
      .live-summary b { color:var(--primary-text-color); }
      .live-small-btn { padding:4px 9px; min-height:26px; font-size:10px; margin-left:auto; }
      .live-chart { height:58px; display:flex; align-items:flex-end; gap:3px; padding:4px 6px; border:1px solid var(--divider-color); border-radius:8px; background:color-mix(in srgb, var(--secondary-background-color) 88%, transparent); overflow:hidden; }
      .live-chart i { flex:1 1 0; min-width:1px; border-radius:3px 3px 0 0; background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 55%, transparent)); }
      .live-filters { display:grid; grid-template-columns:minmax(150px,2fr) minmax(100px,.7fr) minmax(110px,.8fr) auto; gap:6px; margin:7px 0; }
      .live-filters input, .live-filters select { height:30px; padding:4px 8px; border-radius:7px; font-size:11px; }
      .live-table-wrap { max-height:155px; overflow:auto; border:1px solid var(--divider-color); border-radius:8px; }
      .live-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; }
      .live-table th { position:sticky; top:0; z-index:1; background:var(--secondary-background-color); color:var(--secondary-text-color); text-align:left; padding:5px 7px; }
      .live-table td { padding:5px 7px; border-top:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .live-table tbody tr { cursor:pointer; }
      .live-table tbody tr:hover { background:color-mix(in srgb, var(--primary-color) 9%, transparent); }
      .live-table tbody tr.live-write { background:color-mix(in srgb, #4f9fcf 10%, transparent); box-shadow:inset 3px 0 0 #4f9fcf; }
      .live-table tbody tr.live-write:hover { background:color-mix(in srgb, #4f9fcf 16%, transparent); }
      .live-table th:nth-child(1), .live-table td:nth-child(1) { width:72px; }
      .live-table th:nth-child(3), .live-table td:nth-child(3) { width:150px; }
      .live-table th:nth-child(4), .live-table td:nth-child(4) { width:70px; }
      .live-table td small { display:block; color:var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; }
      .live-value span { color:var(--primary-color); padding:0 5px; }
      .live-source { display:inline-flex; border:1px solid var(--divider-color); border-radius:10px; padding:1px 5px; font-size:10px; }
      .live-source.write { color:#80c8ef; border-color:rgba(79,159,207,.42); background:rgba(79,159,207,.10); }
      .live-foot { color:var(--secondary-text-color); font-size:9px; margin-top:4px; text-align:right; }
      .dashboard-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(132px,1fr)); gap:7px; }
      .stat { padding:8px 10px; min-height:38px; border-radius:9px; background:var(--secondary-background-color); border:1px solid var(--divider-color); min-width:0; display:flex; align-items:center; }
      .stat-ok { border-color: color-mix(in srgb, var(--success-color, #43a047) 45%, var(--divider-color)); background: color-mix(in srgb, var(--success-color, #43a047) 10%, var(--secondary-background-color)); }
      .stat-warn { border-color: color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background: color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--secondary-background-color)); }
      .stat-bad { border-color: color-mix(in srgb, var(--error-color, #db4437) 55%, var(--divider-color)); background: color-mix(in srgb, var(--error-color, #db4437) 12%, var(--secondary-background-color)); }
      .stat-muted { opacity:.78; }
      .stat-line { display:flex; align-items:center; gap:8px; min-width:0; width:100%; }
      .stat-icon { font-size:17px; width:21px; flex:0 0 21px; text-align:center; }
      .stat-value { font-size:16px; line-height:1.15; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .stat-label { color:var(--secondary-text-color); font-size:10px; line-height:1.2; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .card { background: var(--card-background-color); border-radius: 12px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); border: 1px solid var(--divider-color); }
      input, select { width:100%; box-sizing:border-box; border:1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); border-radius:8px; padding:12px; font-size:15px; }
      label { display:block; font-size:12px; color: var(--secondary-text-color); margin-bottom:6px; }
      button { border:0; border-radius:20px; background: var(--primary-color); color: var(--text-primary-color); padding:10px 16px; cursor:pointer; font-weight:500; }
      button.secondary { background: var(--secondary-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); }
      button.danger { color: var(--error-color, #db4437); }
      button:disabled { opacity:.55; cursor:default; }
      .view-tabs { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:6px; margin:0; }
      .view-tab { background:var(--secondary-background-color); color:var(--primary-text-color); border:1px solid var(--divider-color); border-radius:999px; padding:8px 14px; }
      .view-tab.active { background: color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color: color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); color:var(--primary-text-color); }
      .view-panel { flex:1 1 auto; min-height:0; margin-top:0; overflow:auto; }
      .virtual-actions { display:flex; flex-wrap:wrap; gap:6px; }
      .virtual-actions button { padding:6px 10px; font-size:12px; border-radius:14px; }
      .virtual-icon-actions { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; }
      .icon-action { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; padding:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:14px; line-height:1; }
      .icon-action:hover { border-color:var(--primary-color); background:rgba(33,150,243,.12); }
      .icon-action.danger:hover { border-color:var(--error-color, #db4437); background:rgba(219,68,55,.14); color:var(--error-color, #db4437); }
      .icon-action:disabled { opacity:.45; cursor:default; }
      .compact-source { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; font-weight:600; cursor:pointer; text-align:left; }
      .compact-source:hover { text-decoration:underline; }
      .virtual-type-badge { display:inline-flex; align-items:center; gap:4px; border:1px solid var(--divider-color); background:rgba(255,255,255,.04); border-radius:999px; padding:3px 8px; white-space:nowrap; font-weight:600; }
      .virtual-state-badge { display:inline-flex; align-items:center; justify-content:center; min-width:44px; border-radius:999px; padding:3px 8px; font-size:11px; font-weight:700; border:1px solid var(--divider-color); }
      .virtual-state-badge.on { color:#7ee787; background:rgba(46,160,67,.18); border-color:rgba(46,160,67,.45); }
      .virtual-state-badge.off { color:var(--secondary-text-color); background:rgba(128,128,128,.16); border-color:rgba(128,128,128,.35); }
      .virtual-state-badge.unavailable, .virtual-state-badge.unknown { color:#ffb86c; background:rgba(255,184,108,.15); border-color:rgba(255,184,108,.4); }
      .virtual-badge { display:inline-flex; align-items:center; gap:4px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--secondary-text-color); padding:1px 7px; font-size:11px; margin-top:3px; }
      .check { display:flex; gap:8px; align-items:center; height:44px; color: var(--primary-text-color); }
      .check input { width:auto; }
      #explorerView { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
      .content { flex:1 1 auto; height:100%; min-height:0; display:grid; grid-template-columns: minmax(0, 3fr) minmax(560px, 2fr); gap:12px; overflow:hidden; }
      .content.details-hidden { grid-template-columns: minmax(0, 1fr); }
      .content.details-hidden .side { display:none; }
      .side { padding:0; height:100%; min-height:0; overflow:hidden; display:flex; flex-direction:column; }
      .side-tabs { flex:0 0 auto; display:flex; gap:6px; padding:10px 12px 0 12px; border-bottom:1px solid var(--divider-color); background:var(--card-background-color); position:relative; z-index:30; box-shadow:0 1px 0 var(--divider-color); overflow-x:auto; overflow-y:hidden; scrollbar-width:thin; }
      .side-tab { border:1px solid var(--divider-color); border-bottom:0; border-radius:10px 10px 0 0; background:var(--secondary-background-color); color:var(--primary-text-color); padding:8px 10px; font-size:12px; }
      .side-tab.active { background:color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color)); border-color:color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); }
      .side-body { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:14px 16px 16px 16px; position:relative; }
      .side-section-head { background:var(--card-background-color); margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); }
      .point-inspector-head { position:sticky; top:-14px; z-index:25; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); background:color-mix(in srgb, var(--card-background-color) 96%, transparent); box-shadow:0 2px 8px rgba(0,0,0,.16); backdrop-filter:blur(10px); }
      .point-inspector-head h2 { font-weight:700; overflow-wrap:anywhere; }
      .inspector-head-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:6px; flex:0 0 auto; }
      .inspector-head-actions button { padding:7px 11px; font-size:12px; white-space:nowrap; }
      .save-hint { margin:8px 0 12px; }
      .dirty-banner { margin:8px 0; padding:8px 10px; border-radius:8px; border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background:color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--card-background-color)); }
      .validation-errors { margin:8px 0; padding:8px 10px; border-radius:8px; color:var(--error-color, #db4437); border:1px solid color-mix(in srgb, var(--error-color, #db4437) 55%, var(--divider-color)); }
      .priority-warning { margin:8px 0; padding:8px 10px; border-radius:8px; border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); }
      .pending-reload { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; font-size:11px; background:color-mix(in srgb, var(--warning-color, #ffa600) 16%, var(--secondary-background-color)); border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 48%, var(--divider-color)); }
      .point-summary { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:start; border:1px solid var(--divider-color); border-radius:10px; background:var(--secondary-background-color); padding:10px; margin:0 0 12px 0; }
      .point-summary-title { font-size:16px; font-weight:700; line-height:1.2; overflow-wrap:anywhere; }
      .point-summary-sub { color:var(--secondary-text-color); font-size:12px; margin-top:3px; overflow-wrap:anywhere; }
      .point-summary-value { justify-self:end; display:flex; flex-direction:column; align-items:flex-end; gap:4px; min-width:74px; }
      .point-summary-value strong { font-size:18px; line-height:1; }
      .point-summary-unit { color:var(--secondary-text-color); font-size:12px; }
      .point-summary-meta { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:6px; }
      .side .virtual-overview { margin:0; border:0; box-shadow:none; background:transparent; padding:0; }
      .side .virtual-table { min-width:0; table-layout:auto; }
      .side .virtual-table th, .side .virtual-table td { font-size:11px; padding:6px; }
      .side-virtual-cards { display:flex; flex-direction:column; gap:10px; }
      .side-virtual-card { border:1px solid var(--divider-color); border-radius:12px; padding:10px; background:rgba(255,255,255,.03); }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
      .side-virtual-card-name { font-weight:700; overflow:hidden; text-overflow:ellipsis; }
      .side-virtual-card-meta { display:flex; align-items:center; gap:8px; color:var(--secondary-text-color); font-size:12px; margin:4px 0; overflow:hidden; overflow-wrap:anywhere; }
      .side-virtual-card-rules { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:8px 0; }
      .side-virtual-card-rules div { min-width:0; border:1px solid var(--divider-color); border-radius:8px; padding:5px; background:rgba(0,0,0,.12); }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); font-size:10px; }
      .side-virtual-card-rules code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card { border:1px solid color-mix(in srgb, var(--divider-color) 84%, var(--primary-color)); border-radius:10px; background:linear-gradient(180deg, color-mix(in srgb, var(--secondary-background-color) 92%, var(--primary-color)), var(--secondary-background-color)); padding:10px; overflow:hidden; }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; }
      .side-virtual-card-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card-meta { color:var(--secondary-text-color); font-size:12px; overflow-wrap:anywhere; margin-top:3px; }
      .side-virtual-card-rules { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:8px; font-size:11px; }
      .side-virtual-card-rules div { border:1px solid var(--divider-color); border-radius:8px; padding:5px 6px; background:var(--card-background-color); min-width:0; }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); margin-bottom:2px; }
      .side-virtual-card-rules code { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
      .virtual-rule-flow { display:grid; grid-template-columns:1fr auto 1fr; gap:6px; align-items:center; margin:9px 0; }
      .virtual-rule-box { min-width:0; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); padding:6px 8px; }
      .virtual-rule-box span { display:block; color:var(--secondary-text-color); font-size:10px; text-transform:uppercase; letter-spacing:.03em; margin-bottom:2px; }
      .virtual-rule-box code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .virtual-rule-arrow { color:var(--secondary-text-color); font-size:13px; }
      .selected-source-box { border:1px solid var(--divider-color); border-radius:10px; padding:10px; margin:0 0 12px 0; background:var(--secondary-background-color); }
      table { width:100%; min-width:980px; border-collapse:collapse; table-layout:fixed; }
      col.select-col-col { width:42px; }
      col.object-col-col { width:210px; }
      col.entity-col-col { width:auto; min-width:330px; }
      col.value-col-col { width:108px; }
      col.unit-col-col { width:130px; }
      col.override-col-col { width:90px; }
      col.runtime-col-col { width:190px; }
      th, td { text-align:left; padding:9px 12px; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 72%, transparent); font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; }
      th[data-sort='present_value'], td[data-col='value'], th[data-sort='override'], td[data-col='override'], th[data-sort='runtime'], td[data-col='status'] { text-align:center; }
      td[data-col='entity'] { white-space:normal; }
      td[data-col='value'] { padding-left:6px; padding-right:6px; }
      td[data-col='override'] { padding-left:6px; padding-right:6px; }
      td[data-col='status'] { padding-left:6px; padding-right:6px; }
      .transport-state-stack { display:flex; flex-direction:column; gap:5px; min-width:155px; text-align:left; }
      .transport-state-stack > span { display:grid; grid-template-columns:54px 12px minmax(0,1fr); gap:6px; align-items:center; }
      .transport-state-stack small { color:var(--secondary-text-color); font-size:8px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
      .transport-state-stack b { overflow:hidden; color:var(--primary-text-color); font-size:10px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
      .transport-state-stack em { padding-left:72px; color:var(--warning-color,#f0ad4e); font-size:9px; font-style:normal; line-height:1.2; }
      .transport-state-stack.mismatch { border-left:2px solid var(--warning-color,#f0ad4e); padding-left:7px; }
      .transport-comparison { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:10px; align-items:center; margin-top:12px; padding:11px 12px; border:1px solid var(--divider-color); border-radius:10px; background:color-mix(in srgb,var(--secondary-background-color) 75%,transparent); }
      .transport-comparison > div { display:flex; flex-direction:column; gap:4px; }
      .transport-comparison small { color:var(--secondary-text-color); font-size:9px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
      .transport-comparison strong { color:var(--primary-text-color); font-size:12px; }
      .transport-comparison > span { color:var(--secondary-text-color); }
      .transport-comparison p { grid-column:1 / -1; margin:0; color:var(--warning-color,#f0ad4e); font-size:10px; font-weight:700; }
      .transport-comparison.mismatch { border-color:color-mix(in srgb,var(--warning-color,#f0ad4e) 45%,var(--divider-color)); }
      .transport-ok { margin-top:10px; color:var(--secondary-text-color); font-size:11px; }
      .transport-ok strong { color:var(--primary-text-color); }
      .transport-state-ok { display:flex; align-items:center; gap:7px; min-width:0; }
      .transport-state-ok b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
      th { color: var(--secondary-text-color); font-weight:600; font-size:12px; position:sticky; top:0; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-background-color)); z-index:20; overflow:hidden; box-shadow: 0 1px 0 var(--divider-color); }
      th.sortable { cursor:pointer; user-select:none; }
      .sort-btn { border:0; border-radius:0; background:transparent; color:inherit; padding:0; font:inherit; cursor:pointer; }
      td.select-col { position:sticky; left:0; z-index:2; background:var(--card-background-color); }
      th.select-col { position:sticky; left:0; z-index:30; background:var(--card-background-color); }
      td[data-col='object'] { position:sticky; left:42px; z-index:2; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color); }
      th.object-col { position:sticky; left:42px; z-index:29; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color), 0 1px 0 var(--divider-color); }

      .rule-help { margin-top:8px; padding:8px 10px; border-radius:8px; background:var(--secondary-background-color); font-size:12px; line-height:1.45; }
      .rule-help code { font-family:var(--code-font-family, monospace); background:rgba(127,127,127,.12); border-radius:4px; padding:1px 4px; }
      .virtual-overview { margin:0 0 12px 0; padding:12px; }
      .virtual-filterbar { grid-template-columns: minmax(260px, 520px) auto 1fr; }
      tr.source-jump-highlight { outline:2px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent) !important; }
      .virtual-overview-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
      .virtual-overview-title { font-weight:700; }
      .virtual-table-wrap { overflow:auto; }
      .virtual-table { width:100%; min-width:860px; table-layout:fixed; }
      .virtual-table th, .virtual-table td { position:static; padding:10px 8px; font-size:12px; white-space:normal; overflow-wrap:anywhere; vertical-align:middle; }
      .virtual-table th:nth-child(1) { width:110px; }
      .virtual-table th:nth-child(2) { width:300px; }
      .virtual-table th:nth-child(3) { width:120px; }
      .virtual-table th:nth-child(4) { width:80px; }
      .virtual-table th:nth-child(5), .virtual-table th:nth-child(6), .virtual-table th:nth-child(7) { width:90px; }
      .virtual-table th:nth-child(8) { width:170px; }
      .virtual-table tr { cursor:default; }
      .virtual-table .link-cell { font-size:13px; }
      .virtual-name-link { color:var(--primary-text-color); font-weight:600; }
      .entity-id-line { margin-top:3px; font-size:11px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
      .virtual-source-btn { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; cursor:pointer; text-align:left; }
      .virtual-source-btn:hover { text-decoration:underline; }
      .assistant-card { margin:10px 0 12px; padding:10px 12px; border:1px solid color-mix(in srgb, var(--primary-color) 35%, var(--divider-color)); border-radius:10px; background:color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); }
      .assistant-card .assistant-title { font-weight:700; margin-bottom:4px; }
      .assistant-card .assistant-grid { display:grid; grid-template-columns:82px minmax(0,1fr); gap:3px 8px; margin-top:8px; font-size:12px; }
      .assistant-card .assistant-grid span:nth-child(odd) { color:var(--secondary-text-color); }
      .assistant-card button { margin-top:10px; }
      .rule-preview { margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .rule-preview > div { border:1px solid var(--divider-color); border-radius:8px; padding:8px 10px; background:var(--card-background-color); }
      .rule-preview span, .rule-preview strong { display:block; }
      .rule-result.on { color:var(--success-color, #0b8); }
      .rule-result.off { color:var(--secondary-text-color); }
      .rule-result.unav { color:var(--error-color, #d33); }

      .virtual-spacer td { padding:0 !important; border-bottom:0 !important; }
      .virtual-spacer:hover { background:transparent; }
      tr:hover td[data-col='object'], tr:hover td.select-col { background:var(--secondary-background-color); }
      tr.selected td[data-col='object'], tr.selected td.select-col { background: color-mix(in srgb, var(--primary-color) 16%, var(--card-background-color)); }
      .inline-select { min-width:100px; max-width:140px; padding:6px 8px; font-size:13px; border-radius:7px; }
      .unit-stack { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .unit-display { font-weight:600; }
      tr { cursor:pointer; }
      tr:hover { background: color-mix(in srgb, var(--secondary-background-color) 88%, var(--primary-color)); }
      tr.selected { background: color-mix(in srgb, var(--primary-color) 16%, transparent); outline: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent); }
      tr.value-up { --bepacom-change-color: var(--success-color, #43a047); }
      tr.value-down { --bepacom-change-color: #8f7bd8; }
      tr.value-changed { --bepacom-change-color: var(--warning-color, #fb8c00); }
      tr.value-flash td[data-col='value'] .value-link { animation: bepacom-value-pill 3.2s ease-out; }
      tr.value-flash td[data-col='value'] .value-link::after { animation: bepacom-value-ring 1.6s ease-out; }
      @keyframes bepacom-value-pill {
        0% {
          color: var(--primary-text-color);
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 60%, transparent),
            0 0 18px color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, transparent);
          transform: translateY(-1px) scale(1.035);
        }
        22% {
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 22%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 42%, transparent),
            0 0 12px color-mix(in srgb, var(--bepacom-change-color, #43a047) 24%, transparent);
          transform: translateY(0) scale(1);
        }
        100% {
          color: var(--primary-text-color);
          background: transparent;
          box-shadow: 0 0 0 1px transparent, 0 0 0 transparent;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes bepacom-value-ring {
        0% { opacity:.95; transform:scale(.88); }
        70% { opacity:0; transform:scale(1.32); }
        100% { opacity:0; transform:scale(1.32); }
      }
      .table-wrap { display:block; align-self:stretch; width:100%; height:100%; max-height:100%; min-height:0; overflow-x:auto; overflow-y:scroll; overscroll-behavior:contain; touch-action:pan-y; scrollbar-color: color-mix(in srgb, var(--secondary-text-color) 42%, transparent) transparent; scrollbar-width:thin; }
      .table-wrap::-webkit-scrollbar, .side-body::-webkit-scrollbar, .view-panel::-webkit-scrollbar, .virtual-table-wrap::-webkit-scrollbar { width:8px; height:8px; }
      .table-wrap::-webkit-scrollbar-thumb, .side-body::-webkit-scrollbar-thumb, .view-panel::-webkit-scrollbar-thumb, .virtual-table-wrap::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--secondary-text-color) 36%, transparent); border-radius:999px; }
      .table-wrap::-webkit-scrollbar-track, .side-body::-webkit-scrollbar-track, .view-panel::-webkit-scrollbar-track, .virtual-table-wrap::-webkit-scrollbar-track { background:transparent; }
      .select-col { width:36px; text-align:center; }
      .object-main { display:flex; align-items:center; gap:10px; }
      .type-icon { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:10px; font-size:11px; font-weight:800; letter-spacing:.2px; color:white; flex:0 0 auto; }
      .type-ai { background:#1e88e5; } .type-ao { background:#8e24aa; } .type-av { background:#00897b; }
      .type-bi { background:#43a047; } .type-bo { background:#ef6c00; } .type-bv { background:#6d4c41; }
      .type-ms { background:#546e7a; } .type-other { background:#757575; }
      .group-row td { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); position:sticky; top:0; z-index:1; }
      .group-toggle { appearance:none; border:0; background:transparent; color:var(--primary-text-color); font-weight:700; cursor:pointer; padding:6px 0; }
      .virtual-spacer td { padding:0; border:0; }
      .bulkbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:10px; align-items:end; padding:10px 12px; margin-bottom:10px; }
      .bulkbar-empty { color: var(--secondary-text-color); font-size:12px; margin-bottom:8px; }
      .bulkbar label { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--secondary-text-color); }
      .bulkbar select { min-width:130px; }
      .name { font-weight:700; }
      .muted { color: var(--secondary-text-color); font-size:12px; }

      .link-cell { appearance:none; border:0; background:transparent; color:var(--primary-text-color); padding:0; margin:0; font:inherit; text-align:left; cursor:pointer; }
      .link-cell:hover { color:var(--primary-color); text-decoration:underline; }
      .value-link { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:44px; max-width:100%; padding:4px 9px; border-radius:999px; font-weight:700; font-size:14px; line-height:1.25; transition:background .18s ease, box-shadow .18s ease, color .18s ease; }
      .value-link::after { content:""; position:absolute; inset:-4px; border-radius:inherit; border:1px solid var(--bepacom-change-color, #43a047); opacity:0; pointer-events:none; }
      .entity-stack { display:flex; flex-direction:column; gap:4px; min-width:0; }
      .linked-entities { display:flex; flex-direction:column; gap:3px; min-width:0; }
      .linked-entity-link { appearance:none; border:0; background:transparent; color:var(--secondary-text-color); padding:0; margin:0; font:inherit; font-size:12px; line-height:1.25; text-align:left; cursor:pointer; max-width:100%; display:flex; align-items:center; gap:4px; white-space:normal; overflow-wrap:anywhere; }
      .linked-entity-link:hover { color:var(--primary-color); text-decoration:underline; }
      .linked-entity-link:disabled { opacity:.65; cursor:default; text-decoration:none; }
      .linked-icon { flex:0 0 auto; opacity:.9; }
      .linked-name { min-width:0; overflow-wrap:anywhere; }
      .linked-state { display:inline-flex; align-items:center; border-radius:999px; padding:1px 6px; margin-left:4px; font-size:11px; background:var(--secondary-background-color); border:1px solid var(--divider-color); color:var(--primary-text-color); white-space:nowrap; }
      .runtime-filter { gap:6px; }
      .runtime-head { text-align:center; }
      .write-profile-head, .write-profile-cell { width:72px; text-align:center; }
      .write-profile-dot { display:inline-block; width:11px; height:11px; border-radius:50%; vertical-align:middle; border:1px solid color-mix(in srgb, var(--divider-color) 55%, transparent); }
      .write-profile-dot.direct { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .write-profile-dot.glt { background:#8e24aa; box-shadow:0 0 0 3px color-mix(in srgb, #8e24aa 18%, transparent); }
      .runtime-dot { display:inline-flex; width:12px; height:12px; border-radius:50%; border:1px solid color-mix(in srgb, var(--divider-color) 70%, transparent); box-shadow:0 0 0 3px color-mix(in srgb, var(--divider-color) 20%, transparent); vertical-align:middle; }
      .runtime-off { background:#7a7a7a; }
      .runtime-poll { background:#f57c00; box-shadow:0 0 0 3px color-mix(in srgb, #f57c00 18%, transparent); }
      .runtime-push { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .runtime-snapshot { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .runtime-wait { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip { display:inline-flex; align-items:center; gap:6px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); padding:3px 8px; font-size:12px; font-weight:600; }
      .mode-chip::before { content:""; width:8px; height:8px; border-radius:50%; background:#7a7a7a; box-shadow:0 0 0 3px color-mix(in srgb, #7a7a7a 18%, transparent); }
      .mode-chip.push { border-color:color-mix(in srgb, #1e88e5 48%, var(--divider-color)); background:color-mix(in srgb, #1e88e5 12%, var(--secondary-background-color)); }
      .mode-chip.push::before { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .mode-chip.polling { border-color:color-mix(in srgb, #43a047 48%, var(--divider-color)); background:color-mix(in srgb, #43a047 12%, var(--secondary-background-color)); }
      .mode-chip.polling::before { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .mode-chip.wait { border-color:color-mix(in srgb, #ffa600 48%, var(--divider-color)); background:color-mix(in srgb, #ffa600 12%, var(--secondary-background-color)); }
      .mode-chip.wait::before { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip.off { color:var(--secondary-text-color); }
      .pill { display:inline-flex; align-items:center; border-radius:999px; padding:3px 8px; font-size:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); margin-right:4px; white-space:nowrap; }
      .ok { color: var(--success-color, #43a047); }
      .warn { color: var(--warning-color, #ffa600); }
      .bad { color: var(--error-color, #db4437); }
      .details-toggle-active { background: color-mix(in srgb, var(--primary-color) 16%, var(--secondary-background-color)) !important; border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color)) !important; }
      .kv { display:grid; grid-template-columns: 145px minmax(0, 1fr); gap:8px; padding:7px 0; border-bottom:1px solid var(--divider-color); }
      .kv .k { color: var(--secondary-text-color); }
      .kv .v { overflow-wrap:anywhere; }
      .edit-grid { display:grid; grid-template-columns: 1fr; gap:10px; }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .history-list { border:1px solid var(--divider-color); border-radius:8px; overflow:hidden; }
      .history-row { display:grid; grid-template-columns: 90px 1fr 80px; gap:8px; padding:6px 8px; border-bottom:1px solid var(--divider-color); font-size:13px; }
      .history-row:last-child { border-bottom:0; }
      code { font-family: var(--code-font-family, monospace); font-size:12px; }
      details summary { cursor:pointer; margin: 8px 0; color: var(--primary-text-color); }
      details.detail-section { border:1px solid var(--divider-color); border-radius:10px; padding:8px 10px; margin-top:12px; background: var(--secondary-background-color); }
      details.detail-section > summary { font-weight:700; margin:0; }
      .detail-section-body { margin-top:12px; }
      .notice { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border:1px solid color-mix(in srgb, var(--primary-color) 35%, transparent); border-radius:8px; padding:10px; margin:10px 0; }
      .error { background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); color: var(--error-color, #db4437); border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 35%, transparent); border-radius:8px; padding:12px; margin-bottom:12px; }
      .empty { padding:32px; text-align:center; color: var(--secondary-text-color); }

      /* Warm dashboard design inspired by the supplied visual reference. */
      :host {
        --primary-color:#e7902f;
        --accent-color:#e7902f;
        --primary-text-color:#f6f3ed;
        --text-primary-color:#17130e;
        --secondary-text-color:#bbb4a9;
        --card-background-color:rgba(55,52,48,.82);
        --secondary-background-color:rgba(81,76,69,.48);
        --divider-color:rgba(255,255,255,.105);
        --bp-surface:rgba(55,52,48,.82);
        --bp-surface-strong:rgba(62,58,53,.94);
        --bp-surface-soft:rgba(255,255,255,.055);
        --bp-shadow:0 18px 45px rgba(0,0,0,.22);
        --bp-radius:17px;
        color-scheme:dark;
        font-family:Inter,"SF Pro Display","Segoe UI Variable","Segoe UI",Roboto,sans-serif;
        background:
          radial-gradient(85% 60% at 48% 108%, rgba(201,135,55,.44) 0%, rgba(129,91,48,.16) 42%, transparent 72%),
          radial-gradient(55% 48% at 7% 18%, rgba(255,255,255,.075), transparent 70%),
          linear-gradient(145deg,#252422 0%,#1b1a19 54%,#24201b 100%);
      }
      .wrap { padding:18px 22px 20px; }
      .header { margin-bottom:16px; }
      h1 { font-size:27px; line-height:1.08; font-weight:760; letter-spacing:-.045em; color:#fffdf8; }
      h2 { font-weight:700; letter-spacing:-.025em; }
      h3 { font-weight:680; letter-spacing:-.01em; }
      .subtitle { margin-top:7px; color:#aaa398; font-size:12px; }
      .frontend-version {
        margin-top:8px; padding:4px 9px; border-color:rgba(255,255,255,.09);
        background:rgba(255,255,255,.045); color:#aaa398; font-size:10px;
      }
      .card,.dashboard-shell,.toolbar,.side {
        border-color:rgba(255,255,255,.105);
        border-radius:var(--bp-radius);
        background:linear-gradient(145deg,rgba(71,67,61,.82),rgba(47,45,42,.88));
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.04);
        backdrop-filter:blur(18px) saturate(112%);
      }
      .dashboard-shell { overflow:hidden; }
      .dashboard-toggle {
        min-height:48px; padding:12px 16px;
        background:linear-gradient(90deg,rgba(255,255,255,.035),transparent);
      }
      .dashboard-toggle-title { font-size:13px; letter-spacing:-.01em; }
      .dashboard-summary { color:#aaa398; font-size:11px; }
      .dashboard-content { gap:11px; padding:0 12px 12px; }
      .dashboard-group {
        padding:12px; border-color:rgba(255,255,255,.075); border-radius:14px;
        background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));
      }
      .dashboard-title { color:#d0c9be; font-size:10px; letter-spacing:.09em; }
      .dashboard-monitor-tab { padding:6px 11px; border-radius:999px; }
      .dashboard-monitor-tab.active {
        color:#fff9ef; border-color:rgba(231,144,47,.45);
        background:rgba(231,144,47,.16);
      }
      button {
        min-height:34px; border-radius:999px; padding:8px 14px;
        background:linear-gradient(135deg,#efa044,#d87d20);
        color:#18130d; font-family:inherit; font-size:12px; font-weight:650;
        box-shadow:0 5px 15px rgba(195,112,28,.16);
        transition:transform .16s ease,filter .16s ease,border-color .16s ease,background .16s ease;
      }
      button:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); }
      button:active:not(:disabled) { transform:translateY(0); }
      button.secondary,.view-tab,.icon-action {
        color:#eee9e1; border-color:rgba(255,255,255,.105);
        background:rgba(255,255,255,.055); box-shadow:none;
      }
      button.secondary:hover:not(:disabled),.view-tab:hover,.icon-action:hover {
        border-color:rgba(231,144,47,.42); background:rgba(231,144,47,.11);
      }
      .view-tab.active,.details-toggle-active {
        color:#fff8ed!important; border-color:rgba(231,144,47,.48)!important;
        background:linear-gradient(135deg,rgba(231,144,47,.23),rgba(231,144,47,.1))!important;
      }
      input,select {
        min-height:38px; padding:9px 11px;
        border-color:rgba(255,255,255,.1); border-radius:11px;
        background:rgba(20,19,18,.35); color:#f5f1e9;
        font-family:inherit; font-size:13px;
      }
      input:focus,select:focus {
        outline:2px solid rgba(231,144,47,.3); outline-offset:1px;
        border-color:rgba(231,144,47,.62);
      }
      label { color:#aaa398; font-size:10px; letter-spacing:.045em; text-transform:uppercase; }
      .bulkbar { border-radius:14px; background:rgba(59,56,52,.7); }
      .table-wrap {
        border:1px solid rgba(255,255,255,.1); border-radius:var(--bp-radius);
        background:linear-gradient(150deg,rgba(59,56,52,.88),rgba(41,39,37,.92));
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.035);
      }
      table { border-collapse:separate; border-spacing:0; }
      th {
        background:rgba(39,37,35,.94)!important; color:#aaa398;
        font-size:10px; font-weight:650; letter-spacing:.055em; text-transform:uppercase;
      }
      td { border-color:rgba(255,255,255,.065)!important; }
      tbody tr { transition:background .15s ease,box-shadow .15s ease; }
      tbody tr:hover:not(.group-row) { background:rgba(255,255,255,.035); }
      tbody tr.selected {
        background:linear-gradient(90deg,rgba(231,144,47,.18),rgba(231,144,47,.055));
        box-shadow:inset 3px 0 0 #e7902f;
      }
      .group-row td { background:rgba(231,144,47,.09); }
      .name { color:#faf7f0; font-weight:650; letter-spacing:-.01em; }
      .muted { color:#aaa398; }
      .value-link {
        color:#f6d39f; background:rgba(231,144,47,.085);
        border:1px solid rgba(231,144,47,.16);
      }
      .pill,.virtual-badge,.linked-state,.mode-chip {
        border-color:rgba(255,255,255,.1); background:rgba(255,255,255,.05);
      }
      .side-tabs {
        padding:11px 12px 0; gap:5px; border-color:rgba(255,255,255,.08);
        background:rgba(39,37,35,.6); box-shadow:none;
      }
      .side-tab {
        min-height:32px; padding:7px 11px; border-radius:10px 10px 0 0;
        color:#aaa398; border-color:transparent; background:transparent; box-shadow:none;
      }
      .side-tab.active {
        color:#fff7eb; border-color:rgba(231,144,47,.3);
        background:linear-gradient(180deg,rgba(231,144,47,.2),rgba(231,144,47,.07));
      }
      .side-body { padding:17px 18px 18px; }
      .side-section-head,.point-inspector-head {
        margin-left:-18px; margin-right:-18px; padding-left:18px; padding-right:18px;
        border-color:rgba(255,255,255,.075);
        background:linear-gradient(180deg,rgba(58,55,51,.96),rgba(49,47,44,.9));
      }
      details.detail-section {
        padding:10px 12px; border-color:rgba(255,255,255,.085); border-radius:13px;
        background:rgba(255,255,255,.035);
      }
      details.detail-section > summary { font-size:12px; color:#e8e2d9; }
      .kv { border-color:rgba(255,255,255,.065); }
      .kv .k { color:#aaa398; font-size:11px; }
      .live-chart,.live-table-wrap,.history-list {
        border-color:rgba(255,255,255,.085); background:rgba(15,14,13,.18);
      }
      .live-chart i { background:linear-gradient(180deg,#f5ad56,#c96f1d); }
      ::-webkit-scrollbar { width:8px; height:8px; }
      ::-webkit-scrollbar-thumb { background:rgba(217,166,104,.25); border-radius:999px; }
      ::-webkit-scrollbar-thumb:hover { background:rgba(231,144,47,.42); }

      /* Reference pass: neutral smoked glass with one restrained warm glow. */
      :host {
        --primary-color:#d88c39;
        --accent-color:#d88c39;
        --primary-text-color:#f4f2ed;
        --text-primary-color:#f4f2ed;
        --secondary-text-color:#c0bbb2;
        --card-background-color:rgba(70,69,66,.78);
        --secondary-background-color:rgba(255,255,255,.065);
        --divider-color:rgba(255,255,255,.09);
        --bp-shadow:0 12px 34px rgba(0,0,0,.16);
        --bp-radius:13px;
        background:
          radial-gradient(70% 44% at 38% 42%,rgba(191,139,67,.28) 0%,rgba(157,113,56,.13) 38%,transparent 70%),
          linear-gradient(135deg,#343433 0%,#2c2b2a 48%,#39342f 100%);
      }
      .wrap { padding:16px 20px 18px; }
      h1 { font-size:25px; font-weight:720; letter-spacing:-.035em; }
      .subtitle { color:#bdb8af; }
      .card,.dashboard-shell,.toolbar,.side,.table-wrap {
        border:1px solid rgba(255,255,255,.1);
        border-radius:13px;
        background:rgba(72,70,67,.7);
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.035);
        backdrop-filter:blur(22px) saturate(108%);
      }
      .dashboard-toggle {
        background:rgba(255,255,255,.018);
        color:#f4f2ed;
      }
      .dashboard-content { gap:9px; }
      .dashboard-group {
        border:0;
        border-radius:11px;
        background:rgba(255,255,255,.055);
      }
      .dashboard-monitor-tab.active {
        color:#fff;
        border-color:rgba(255,255,255,.32);
        background:rgba(255,255,255,.09);
      }
      button {
        color:#f4f2ed;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.065);
        box-shadow:none;
        font-weight:580;
      }
      button:hover:not(:disabled) {
        border-color:rgba(255,255,255,.28);
        background:rgba(255,255,255,.11);
        filter:none;
      }
      button.secondary,.view-tab,.icon-action {
        color:#f4f2ed;
        border-color:rgba(255,255,255,.1);
        background:rgba(255,255,255,.045);
      }
      #saveOverride {
        color:#21170c;
        border-color:rgba(224,146,57,.75);
        background:#dc913d;
      }
      .view-tab.active,.details-toggle-active {
        color:#fff!important;
        border-color:rgba(255,255,255,.3)!important;
        background:rgba(255,255,255,.095)!important;
      }
      input,select {
        border-color:rgba(255,255,255,.085);
        border-radius:9px;
        background:rgba(30,29,28,.28);
      }
      select {
        color-scheme:dark;
        accent-color:#d88c39;
      }
      select option,select optgroup {
        color:#f3f0ea;
        background:#45433f;
      }
      select option:checked {
        color:#fff7ec;
        background:#7a5732;
      }
      input:focus,select:focus {
        outline:1px solid rgba(216,140,57,.46);
        border-color:rgba(216,140,57,.52);
      }
      .table-wrap {
        background:rgba(65,64,61,.72);
      }
      th {
        color:#bdb8af;
        background:rgba(50,49,47,.94)!important;
      }
      tbody tr:hover:not(.group-row) { background:rgba(255,255,255,.035); }
      tbody tr.selected {
        background:rgba(216,140,57,.1);
        box-shadow:inset 2px 0 0 #d88c39;
      }
      .group-row td { background:rgba(255,255,255,.04); }
      .value-link {
        color:#f2d2a8;
        background:transparent;
        border-color:transparent;
      }
      .side-tabs {
        background:rgba(55,54,52,.72);
      }
      .side-tab.active {
        color:#fff;
        border-color:rgba(255,255,255,.13);
        background:rgba(255,255,255,.075);
      }
      .side-section-head,.point-inspector-head {
        background:rgba(61,60,57,.94);
      }
      details.detail-section {
        border-color:rgba(255,255,255,.07);
        background:rgba(255,255,255,.035);
      }
      .live-chart i { background:linear-gradient(180deg,#dc974a,#bc7427); }
      ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); }
      ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.25); }

      /* Table hierarchy and interaction polish. */
      col.object-col-col { width:240px; }
      col.value-col-col { width:112px; }
      col.unit-col-col { width:82px; }
      col.override-col-col { width:104px; }
      col.write-profile-col-col { width:86px; }
      col.runtime-col-col { width:190px; }
      thead th {
        height:48px;
        padding:0 14px;
        color:#c7c2ba;
        font-size:11px;
        font-weight:700;
        letter-spacing:.025em;
        text-transform:none;
      }
      tbody td { height:58px; padding:8px 14px; }
      th.object-col,td[data-col="object"] {
        box-shadow:1px 0 0 rgba(255,255,255,.065);
      }
      .sort-btn,.sort-btn:hover:not(:disabled) {
        min-height:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:inherit;
        box-shadow:none;
        filter:none;
        transform:none;
      }
      .group-row td {
        height:auto;
        padding:11px 14px;
        background:rgba(255,255,255,.035);
        box-shadow:inset 3px 0 0 rgba(216,140,57,.7);
      }
      .group-toggle,.group-toggle:hover:not(:disabled) {
        min-height:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:#f7f4ee;
        box-shadow:none;
        filter:none;
        transform:none;
        font-size:15px;
        font-weight:720;
        letter-spacing:-.018em;
      }
      .group-toggle .muted {
        margin-left:4px;
        color:#aaa59d;
        font-size:12px;
        font-weight:550;
      }
      .link-cell,.link-cell:hover:not(:disabled),
      .entity-link,.entity-link:hover:not(:disabled),
      .value-link:hover:not(:disabled) {
        min-height:0;
        border:0;
        background:transparent;
        box-shadow:none;
        filter:none;
        transform:none;
      }
      .entity-link:hover:not(:disabled) {
        color:#e2a45e;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .entity-stack { gap:5px; }
      td[data-col="entity"] { padding-left:16px; }
      td[data-col="value"] { color:#f0d5ae; font-weight:700; }

      /* Readable top controls and a useful live-log viewport. */
      .header-action-buttons { gap:9px; }
      .header-action-buttons button {
        min-height:40px;
        padding:10px 15px;
        font-size:13px;
        font-weight:620;
        white-space:nowrap;
      }
      .dashboard-monitor-tabs { gap:7px; margin-bottom:9px; }
      .dashboard-monitor-tab {
        min-height:34px;
        padding:7px 13px;
        font-size:12px;
        font-weight:650;
      }
      .live-small-btn {
        min-height:34px;
        padding:7px 12px;
        font-size:11px;
      }
      .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:8px;
      }
      .live-summary { font-size:12px; margin-bottom:8px; }
      .live-chart { height:32px; }
      .live-filters { margin:9px 0; }
      .live-filters input,.live-filters select {
        height:36px;
        padding:7px 10px;
        font-size:12px;
      }
      .live-table-wrap {
        height:280px;
        max-height:34vh;
        min-height:220px;
      }
      .live-table th {
        height:auto;
        padding:8px 9px;
        font-size:11px;
      }
      .live-table td,.live-table tbody td {
        height:auto;
        padding:9px;
        font-size:12px;
      }
      .live-table td b { font-size:13px; }
      .live-table td small { margin-top:2px; font-size:10px; }

      .dashboard-headline {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        padding:0 12px 12px;
      }
      .dashboard-headline-card {
        min-width:0;
        min-height:72px;
        display:flex;
        align-items:center;
        gap:12px;
        padding:11px 14px;
        border:1px solid rgba(255,255,255,.075);
        border-radius:11px;
        background:rgba(255,255,255,.055);
      }
      .dashboard-headline-card.stat-ok { background:rgba(97,128,91,.3); }
      .dashboard-headline-card.stat-warn { background:rgba(163,114,55,.2); }
      .dashboard-headline-card.stat-bad { background:rgba(153,68,62,.22); }
      .dashboard-headline-icon {
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:rgba(255,255,255,.075);
        font-size:17px;
      }
      .dashboard-headline-card span:last-child { min-width:0; }
      .dashboard-headline-card small {
        display:block;
        margin-bottom:3px;
        color:#bdb8af;
        font-size:10px;
        font-weight:650;
        letter-spacing:.055em;
        text-transform:uppercase;
      }
      .dashboard-headline-card strong {
        display:block;
        color:#faf7f1;
        font-size:23px;
        line-height:1;
        letter-spacing:-.035em;
      }
      .api-protocol-card {
        position:relative;
        overflow:hidden;
        background:linear-gradient(135deg,rgba(163,114,55,.14),rgba(255,255,255,.035));
      }
      .api-protocol-card.protocol-v2 {
        background:linear-gradient(135deg,rgba(74,128,91,.2),rgba(255,255,255,.035));
      }
      .api-protocol-card::after {
        content:"";
        position:absolute;
        width:88px;
        height:88px;
        right:-35px;
        bottom:-52px;
        border-radius:50%;
        background:rgba(209,154,66,.09);
        pointer-events:none;
      }
      .api-protocol-card.protocol-v2::after { background:rgba(105,174,116,.1); }
      .api-protocol-content { display:flex; flex-direction:column; gap:6px; width:100%; }
      .api-protocol-title { display:flex; align-items:center; gap:7px; color:#aaa398; font-size:9px; font-weight:750; letter-spacing:.075em; text-transform:uppercase; }
      .api-protocol-dot { width:7px; height:7px; flex:0 0 7px; border-radius:50%; background:#d19a42; box-shadow:0 0 0 4px rgba(209,154,66,.1); }
      .protocol-v2 .api-protocol-dot { background:#70b47c; box-shadow:0 0 0 4px rgba(112,180,124,.1); }
      .api-protocol-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .api-protocol-card .api-protocol-name { color:#ead395; font-size:19px; line-height:1.05; letter-spacing:-.025em; }
      .api-protocol-card.protocol-v2 .api-protocol-name { color:#b9d9b8; }
      .api-protocol-badge { padding:3px 7px; border:1px solid rgba(209,154,66,.25); border-radius:999px; background:rgba(209,154,66,.08); color:#cdb47c; font-size:9px; font-weight:750; letter-spacing:.045em; text-transform:uppercase; white-space:nowrap; }
      .protocol-v2 .api-protocol-badge { border-color:rgba(112,180,124,.28); background:rgba(112,180,124,.09); color:#a8cea9; }
      .api-protocol-meta { color:#8f8a82; font-size:9px; font-weight:650; letter-spacing:.035em; text-transform:uppercase; }
      .dashboard-nav {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:7px;
        margin:0 12px 10px;
        padding:6px;
        border:1px solid rgba(255,255,255,.075);
        border-radius:12px;
        background:rgba(32,31,29,.34);
      }
      .dashboard-nav-item,.dashboard-nav-item:hover:not(:disabled) {
        min-height:42px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:#bdb8af;
        box-shadow:none;
        transform:none;
        filter:none;
        font-size:13px;
        font-weight:650;
      }
      .dashboard-nav-item:hover:not(:disabled) {
        color:#f5f2ec;
        background:rgba(255,255,255,.045);
      }
      .dashboard-nav-item.active {
        color:#fff8ed;
        background:linear-gradient(135deg,#c88a3d,#a96b28);
        box-shadow:0 5px 14px rgba(100,60,20,.16);
      }
      .dashboard-nav-icon { font-size:17px; }
      .dashboard-content {
        display:block;
        padding:0 12px 12px;
      }
      .dashboard-config-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
      }
      .dashboard-content-live .dashboard-monitor-group {
        padding:12px;
      }
      .dashboard-content-developer .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(165px,1fr));
      }
      .main-nav {
        flex:0 0 auto;
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:7px;
        margin:0 0 12px;
        padding:6px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:13px;
        background:rgba(55,54,51,.68);
        box-shadow:0 10px 28px rgba(0,0,0,.13),inset 0 1px 0 rgba(255,255,255,.035);
        backdrop-filter:blur(18px);
      }
      .main-nav-item,.main-nav-item:hover:not(:disabled) {
        min-width:0;
        min-height:54px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:11px;
        padding:8px 14px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:#bdb8af;
        box-shadow:none;
        filter:none;
        transform:none;
        text-align:left;
        text-decoration:none;
        cursor:pointer;
      }
      .main-nav-item.active,
      .main-nav-item.active:hover:not(:disabled) {
        color:#fff9ef;
        background:linear-gradient(135deg,#c88a3d,#a96b28);
        box-shadow:0 6px 16px rgba(82,49,17,.2);
      }
      .main-nav-icon {
        flex:0 0 auto;
        font-size:20px;
      }
      .main-nav-item > span:last-child { min-width:0; }
      .main-nav-item strong {
        display:block;
        font-size:14px;
        line-height:1.15;
      }
      .main-nav-item small {
        display:block;
        margin-top:3px;
        color:currentColor;
        opacity:.72;
        font-size:10px;
        font-weight:500;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .main-dashboard {
        flex:1 1 auto;
        min-height:0;
        margin-bottom:0;
        overflow:hidden;
      }
      .main-dashboard .dashboard-shell {
        height:100%;
        min-height:0;
        display:flex;
        flex-direction:column;
      }
      .dashboard-page-heading {
        flex:0 0 auto;
        min-height:48px;
        display:flex;
        align-items:center;
        gap:10px;
        padding:12px 16px;
        color:#f4f2ed;
        border-bottom:1px solid rgba(255,255,255,.065);
        background:rgba(255,255,255,.018);
      }
      .main-dashboard .dashboard-content {
        flex:1 1 auto;
        min-height:0;
      }
      .main-dashboard .dashboard-content-developer {
        overflow:auto;
      }
      .main-dashboard .dashboard-content-live,
      .main-dashboard .dashboard-content-live .dashboard-monitor-group,
      .main-dashboard .dashboard-content-live .live-monitor {
        min-height:0;
        display:flex;
        flex:1 1 auto;
        flex-direction:column;
      }
      .main-dashboard .dashboard-content-live .live-table-wrap {
        flex:1 1 auto;
        height:auto;
        min-height:240px;
        max-height:none;
      }
      .main-status-strip {
        flex:0 0 auto;
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        margin-bottom:10px;
      }
      .dashboard-diagnostics-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
      }
      .content {
        grid-template-columns:minmax(0,3fr) 30px minmax(560px,2fr);
        gap:5px;
      }
      .content.details-hidden {
        grid-template-columns:minmax(0,1fr) 30px;
      }
      .detail-rail-toggle,.detail-rail-toggle:hover:not(:disabled) {
        align-self:center;
        justify-self:center;
        width:28px;
        min-width:28px;
        height:58px;
        min-height:58px;
        padding:0;
        border:1px solid rgba(255,255,255,.1);
        border-radius:999px;
        background:rgba(65,63,60,.9);
        color:#d8d2c9;
        box-shadow:0 8px 20px rgba(0,0,0,.16);
        filter:none;
        transform:none;
        font-size:23px;
        font-weight:400;
        line-height:1;
      }
      .detail-rail-toggle:hover:not(:disabled) {
        color:#fff;
        border-color:rgba(216,140,57,.42);
        background:rgba(216,140,57,.16);
      }
      .wrap {
        width:100%;
        max-width:none;
        padding:12px clamp(10px,1vw,18px) 16px;
      }
      /* NetMan-aligned visual language: quiet surfaces, clear hierarchy. */
      :host {
        --bepacom-gold:#d19a42;
        --bepacom-gold-deep:#a86c27;
        --bepacom-border:rgba(255,255,255,.085);
        font-family:Inter,"SF Pro Display","Segoe UI Variable","Segoe UI",sans-serif;
      }
      .wrap {
        padding:0 clamp(12px,1.1vw,22px) 18px;
        background:radial-gradient(circle at 32% -20%,rgba(209,154,66,.07),transparent 31%),#1b1a19;
      }
      .header {
        min-height:108px;
        margin:0 calc(clamp(12px,1.1vw,22px) * -1) 20px;
        padding:18px clamp(16px,1.5vw,30px);
        box-sizing:border-box;
        align-items:center;
        border-bottom:1px solid rgba(255,255,255,.055);
        background:rgba(24,23,22,.94);
      }
      .brand-lockup { display:flex; align-items:center; gap:15px; min-width:0; }
      .brand-mark {
        width:48px; height:48px; flex:0 0 48px; display:grid; place-items:center;
        border:1px solid rgba(255,226,169,.34); border-radius:14px; color:#241c10;
        background:linear-gradient(145deg,#e1b55c,#bd7e2c);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 8px 22px rgba(75,44,10,.22);
        font-size:19px; font-weight:850;
      }
      .brand-copy { min-width:0; }
      .brand-eyebrow {
        margin-bottom:5px; color:#d9bd83; font-size:10px; font-weight:800;
        letter-spacing:.22em; text-transform:uppercase;
      }
      h1 { margin:0; font-size:31px; line-height:1; letter-spacing:-.045em; }
      .subtitle { margin-top:7px; color:#8f8b84; font-size:10px; }
      .frontend-version {
        margin:7px 0 0; padding:0; border:0; border-radius:0;
        color:#696660; background:transparent; font-size:9px;
      }
      .header-action-buttons button {
        min-height:42px; border-color:rgba(255,255,255,.1); border-radius:999px;
        color:#e6e2db; background:rgba(255,255,255,.045); box-shadow:none;
      }
      .header-action-buttons button:hover:not(:disabled) {
        border-color:rgba(209,154,66,.38); background:rgba(209,154,66,.1);
      }
      .main-status-strip {
        grid-template-columns:minmax(360px,1.35fr) minmax(250px,.95fr) minmax(180px,.68fr) minmax(390px,1.45fr);
        gap:9px; margin-bottom:16px; padding:9px;
        border:1px solid var(--bepacom-border); border-radius:14px;
        background:rgba(52,51,48,.78); box-shadow:0 12px 30px rgba(0,0,0,.14);
      }
      .dashboard-headline-card {
        min-height:82px; align-items:flex-start; padding:14px 16px;
        border-color:rgba(255,255,255,.075); border-radius:11px;
        background:rgba(255,255,255,.045);
      }
      .dashboard-headline-icon { display:none; }
      .dashboard-headline-card small {
        margin-bottom:8px; color:#aaa59c; font-size:9px; letter-spacing:.075em;
      }
      .dashboard-headline-card strong {
        color:#f2d598; font-size:25px; letter-spacing:-.04em;
      }
      .dashboard-headline-card.stat-ok strong { color:#dcd49a; }
      .dashboard-headline-card.stat-warn strong,.dashboard-headline-card.stat-bad strong { color:#df766a; }
      .dashboard-headline-card.status-overview { padding:11px 16px; }
      .status-overview-grid {
        width:100%; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px;
      }
      .status-overview-grid-two { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .status-overview-value {
        min-width:0; padding-right:12px; border-right:1px solid rgba(255,255,255,.075);
      }
      .status-overview-value:last-child { padding-right:0; border-right:0; }
      .status-overview-value strong {
        display:block; padding:0; font-size:23px; line-height:1;
      }
      .status-overview-value small {
        display:block; margin-top:7px; color:#aaa59c; font-size:8px;
        font-weight:750; letter-spacing:.07em; text-transform:uppercase;
      }
      .status-overview-value.total strong { color:#f2d598; }
      .status-overview-value.active strong { color:#a9c89e; }
      .status-overview-value.disabled strong { color:#df766a; }
      .status-overview-value.connected strong { color:#dcd49a; }
      .status-overview-value.errors strong { color:#df766a; }
      .status-overview-value.push strong { color:#69aef1; }
      .status-overview-value.polling strong { color:#8fc486; }
      .status-overview-value.efficiency strong { color:#f2d598; }
      .status-transport-line {
        display:flex; align-items:center; gap:5px; margin-top:7px;
        color:#aaa59c; font-size:9px; font-weight:700; white-space:nowrap;
      }
      .status-transport-line i { width:7px; height:7px; flex:0 0 7px; border-radius:50%; box-shadow:0 0 0 3px rgba(255,255,255,.025); }
      .status-transport-line .push-dot { background:#69aef1; }
      .status-transport-line .poll-dot { margin-left:5px; background:#8fc486; }
      .main-nav {
        min-height:44px; margin-bottom:14px; padding:4px; border-radius:11px;
        background:rgba(45,44,41,.82); box-shadow:none; backdrop-filter:none;
      }
      .main-nav-item,.main-nav-item:hover:not(:disabled) {
        min-height:34px; padding:5px 12px; gap:8px; border-radius:8px;
      }
      .main-nav-item.active,
      .main-nav-item.active:hover:not(:disabled) {
        background:linear-gradient(135deg,var(--bepacom-gold),var(--bepacom-gold-deep));
        box-shadow:0 6px 18px rgba(86,51,14,.22);
      }
      .main-nav-item small { display:none; }
      .main-nav-icon { font-size:14px; }
      .main-nav-item strong { font-size:13px; }
      .main-dashboard .dashboard-shell {
        border-color:var(--bepacom-border); border-radius:14px;
        background:rgba(48,47,44,.84); box-shadow:none;
      }
      .dashboard-page-heading { min-height:62px; padding:16px 20px; background:transparent; }
      .dashboard-toggle-title { font-size:19px; font-weight:760; letter-spacing:-.025em; }
      .dashboard-summary { color:#8f8a82; font-size:11px; }
      .dashboard-group { border-color:rgba(255,255,255,.065); background:rgba(255,255,255,.025); }
      .main-dashboard .dashboard-content { padding:0 20px 18px; }
      .live-summary { color:#98938b; }
      .live-chart {
        height:58px; border-color:rgba(255,255,255,.065); background:rgba(20,19,18,.24);
      }
      .live-filters input,.live-filters select {
        border-color:rgba(255,255,255,.075); background:#302f2c;
      }
      .live-table-wrap {
        border-color:rgba(255,255,255,.075); border-radius:10px; background:rgba(38,37,35,.42);
      }
      .live-table th {
        padding:11px 12px; color:#aaa59d; background:#2d2c2a;
        font-size:9px; letter-spacing:.07em; text-transform:uppercase;
      }
      .live-table td,.live-table tbody td { padding:12px; border-top-color:rgba(255,255,255,.06); }
      .live-table tbody tr:hover { background:rgba(209,154,66,.055); }
      .live-source {
        border-color:rgba(209,154,66,.22); color:#d7b36f; background:rgba(209,154,66,.07);
      }
      .dashboard-content-developer { padding-top:2px!important; }
      .dashboard-diagnostics-grid {
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:12px;
      }
      .dashboard-diagnostics-grid > .dashboard-group {
        padding:16px;
        border-color:rgba(255,255,255,.075);
        border-radius:12px;
        background:rgba(255,255,255,.024);
      }
      .dashboard-diagnostics-grid > .dashboard-group,
      .dashboard-diagnostics-grid > .diagnostic-processing-group {
        grid-column:1 / -1;
      }
      .dashboard-title {
        margin:0 0 14px;
        padding-bottom:11px;
        border-bottom:1px solid rgba(255,255,255,.06);
        color:#d9d4cc;
        font-size:10px;
        font-weight:800;
        letter-spacing:.085em;
        text-transform:uppercase;
      }
      .dashboard-diagnostics-grid .dashboard-cards {
        gap:9px;
      }
      .dashboard-diagnostics-grid > .dashboard-group:nth-child(1) .dashboard-cards {
        grid-template-columns:repeat(4,minmax(0,1fr));
      }
      .dashboard-diagnostics-grid > .diagnostic-processing-group .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      }
      .diagnostic-flow {
        display:grid;
        grid-template-columns:minmax(150px,1fr) 38px minmax(150px,1fr) 38px minmax(150px,1fr) 38px minmax(150px,1fr) 38px minmax(150px,1fr);
        align-items:center;
        gap:8px;
        padding:5px 2px 3px;
      }
      .protocol-health {
        position:relative; display:grid; grid-template-columns:minmax(230px,1.25fr) minmax(145px,.7fr) minmax(190px,.9fr); gap:9px;
        margin-bottom:16px; padding:10px; overflow:hidden; border:1px solid rgba(112,180,124,.15); border-radius:13px;
        background:linear-gradient(135deg,rgba(74,128,91,.1),rgba(255,255,255,.018));
      }
      .protocol-health-lead,.protocol-health-item { min-width:0; min-height:58px; padding:13px 15px; border-radius:10px; background:rgba(255,255,255,.025); }
      .protocol-health-lead { display:flex; align-items:center; gap:11px; }
      .protocol-health-lead > i { width:9px; height:9px; flex:0 0 9px; border-radius:50%; background:#70b47c; box-shadow:0 0 0 5px rgba(112,180,124,.09),0 0 16px rgba(112,180,124,.42); animation:protocol-health-pulse 2.2s ease-in-out infinite; }
      .protocol-health.offline .protocol-health-lead > i { background:#bf685f; box-shadow:0 0 0 5px rgba(191,104,95,.09); animation:none; }
      .protocol-health-lead span { min-width:0; display:flex; flex-direction:column; gap:3px; }
      .protocol-health small { color:#aaa59d; font-size:10px; font-weight:800; letter-spacing:.075em; text-transform:uppercase; }
      .protocol-health strong { color:#f3efe8; font-size:17px; line-height:1.15; }
      .protocol-health-lead em { margin-left:auto; color:#aaa59d; font-size:11px; font-weight:650; font-style:normal; white-space:nowrap; }
      .protocol-health-item { display:flex; flex-direction:column; justify-content:center; gap:3px; }
      .protocol-health-item strong { color:#c6ddbd; font-size:20px; }
      .protocol-health-item span { color:#9d9890; font-size:11px; }
      .protocol-health-item.warn strong { color:#df8378; }
      .protocol-health-version { position:absolute; right:14px; top:7px; color:#969189; font-size:10px; font-weight:650; }
      .diagnostic-data-title { margin-top:2px; }
      @keyframes protocol-health-pulse { 0%,100% { transform:scale(.88); opacity:.72; } 50% { transform:scale(1.08); opacity:1; } }
      .diagnostic-flow > i {
        position:relative; display:block; width:100%; height:2px; overflow:visible;
        border-radius:999px; background:linear-gradient(90deg,rgba(105,174,241,.18),rgba(210,170,98,.52),rgba(157,196,135,.2));
      }
      .diagnostic-flow > i::before { content:""; position:absolute; inset:-3px 0; border-radius:999px; background:inherit; filter:blur(5px); opacity:.25; }
      .diagnostic-flow > i::after {
        content:""; position:absolute; top:50%; left:0; width:7px; height:7px; margin-top:-3.5px;
        border-radius:50%; background:#e0b96f; box-shadow:0 0 8px rgba(224,185,111,.8);
        animation:diagnostic-flow-pulse 2.8s ease-in-out infinite;
      }
      .diagnostic-flow-step {
        position:relative; min-width:0; min-height:92px; box-sizing:border-box; padding:16px 17px;
        overflow:hidden; border:1px solid rgba(255,255,255,.085); border-radius:13px;
        background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
        box-shadow:0 8px 22px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.035);
        animation:diagnostic-card-in .38s ease-out both;
        transition:transform .18s ease,border-color .18s ease,background .18s ease;
      }
      .diagnostic-flow-step::after { content:""; position:absolute; left:0; right:0; bottom:0; height:2px; background:rgba(105,174,241,.55); }
      .diagnostic-flow-step:hover { transform:translateY(-2px); border-color:rgba(209,154,66,.25); background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025)); }
      .diagnostic-flow-step:nth-child(3) { animation-delay:.05s; }
      .diagnostic-flow-step:nth-child(5) { animation-delay:.1s; }
      .diagnostic-flow-step:nth-child(7) { animation-delay:.15s; }
      .diagnostic-flow-step:nth-child(9) { animation-delay:.2s; }
      .diagnostic-flow-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .diagnostic-flow-head b { display:flex; align-items:center; justify-content:center; width:25px; height:25px; border-radius:8px; color:#8ebbed; background:rgba(105,174,241,.09); font-size:14px; font-weight:700; }
      .diagnostic-flow-step small,.diagnostic-flow-step span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .diagnostic-flow-step small { color:#aaa49a; font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
      .diagnostic-flow-step strong { display:block; margin:10px 0 5px; color:#f0ece5; font-size:27px; line-height:1; }
      .diagnostic-flow-step span { color:#89847c; font-size:10px; }
      .diagnostic-flow-step.inspected::after { background:rgba(141,159,182,.6); }
      .diagnostic-flow-step.filtered strong,.diagnostic-flow-step.filtered .diagnostic-flow-head b { color:#d2aa62; }
      .diagnostic-flow-step.filtered .diagnostic-flow-head b { background:rgba(210,170,98,.1); }
      .diagnostic-flow-step.filtered::after { background:rgba(210,170,98,.72); }
      .diagnostic-flow-step.updates::after { background:rgba(184,147,217,.62); }
      .diagnostic-flow-step.changed strong,.diagnostic-flow-step.changed .diagnostic-flow-head b { color:#9dc487; }
      .diagnostic-flow-step.changed .diagnostic-flow-head b { background:rgba(157,196,135,.1); }
      .diagnostic-flow-step.changed::after { background:rgba(157,196,135,.75); }
      @keyframes diagnostic-flow-pulse { 0% { left:0; opacity:0; } 15% { opacity:1; } 85% { opacity:1; } 100% { left:calc(100% - 7px); opacity:0; } }
      @keyframes diagnostic-card-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
      @media (prefers-reduced-motion:reduce) {
        .diagnostic-flow > i::after,.diagnostic-flow-step,.protocol-health-lead > i { animation:none!important; }
        .diagnostic-flow-step { transition:none; }
      }
      /* Automatic light appearance, driven by Home Assistant's active theme. */
      .wrap.theme-light {
        --primary-color:#b87926;
        --accent-color:#b87926;
        --primary-text-color:#29251f;
        --text-primary-color:#29251f;
        --secondary-text-color:#746e65;
        --card-background-color:#fffdfa;
        --secondary-background-color:#f1ede6;
        --divider-color:rgba(62,52,39,.13);
        --bepacom-border:rgba(62,52,39,.13);
        --bp-shadow:0 10px 28px rgba(78,61,39,.08);
        color-scheme:light;
        color:#29251f;
        background:
          radial-gradient(circle at 30% -15%,rgba(202,146,65,.12),transparent 32%),
          #f3f0ea;
      }
      .theme-light .header {
        border-bottom-color:rgba(62,52,39,.1);
        background:rgba(250,248,244,.96);
      }
      .theme-light h1 { color:#211f1b; }
      .theme-light .brand-eyebrow { color:#9a6b2c; }
      .theme-light .frontend-version { color:#918a80; }
      .theme-light .header-action-buttons button,
      .theme-light button.secondary,
      .theme-light .view-tab,
      .theme-light .icon-action,
      .theme-light .mobile-actions-toggle {
        color:#3b3731;
        border-color:rgba(62,52,39,.22);
        background:#fffdfa;
      }
      .theme-light .header-action-buttons button:hover:not(:disabled),
      .theme-light button.secondary:hover:not(:disabled),
      .theme-light .view-tab:hover,
      .theme-light .icon-action:hover,
      .theme-light .mobile-actions-toggle:hover {
        color:#6d491d;
        border-color:rgba(184,121,38,.48);
        background:#f5ead8;
      }
      .theme-light .view-tab.active,
      .theme-light .view-tab.active:hover {
        color:#563817!important;
        border-color:rgba(160,102,31,.48)!important;
        background:linear-gradient(135deg,#f2e2c8,#ead3ae)!important;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);
      }
      .theme-light .virtual-type-badge,
      .theme-light .virtual-badge {
        color:#4f4941;
        border-color:rgba(62,52,39,.2);
        background:#f2eee7;
      }
      .theme-light .virtual-state-badge.on {
        color:#316b38;
        border-color:#9bc99c;
        background:#e4f3e2;
      }
      .theme-light .virtual-state-badge.off {
        color:#514c45;
        border-color:#c7c1b8;
        background:#ece9e3;
      }
      .theme-light .virtual-state-badge.unavailable,
      .theme-light .virtual-state-badge.unknown {
        color:#87571c;
        border-color:#d7b681;
        background:#f7ead5;
      }
      .theme-light .icon-action {
        color:#403a33;
        box-shadow:0 1px 3px rgba(62,52,39,.1);
      }
      .theme-light .main-status-strip,
      .theme-light .main-nav,
      .theme-light .card,
      .theme-light .toolbar,
      .theme-light .side,
      .theme-light .table-wrap,
      .theme-light .main-dashboard .dashboard-shell {
        border-color:rgba(62,52,39,.13);
        background:rgba(255,253,250,.88);
        box-shadow:0 10px 28px rgba(78,61,39,.07);
      }
      .theme-light .dashboard-headline-card {
        border-color:rgba(62,52,39,.1);
        background:#f6f2eb;
      }
      .theme-light .dashboard-headline-card small,
      .theme-light .status-overview-value small,
      .theme-light .dashboard-summary,
      .theme-light .live-summary,
      .theme-light .muted,
      .theme-light label { color:#797268; }
      .theme-light .dashboard-headline-card strong { color:#9b671f; }
      .theme-light .dashboard-headline-card.stat-ok strong,
      .theme-light .status-overview-value.active strong,
      .theme-light .status-overview-value.connected strong,
      .theme-light .status-overview-value.polling strong { color:#64815c; }
      .theme-light .dashboard-headline-card.stat-warn strong,
      .theme-light .dashboard-headline-card.stat-bad strong,
      .theme-light .status-overview-value.disabled strong { color:#b9564d; }
      .theme-light .status-overview-value.total strong { color:#a06b20; }
      .theme-light .status-overview-value.push strong { color:#2676b9; }
      .theme-light .status-overview-value.efficiency strong { color:#a06b20; }
      .theme-light .status-overview-value { border-right-color:rgba(62,52,39,.11); }
      .theme-light .status-transport-line { color:#797268; }
      .theme-light .status-transport-line .push-dot { background:#2676b9; }
      .theme-light .status-transport-line .poll-dot { background:#64815c; }
      .theme-light .main-nav-item { color:#6f685f; }
      .theme-light .main-nav-item:hover:not(:disabled) {
        color:#302b25; background:rgba(62,52,39,.05);
      }
      .theme-light .main-nav-item.active {
        color:#fffaf2;
        background:linear-gradient(135deg,#c99543,#a86c27);
      }
      .theme-light .dashboard-page-heading { color:#29251f; border-bottom-color:rgba(62,52,39,.09); }
      .theme-light .dashboard-group,
      .theme-light .dashboard-diagnostics-grid > .dashboard-group {
        border-color:rgba(62,52,39,.11);
        background:rgba(246,242,235,.72);
      }
      .theme-light .dashboard-title {
        color:#5e574e; border-bottom-color:rgba(62,52,39,.1);
      }
      .theme-light .diagnostic-flow-step { border-color:rgba(62,52,39,.11); background:linear-gradient(145deg,rgba(255,255,255,.9),rgba(246,242,235,.72)); box-shadow:0 8px 20px rgba(78,61,39,.07),inset 0 1px 0 #fff; }
      .theme-light .diagnostic-flow-step strong { color:#302b25; }
      .theme-light .diagnostic-flow-step.filtered strong { color:#a66d25; }
      .theme-light .diagnostic-flow-step.changed strong { color:#5d8c48; }
      .theme-light .diagnostic-flow > i { background:linear-gradient(90deg,rgba(38,118,185,.18),rgba(166,109,37,.42),rgba(93,140,72,.2)); }
      .theme-light .protocol-health { border-color:rgba(93,140,72,.18); background:linear-gradient(135deg,rgba(93,140,72,.09),rgba(255,255,255,.7)); }
      .theme-light .protocol-health-lead,.theme-light .protocol-health-item { background:rgba(255,255,255,.62); }
      .theme-light .protocol-health strong { color:#302b25; }
      .theme-light .protocol-health-item strong { color:#5d8c48; }
      .theme-light input,
      .theme-light select {
        color:#29251f;
        border-color:rgba(62,52,39,.15);
        background:#fffdfa;
        color-scheme:light;
      }
      .theme-light select option,
      .theme-light select optgroup { color:#29251f; background:#fffdfa; }
      .theme-light select option:checked { color:#2b2114; background:#ead5b3; }
      .theme-light th,
      .theme-light .live-table th {
        color:#70695f;
        background:#ebe6de!important;
      }
      .theme-light td { border-color:rgba(62,52,39,.09)!important; }
      .theme-light tbody tr:hover:not(.group-row),
      .theme-light .live-table tbody tr:hover { background:rgba(184,121,38,.055); }
      .theme-light tbody tr.selected {
        background:rgba(184,121,38,.09);
        box-shadow:inset 2px 0 0 #b87926;
      }
      .theme-light tr.value-down { --bepacom-change-color:#735fc2; }
      .theme-light .group-row td {
        color:#39332c!important;
        background:#eee5d7!important;
        box-shadow:inset 3px 0 0 rgba(184,121,38,.72);
      }
      .theme-light .group-toggle,
      .theme-light .group-toggle:hover:not(:disabled) { color:#39332c!important; }
      .theme-light .group-row .muted { color:#756a5d!important; }
      .theme-light .name { color:#29251f; }
      .theme-light .value-link { color:#8a591c; }
      .theme-light .side-tabs,
      .theme-light .side-section-head,
      .theme-light .point-inspector-head { background:#f0ece5; }
      .theme-light .side-tab { color:#777066; }
      .theme-light .side-tab.active {
        color:#6d491d;
        border-color:rgba(184,121,38,.24);
        background:rgba(184,121,38,.09);
      }
      .theme-light details.detail-section,
      .theme-light .side-virtual-card {
        border-color:rgba(62,52,39,.11);
        background:rgba(255,255,255,.64);
      }
      .theme-light details.detail-section > summary { color:#3e3932; }
      .theme-light .live-chart,
      .theme-light .live-table-wrap,
      .theme-light .history-list {
        border-color:rgba(62,52,39,.12);
        background:rgba(255,253,250,.72);
      }
      .theme-light .live-filters input,
      .theme-light .live-filters select { background:#fffdfa; }
      .theme-light .live-source {
        color:#85571d; border-color:rgba(184,121,38,.24); background:rgba(184,121,38,.08);
      }
      .theme-light .detail-rail-toggle,
      .theme-light .detail-rail-toggle:hover:not(:disabled) {
        color:#655e55; border-color:rgba(62,52,39,.15); background:#f8f5ef;
      }
      .dashboard-content-developer .dashboard-summary { display:none; }
      @media (max-width:1500px) {
        .dashboard-diagnostics-grid > .diagnostic-processing-group .dashboard-cards {
          grid-template-columns:repeat(5,minmax(0,1fr));
        }
      }
      @media (max-width:1000px) {
        .dashboard-diagnostics-grid { grid-template-columns:1fr; }
        .dashboard-diagnostics-grid > .diagnostic-processing-group { grid-column:auto; }
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(1) .dashboard-cards,
        .dashboard-diagnostics-grid > .diagnostic-processing-group .dashboard-cards {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        .diagnostic-flow { grid-template-columns:1fr; }
        .protocol-health { grid-template-columns:1fr; }
        .diagnostic-flow > i { width:2px; height:24px; justify-self:center; background:linear-gradient(180deg,rgba(105,174,241,.18),rgba(210,170,98,.52),rgba(157,196,135,.2)); }
        .diagnostic-flow > i::after { top:0; left:50%; margin-top:0; margin-left:-3.5px; animation:diagnostic-flow-pulse-vertical 2.8s ease-in-out infinite; }
      }
      @keyframes diagnostic-flow-pulse-vertical { 0% { top:0; opacity:0; } 15% { opacity:1; } 85% { opacity:1; } 100% { top:calc(100% - 7px); opacity:0; } }
      @media (max-width: 1250px) {
        .main-status-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
      }
      @media (max-width: 1100px) { :host { height:auto; overflow:visible; } .wrap { height:auto; min-height:100vh; overflow:visible; } .toolbar { align-items:stretch; } .toolbar .toolbar-nav { flex:1 0 100%; border-right:0; border-bottom:1px solid var(--divider-color); padding:2px 2px 8px; } .dashboard-content { grid-template-columns: 1fr; } .dashboard-cards { grid-template-columns: repeat(2, 1fr); } #explorerView { overflow:visible; } .content { grid-template-columns: 1fr; overflow:visible; } .table-wrap { height:70vh; } .side { height:70vh; } }
      @media (max-width: 900px) {
        .header { flex-direction:column; align-items:stretch; gap:10px; margin-bottom:12px; }
        .mobile-header-row { width:100%; }
        .header-primary-actions { width:100%; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto; gap:7px; }
        .header-primary-actions .pending-reload { grid-column:1 / -1; }
        #applyChanges, #refresh { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      }
      @media (max-width: 700px) {
        .header { flex-direction:column; align-items:stretch; gap:9px; margin-bottom:9px; }
        .mobile-header-row { width:100%; gap:8px; }
        .ha-menu-toggle { display:flex; align-items:center; justify-content:center; }
        .brand-lockup { flex:1 1 auto; gap:10px; overflow:hidden; }
        .brand-mark { width:38px; height:38px; flex-basis:38px; border-radius:11px; }
        .brand-copy { overflow:hidden; }
        .brand-eyebrow { font-size:9px; }
        .frontend-version { max-width:100%; box-sizing:border-box; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .header-primary-actions { width:100%; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto; gap:6px; }
        .header-primary-actions .pending-reload { grid-column:1 / -1; }
        #applyChanges, #refresh { min-width:0; padding-inline:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .toast { right:12px; bottom:12px; }
        .main-nav { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .main-nav-item { justify-content:flex-start; }
        .main-status-strip { grid-template-columns:1fr 1fr; gap:7px; padding:7px; margin-bottom:10px; }
        .dashboard-headline-card.status-overview { padding:9px 10px; }
        .status-overview-grid { gap:8px; }
        .status-overview-value { padding-right:7px; }
        .status-overview-value strong { font-size:20px; }
        .status-overview-value small { margin-top:6px; font-size:7px; line-height:1.25; letter-spacing:.045em; overflow-wrap:anywhere; }
        .status-transport-line { gap:4px; font-size:8px; }
        .status-transport-line .poll-dot { margin-left:2px; }
        .dashboard-diagnostics-grid { grid-template-columns:1fr; }
        .dashboard-headline { grid-template-columns:1fr 1fr; }
        .dashboard-headline-card { min-height:62px; padding:9px 10px; }
        .dashboard-headline-card strong { font-size:19px; }
        .dashboard-nav { grid-template-columns:1fr; }
        .dashboard-nav-item { justify-content:flex-start; padding-left:14px; }
        .dashboard-config-grid { grid-template-columns:1fr; }
        .dashboard-monitor-group { padding:8px; }
        .live-summary { gap:4px 9px; }
        .live-summary span:nth-child(2) { display:none; }
        .live-filters { grid-template-columns:1fr 1fr; }
        .live-filters input { grid-column:1 / -1; }
        .live-small-btn { margin-left:0; }
        .live-table-wrap { max-height:260px; }
        .live-table th:nth-child(1), .live-table td:nth-child(1) { width:58px; }
        .live-table th:nth-child(3), .live-table td:nth-child(3) { width:104px; }
        .live-table th:nth-child(4), .live-table td:nth-child(4) { display:none; }
        .live-foot { text-align:left; }
        .wrap { padding:8px; }
        .header { align-items:flex-start; gap:8px; }
        h1 { font-size:20px; line-height:1.2; }
        .subtitle { font-size:12px; }
        .mobile-actions-toggle { display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; margin:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:22px; }
        .header-actions-menu.open > .mobile-actions-toggle { background:color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color:var(--primary-color); }
        .header-actions-menu > .header-action-buttons { display:none; }
        .header-actions-menu.open > .header-action-buttons { position:absolute; z-index:100; top:48px; right:0; width:min(280px, calc(100vw - 16px)); box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:0 8px 28px rgba(0,0,0,.35); }
        .header-action-buttons button { width:100%; padding:9px 8px; font-size:12px; }
        .header-action-buttons #toggleDetails, .header-action-buttons #applyUpdateModes, .header-action-buttons #reloadIntegration { grid-column:1 / -1; }
        .toolbar .search-field, .toolbar .filter-field, .toolbar .check-field { flex:1 1 100%; min-width:0; }
        .toolbar .reset-field { margin-left:auto; }
        .view-tab { flex:1 1 auto; padding:8px 10px; }
        .dashboard-cards { grid-template-columns:1fr 1fr; }
        .content { display:block; }
        .detail-rail-toggle {
          display:flex;
          width:100%;
          height:30px;
          min-height:30px;
          margin:6px 0;
        }
        .table-wrap { height:72dvh; border:0; background:transparent; box-shadow:none; overflow-y:auto; overflow-x:hidden; scrollbar-width:none; }
        .table-wrap::-webkit-scrollbar { display:none; }
        .table-wrap > table { display:block; min-width:0; width:100%; table-layout:auto; border-collapse:separate; }
        .table-wrap > table colgroup, .table-wrap > table > thead { display:none; }
        .table-wrap > table > tbody { display:block; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) { display:block; margin:0 0 10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td { position:static !important; display:grid; grid-template-columns:86px minmax(0,1fr); gap:10px; align-items:center; width:auto; min-height:38px; padding:7px 10px; text-align:left !important; white-space:normal; overflow:visible; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); background:transparent !important; box-shadow:none !important; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td:last-child { border-bottom:0; }
        .table-wrap > table > tbody > tr.point-card > td[data-col='unit'],
        .table-wrap > table > tbody > tr.point-card > td[data-col='override'],
        .table-wrap > table > tbody > tr.point-card > td[data-col='write-profile'] { display:none !important; }
        .table-wrap > table > tbody > tr.point-card > td[data-col='object'] { background:color-mix(in srgb,var(--secondary-background-color) 72%,transparent) !important; }
        .table-wrap > table > tbody > tr.point-card > td[data-col='value'] .value-link { font-size:18px; font-weight:700; }
        .table-wrap td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .table-wrap td.select-col { display:flex !important; align-items:center; justify-content:flex-end; min-height:28px !important; padding:5px 10px !important; }
        .table-wrap td.select-col .row-select { flex:0 0 20px; width:20px; min-width:20px; height:20px; min-height:20px; margin:0; padding:0; }
        .table-wrap td.select-col::before { content:"Auswahl"; margin-right:auto; }
        .table-wrap td[data-col='object']::before { content:"Objekt"; }
        .table-wrap td[data-col='entity']::before { content:"HA Entität"; }
        .table-wrap td[data-col='value']::before { content:"Wert"; }
        .table-wrap td[data-col='unit']::before { content:"Einheit"; }
        .table-wrap td[data-col='override']::before { content:"Override"; }
        .table-wrap td[data-col='write-profile']::before { content:"Schreiben"; }
        .table-wrap td[data-col='status']::before { content:"Status"; }
        .table-wrap .group-row { display:block; margin:8px 0; }
        .table-wrap .group-row td { display:block; position:static; padding:8px; }
        .table-wrap .virtual-spacer { display:block; }
        .table-wrap .virtual-spacer td { display:block; }
        .linked-entities { margin-top:5px; }
        .inline-select { max-width:none; }
        .virtual-overview { padding:9px; }
        .virtual-overview-head { align-items:flex-start; flex-direction:column; }
        .virtual-table-wrap { overflow:visible; }
        .virtual-table { display:block; min-width:0; width:100%; }
        .virtual-table thead { display:none; }
        .virtual-table tbody { display:block; }
        .virtual-table tr { display:block; margin-bottom:10px; padding:5px 0; border:1px solid var(--divider-color); border-radius:12px; background:var(--secondary-background-color); overflow:hidden; }
        .virtual-table td { display:grid; grid-template-columns:78px minmax(0,1fr); gap:8px; align-items:center; width:auto !important; padding:7px 10px !important; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:visible; }
        .virtual-table td:last-child { border-bottom:0; }
        .virtual-table td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .virtual-table td:nth-child(1)::before { content:"Quelle"; }
        .virtual-table td:nth-child(2)::before { content:"HA Entität"; }
        .virtual-table td:nth-child(3)::before { content:"Typ"; }
        .virtual-table td:nth-child(4)::before { content:"Zustand"; }
        .virtual-table td:nth-child(5)::before { content:"ON"; }
        .virtual-table td:nth-child(6)::before { content:"OFF"; }
        .virtual-table td:nth-child(7)::before { content:"ELSE"; }
        .virtual-table td:nth-child(8)::before { content:"Aktionen"; }
        .virtual-icon-actions { flex-wrap:wrap; }
        .side { height:70vh; min-height:70vh; max-height:70vh; margin-top:10px; overflow:hidden; }
        .point-inspector-head { flex-direction:column; }
        .inspector-head-actions { width:100%; justify-content:flex-start; }
      }
      @media (max-width: 430px) {
        .main-nav-item { justify-content:center; padding:9px 6px; }
        .main-nav-item > span:last-child { display:none; }
        .main-nav-icon { font-size:18px; }
        .main-status-strip { gap:6px; }
        .dashboard-headline { grid-template-columns:1fr; }
        .main-status-strip { grid-template-columns:1fr; }
        .live-filters { grid-template-columns:1fr; }
        .live-filters input { grid-column:auto; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td,
        .virtual-table td { grid-template-columns:72px minmax(0,1fr); gap:7px; padding-inline:8px !important; }
      }
`;
