export function reportBaseStyles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 10mm 11mm 12mm; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Gmarket Sans', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-weight: 500;
      font-size: 10pt;
      line-height: 1.55;
      color: #1e293b;
      background: #fff;
    }
    h1, h2, h3 { font-weight: 700; color: #0b1736; line-height: 1.35; }
    .report { width: 100%; max-width: 188mm; margin: 0 auto; }

    /* ── Page 1 Hero ── */
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 14px;
      padding: 22px 22px 20px;
      margin-bottom: 14px;
      color: #fff;
      background: linear-gradient(135deg, #0b1736 0%, #111c3d 48%, #1a3270 100%);
      box-shadow: 0 8px 24px rgba(11, 23, 54, 0.18);
    }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      opacity: 0.55;
      pointer-events: none;
    }
    .hero::after {
      content: '';
      position: absolute; top: -40px; right: -20px;
      width: 180px; height: 180px;
      background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-inner { position: relative; z-index: 1; }
    .hero-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; margin-bottom: 14px;
    }
    .hero-brand img { height: 30px; width: auto; filter: brightness(0) invert(1); }
    .hero-brand .brand-text { font-size: 16pt; font-weight: 700; letter-spacing: 0.02em; }
    .hero-brand .brand-tag { font-size: 7.5pt; opacity: 0.75; margin-top: 3px; letter-spacing: 0.08em; text-transform: uppercase; }
    .hero-date { font-size: 8pt; opacity: 0.85; text-align: right; white-space: nowrap; }
    .hero h1 { font-size: 19pt; color: #fff; margin-bottom: 6px; letter-spacing: -0.02em; }
    .hero .hero-sub { font-size: 9pt; opacity: 0.88; max-width: 92%; line-height: 1.5; }
    .hero-address {
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-size: 8.5pt; opacity: 0.9;
    }

    /* ── KPI ── */
    .kpi-address {
      background: #eef3f8; border: 1px solid #d8e1ea; border-radius: 10px;
      padding: 10px 12px; margin-bottom: 8px;
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .kpi-address .label { font-size: 7pt; color: #64748b; margin-bottom: 4px; font-weight: 700; }
    .kpi-address .value { font-size: 9.5pt; font-weight: 700; color: #0b1736; word-break: keep-all; line-height: 1.35; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
    }
    .kpi-card {
      background: #eef3f8; border: 1px solid #d8e1ea; border-radius: 10px;
      padding: 10px 11px;
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .kpi-card .label { font-size: 7pt; color: #64748b; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.02em; }
    .kpi-card .value { font-size: 9pt; font-weight: 700; color: #0b1736; word-break: keep-all; line-height: 1.35; }

    /* ── Map ── */
    .map-stage {
      position: relative; height: 210px; background: #eef3f8;
    }
    .map-stage .map-overlay {
      position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;
    }
    .map-card {
      margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid;
      border: 1px solid #d8e1ea; border-radius: 12px; overflow: hidden;
      box-shadow: 0 2px 8px rgba(11, 23, 54, 0.06);
    }
    .map-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; background: #eef3f8; border-bottom: 1px solid #d8e1ea;
    }
    .map-head h3 { font-size: 9.5pt; margin: 0; color: #0b1736; }
    .map-head span { font-size: 7.5pt; color: #64748b; }
    .map-wrap {
      position: relative; background: #eef3f8; height: 210px; overflow: hidden;
    }
    .map-stage .map-wrap { height: 100%; }
    .map-wrap img {
      display: block; width: 100%; height: 210px; object-fit: cover;
    }
    .map-wrap svg {
      position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
    }
    .map-caption {
      padding: 8px 14px; font-size: 8pt; color: #64748b; background: #fff;
      border-top: 1px solid #d8e1ea;
    }
    .location-card {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px; background: linear-gradient(135deg, #eef3f8 0%, #f8fafc 100%);
      border-top: 1px solid #d8e1ea; min-height: auto;
    }
    .location-card .loc-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: #0b1736; color: #f59e0b;
    }
    .location-card .loc-title { font-size: 9.5pt; font-weight: 700; color: #0b1736; margin-bottom: 6px; }
    .location-card .loc-row { font-size: 8pt; color: #475569; margin-bottom: 3px; display: flex; gap: 8px; }
    .location-card .loc-label { color: #94a3b8; min-width: 28px; font-weight: 700; }
    .location-card .loc-val { color: #334155; word-break: keep-all; }
    .location-card .loc-note { font-size: 7.5pt; color: #64748b; margin-top: 6px; }

    /* ── Executive summary ── */
    .exec-summary {
      background: #fff; border: 1px solid #d8e1ea; border-left: 3px solid #f59e0b;
      border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .exec-summary .exec-label {
      font-size: 7.5pt; font-weight: 700; color: #64748b; letter-spacing: 0.04em;
      text-transform: uppercase; margin-bottom: 6px;
    }
    .exec-summary p { font-size: 9pt; color: #334155; line-height: 1.65; }

    /* ── Sections ── */
    .section { margin-bottom: 16px; }
    .section-head {
      display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
      padding-bottom: 8px; border-bottom: 2px solid #eef3f8;
    }
    .section-head .accent {
      width: 4px; height: 22px;
      background: linear-gradient(180deg, #0b1736, #1a3270);
      border-radius: 2px; flex-shrink: 0;
    }
    .section-head h2 { font-size: 13pt; }
    .section-head p { font-size: 8.5pt; color: #64748b; margin-top: 2px; }

    .card {
      background: #fff; border: 1px solid #d8e1ea; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(11, 23, 54, 0.05);
      overflow: hidden;
    }

    .notice {
      background: #eef3f8; border: 1px solid #d8e1ea; border-radius: 8px;
      padding: 10px 12px; font-size: 8.5pt; color: #475569; margin-bottom: 12px; line-height: 1.55;
    }
    .notice.compact { padding: 8px 12px; font-size: 7.5pt; margin-bottom: 0; }
    .notice.blue { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
    .notice.amber { background: #fffbeb; border-color: #fde68a; color: #92400e; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead th {
      background: #0b1736; color: #eef3f8; font-weight: 700; text-align: left;
      padding: 9px 11px; border-bottom: none; font-size: 7.5pt;
      letter-spacing: 0.03em;
    }
    tbody td {
      padding: 10px 11px; border-bottom: 1px solid #eef3f8;
      vertical-align: top; color: #334155; word-break: keep-all; line-height: 1.5;
    }
    tbody tr:nth-child(even) td { background: #fafbfc; }
    tbody tr:last-child td { border-bottom: none; }

    .badge {
      display: inline-block; border-radius: 4px; padding: 2px 7px;
      font-size: 7pt; font-weight: 700; border: 1px solid; line-height: 1.4; white-space: nowrap;
    }
    .badge-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .badge-orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
    .badge-amber { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .badge-slate { background: #f8fafc; color: #475569; border-color: #d8e1ea; }

    /* ── Capacity ── */
    .cap-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;
    }
    .cap-card {
      border: 1px solid #d8e1ea; border-radius: 10px; padding: 12px;
      text-align: center; background: linear-gradient(180deg, #fff 0%, #eef3f8 100%);
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .cap-card .cap-label { font-size: 7.5pt; color: #64748b; font-weight: 700; }
    .cap-card .cap-value { font-size: 11pt; font-weight: 700; color: #0b1736; margin-top: 6px; word-break: keep-all; }

    .capacity-rows .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-bottom: 1px solid #eef3f8;
    }
    .capacity-rows .row:last-child { border-bottom: none; }
    .capacity-rows .row.highlight { background: #eef3f8; }
    .capacity-rows .label { color: #64748b; font-size: 9pt; }
    .capacity-rows .val { font-weight: 700; color: #0b1736; font-size: 10pt; }

    /* ── Grid review ── */
    .grid-summary {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 16px; border-bottom: 1px solid #d8e1ea;
      background: linear-gradient(180deg, #fff 0%, #eef3f8 100%);
    }
    .grid-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-high { background: #10b981; }
    .dot-review { background: #f59e0b; }
    .dot-difficult { background: #ef4444; }
    .dot-unknown { background: #94a3b8; }
    .grid-eq-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px;
    }
    .grid-eq {
      border: 1px solid #d8e1ea; border-radius: 10px; padding: 12px 10px; text-align: center;
      background: #fff; box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .grid-eq .eq-label {
      font-size: 7pt; color: #64748b; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
    }
    .grid-eq .eq-name { font-size: 9pt; font-weight: 700; color: #0b1736; margin-top: 6px; word-break: keep-all; line-height: 1.35; }

    .bar-section { padding: 12px 16px 14px; }
    .bar-section h3 { font-size: 9pt; margin-bottom: 12px; color: #475569; font-weight: 700; }
    .bar-row { margin-bottom: 12px; }
    .bar-row:last-child { margin-bottom: 0; }
    .bar-meta {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: 8pt; margin-bottom: 5px;
    }
    .bar-meta .bar-label { font-weight: 700; color: #64748b; }
    .bar-meta .bar-val { color: #0b1736; font-weight: 700; font-size: 8.5pt; }
    .bar-track {
      height: 6px; background: #d8e1ea; border-radius: 999px; overflow: hidden; position: relative;
    }
    .bar-fill { height: 100%; border-radius: 999px; min-width: 2px; }
    .bar-fill.cum { background: #cbd5e1; opacity: 0.6; width: 100%; position: absolute; left: 0; top: 0; }
    .bar-fill.rem { background: linear-gradient(90deg, #1a3270, #0b1736); position: relative; z-index: 1; }
    .bar-fill.warn { background: linear-gradient(90deg, #f59e0b, #ea580c); }
    .bar-fill.bad { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .bar-legend { display: flex; gap: 14px; margin-top: 10px; font-size: 7pt; color: #64748b; }
    .bar-legend span::before {
      content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 2px;
      margin-right: 4px; vertical-align: middle;
    }
    .legend-cum::before { background: #cbd5e1; }
    .legend-rem::before { background: #0b1736; }

    /* ── Consultation page ── */
    .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .check-card {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fff; border: 1px solid #d8e1ea; border-radius: 10px;
      padding: 12px 14px; min-height: 48px;
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .check-box {
      width: 14px; height: 14px; border: 2px solid #0b1736; border-radius: 3px;
      flex-shrink: 0; margin-top: 2px; background: #fff;
    }
    .check-card .check-text { font-size: 9pt; font-weight: 600; color: #0b1736; line-height: 1.45; }
    .check-section-wrap {
      background: #eef3f8; border: 1px solid #d8e1ea; border-radius: 12px;
      padding: 14px; margin-bottom: 14px;
    }
    .check-section-wrap .check-intro {
      font-size: 8.5pt; color: #64748b; margin-bottom: 10px; padding-bottom: 8px;
      border-bottom: 1px solid #d8e1ea;
    }

    .process-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;
    }
    .process-card {
      border: 1px solid #d8e1ea; border-radius: 10px; padding: 12px 10px;
      background: #fff; text-align: center;
      box-shadow: 0 2px 6px rgba(11, 23, 54, 0.04);
    }
    .process-card .step-num {
      width: 22px; height: 22px; border-radius: 50%; margin: 0 auto 8px;
      background: #0b1736; color: #fff; font-size: 8pt; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .process-card .step-title { font-size: 8.5pt; font-weight: 700; color: #0b1736; margin-bottom: 4px; }
    .process-card .step-desc { font-size: 7pt; color: #64748b; line-height: 1.45; }

    .cta-box {
      background: linear-gradient(135deg, #0b1736 0%, #111c3d 55%, #1a3270 100%);
      border-radius: 12px; padding: 20px 22px; text-align: center;
      box-shadow: 0 6px 20px rgba(11, 23, 54, 0.2);
    }
    .cta-box h3 { font-size: 12pt; margin-bottom: 8px; color: #fff; }
    .cta-box p { font-size: 9.5pt; color: rgba(255,255,255,0.88); line-height: 1.55; margin-bottom: 14px; }
    .cta-button {
      display: inline-block; padding: 8px 22px; border-radius: 999px;
      background: #f59e0b; color: #0b1736; font-size: 9.5pt; font-weight: 700;
      letter-spacing: 0.02em;
    }

    .footer-note {
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #d8e1ea;
      font-size: 7.5pt; color: #94a3b8; text-align: center;
    }

    .page-break { break-before: page; page-break-before: always; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  `;
}
