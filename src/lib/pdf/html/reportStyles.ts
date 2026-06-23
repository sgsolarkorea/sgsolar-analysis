export function reportBaseStyles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm 12mm 14mm; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Gmarket Sans', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-weight: 500;
      font-size: 10pt;
      line-height: 1.55;
      color: #0f172a;
      background: #fff;
    }
    h1, h2, h3 { font-weight: 700; color: #0b1d3a; line-height: 1.35; }
    .report { width: 100%; max-width: 186mm; margin: 0 auto; }
    .brand-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #0b1d3a 0%, #1a3270 100%);
      color: #fff; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px;
    }
    .brand-bar img { height: 28px; width: auto; }
    .brand-bar .brand-text { font-size: 15pt; font-weight: 700; letter-spacing: 0; }
    .brand-bar .brand-sub { font-size: 8pt; opacity: 0.85; margin-top: 2px; }
    .title-block { margin-bottom: 16px; }
    .title-block h1 { font-size: 20pt; margin-bottom: 4px; }
    .title-block .subtitle { font-size: 9pt; color: #64748b; }
    .section { margin-bottom: 18px; }
    .section-head {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
      padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;
    }
    .section-head .accent {
      width: 3px; height: 18px; background: #0b1d3a; border-radius: 2px; flex-shrink: 0;
    }
    .section-head h2 { font-size: 13pt; }
    .section-head p { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
    .card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 1px 2px rgba(11,29,58,0.04), 0 2px 6px rgba(11,29,58,0.04);
      overflow: hidden;
    }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
    }
    .kpi-card {
      background: #eef2f8; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;
    }
    .kpi-card .label { font-size: 7.5pt; color: #64748b; margin-bottom: 3px; }
    .kpi-card .value { font-size: 10pt; font-weight: 700; color: #0b1d3a; word-break: keep-all; line-height: 1.3; }
    .kpi-card.wide { grid-column: span 2; }
    .page-one { margin-bottom: 0; }
    .map-card {
      margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid;
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
      box-shadow: 0 1px 2px rgba(11,29,58,0.04), 0 2px 6px rgba(11,29,58,0.04);
    }
    .map-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .map-head h3 { font-size: 10pt; margin: 0; }
    .map-head span { font-size: 7.5pt; color: #64748b; }
    .map-wrap {
      position: relative; background: #eef2f8; height: 200px; overflow: hidden;
    }
    .map-wrap img {
      display: block; width: 100%; height: 200px; object-fit: cover;
    }
    .map-wrap svg {
      position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
    }
    .map-fallback {
      height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(180deg, #eef2f8 0%, #f8fafc 100%); padding: 16px; text-align: center;
    }
    .map-fallback .fb-title { font-size: 10pt; font-weight: 700; color: #0b1d3a; margin-bottom: 6px; }
    .map-fallback .fb-desc { font-size: 8.5pt; color: #64748b; line-height: 1.5; }
    .map-caption {
      padding: 8px 14px; font-size: 8pt; color: #64748b; background: #fff;
      border-top: 1px solid #e2e8f0;
    }
    .highlight-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px;
    }
    .highlight-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;
      background: #fff; min-height: 88px;
      box-shadow: 0 1px 2px rgba(11,29,58,0.04);
    }
    .highlight-card .hl-label {
      font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .highlight-card .hl-item {
      font-size: 8pt; color: #334155; line-height: 1.45; margin-bottom: 4px;
    }
    .highlight-card .hl-item strong { color: #0b1d3a; }
    .notice.compact {
      padding: 8px 12px; font-size: 7.5pt; margin-bottom: 0;
    }
    .notice {
      background: #eef2f8; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 10px 12px; font-size: 8.5pt; color: #475569; margin-bottom: 12px;
    }
    .notice.blue { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
    .notice.amber { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead th {
      background: #f1f5f9; color: #475569; font-weight: 700; text-align: left;
      padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 8pt;
      text-transform: uppercase; letter-spacing: 0.02em;
    }
    tbody td {
      padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
      vertical-align: top; color: #334155; word-break: keep-all;
    }
    tbody tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block; border-radius: 4px; padding: 2px 6px;
      font-size: 7.5pt; font-weight: 700; border: 1px solid; line-height: 1.35;
    }
    .badge-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .badge-orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
    .badge-amber { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .badge-slate { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
    .capacity-rows .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-bottom: 1px solid #f1f5f9;
    }
    .capacity-rows .row:last-child { border-bottom: none; }
    .capacity-rows .row.highlight { background: #eef2f8; }
    .capacity-rows .label { color: #64748b; font-size: 9pt; }
    .capacity-rows .val { font-weight: 700; color: #0b1d3a; font-size: 10pt; }
    .cap-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;
    }
    .cap-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;
      text-align: center; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
    }
    .cap-card .cap-label { font-size: 8pt; color: #64748b; font-weight: 700; }
    .cap-card .cap-value { font-size: 11pt; font-weight: 700; color: #0b1d3a; margin-top: 6px; word-break: keep-all; }
    .grid-summary {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 16px; border-bottom: 1px solid #e2e8f0;
    }
    .grid-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-high { background: #10b981; }
    .dot-review { background: #f59e0b; }
    .dot-difficult { background: #ef4444; }
    .dot-unknown { background: #94a3b8; }
    .grid-eq-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px;
    }
    .grid-eq {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 8px; text-align: center;
      background: #fff;
    }
    .grid-eq .eq-label { font-size: 7.5pt; color: #64748b; font-weight: 700; }
    .grid-eq .eq-name { font-size: 9pt; font-weight: 700; color: #0b1d3a; margin-top: 4px; word-break: keep-all; }
    .bar-section { padding: 12px 14px 14px; }
    .bar-section h3 { font-size: 9.5pt; margin-bottom: 10px; color: #334155; }
    .bar-row { margin-bottom: 10px; }
    .bar-row:last-child { margin-bottom: 0; }
    .bar-meta {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: 8pt; margin-bottom: 4px;
    }
    .bar-meta .bar-label { font-weight: 700; color: #475569; }
    .bar-meta .bar-val { color: #0b1d3a; font-weight: 700; }
    .bar-track {
      height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; position: relative;
    }
    .bar-fill {
      height: 100%; border-radius: 999px; min-width: 2px;
    }
    .bar-fill.cum { background: #94a3b8; opacity: 0.55; width: 100%; position: absolute; left: 0; top: 0; }
    .bar-fill.rem { background: linear-gradient(90deg, #1a3270, #0b1d3a); position: relative; z-index: 1; }
    .bar-fill.warn { background: linear-gradient(90deg, #f59e0b, #ea580c); }
    .bar-fill.bad { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .bar-legend {
      display: flex; gap: 12px; margin-top: 8px; font-size: 7pt; color: #64748b;
    }
    .bar-legend span::before {
      content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle;
    }
    .legend-cum::before { background: #94a3b8; opacity: 0.7; }
    .legend-rem::before { background: #0b1d3a; }
    .check-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    }
    .check-card {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 12px 14px; min-height: 52px;
      box-shadow: 0 1px 2px rgba(11,29,58,0.04), 0 2px 4px rgba(11,29,58,0.03);
    }
    .check-box {
      width: 14px; height: 14px; border: 2px solid #0b1d3a; border-radius: 3px;
      flex-shrink: 0; margin-top: 1px; background: #fff;
    }
    .check-card .check-text { font-size: 9.5pt; font-weight: 600; color: #0b1d3a; line-height: 1.4; }
    .check-section-wrap {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 14px; margin-bottom: 14px;
    }
    .check-section-wrap .check-intro {
      font-size: 8.5pt; color: #64748b; margin-bottom: 10px; padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .cta-box {
      background: linear-gradient(135deg, #eff6ff 0%, #eef2f8 100%);
      border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 18px; text-align: center;
    }
    .cta-box h3 { font-size: 11pt; margin-bottom: 6px; }
    .cta-box p { font-size: 9.5pt; color: #334155; }
    .footer-note {
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0;
      font-size: 7.5pt; color: #94a3b8; text-align: center;
    }
    .page-break { break-before: page; page-break-before: always; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  `;
}
