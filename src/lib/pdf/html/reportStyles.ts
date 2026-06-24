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

    /* ── Page 1 Cover band ── */
    .cover-band {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      padding: 16px 18px; margin-bottom: 12px; border-radius: 12px;
      background: linear-gradient(135deg, #0b1736 0%, #111c3d 55%, #1a3270 100%);
      color: #fff; box-shadow: 0 10px 28px rgba(11, 23, 54, 0.22);
      position: relative; overflow: hidden;
    }
    .cover-band::before {
      content: ''; position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: 24px 24px; pointer-events: none;
    }
    .cover-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
    .cover-left img { height: 28px; width: auto; filter: brightness(0) invert(1); }
    .cover-left .brand-text { font-size: 15pt; font-weight: 700; }
    .cover-tag { font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.72; margin-bottom: 4px; }
    .cover-band h1 { font-size: 13pt; color: #fff; margin-bottom: 3px; letter-spacing: -0.02em; }
    .cover-sub { font-size: 7.5pt; opacity: 0.82; line-height: 1.45; max-width: 280px; }
    .cover-right { text-align: right; position: relative; z-index: 1; min-width: 38%; }
    .cover-date-label { font-size: 6.5pt; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.65; }
    .cover-date { font-size: 10pt; font-weight: 700; margin: 2px 0 8px; }
    .cover-address { font-size: 8pt; opacity: 0.88; line-height: 1.45; word-break: keep-all; }

    /* ── Page 1 Split ── */
    .page-one-split {
      display: flex; gap: 10px; margin-bottom: 10px; align-items: stretch; min-height: 248px;
    }
    .page-one-map {
      flex: 0 0 60%; border: 1px solid #d8e1ea; border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 16px rgba(11, 23, 54, 0.08); display: flex; flex-direction: column;
    }
    .map-panel-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: #0b1736; color: #eef3f8;
    }
    .map-panel-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .map-panel-date { font-size: 7pt; opacity: 0.75; }
    .map-stage-lg { position: relative; flex: 1; min-height: 200px; background: #eef3f8; }
    .map-stage-lg .map-wrap { height: 100%; min-height: 200px; }
    .map-stage-lg .map-wrap img { width: 100%; height: 100%; min-height: 200px; object-fit: cover; }
    .page-one-map .location-card { flex: 1; border-top: none; min-height: 200px; }

    .page-one-kpis {
      flex: 0 0 calc(40% - 10px); display: flex; flex-direction: column; gap: 6px;
    }
    .kpi-stack-title {
      font-size: 7pt; font-weight: 700; color: #64748b; letter-spacing: 0.08em;
      text-transform: uppercase; padding: 0 2px 2px;
    }
    .hero-kpi {
      flex: 1; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; justify-content: center;
      border: 1px solid #d8e1ea; min-height: 42px;
    }
    .hero-kpi-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 4px; }
    .hero-kpi-value { font-size: 10pt; font-weight: 700; line-height: 1.3; word-break: keep-all; display: flex; align-items: center; gap: 6px; }
    .hero-kpi-primary {
      background: linear-gradient(135deg, #0b1736, #1a3270); color: #fff; border-color: #0b1736;
      box-shadow: 0 4px 12px rgba(11, 23, 54, 0.18);
    }
    .hero-kpi-primary .hero-kpi-label { color: rgba(255,255,255,0.72); }
    .hero-kpi-primary .hero-kpi-value { font-size: 12pt; color: #fff; }
    .hero-kpi-revenue { background: #fff; border-left: 3px solid #f59e0b; }
    .hero-kpi-revenue .hero-kpi-value { color: #0b1736; font-size: 10.5pt; }
    .hero-kpi-cost { background: #f8fafc; }
    .hero-kpi-cost .hero-kpi-value { color: #334155; }
    .hero-kpi-rec { background: #fffbeb; border-color: #fde68a; }
    .hero-kpi-rec .hero-kpi-value { color: #b45309; }
    .hero-kpi-grid { background: #eef3f8; }
    .hero-kpi-grid .hero-kpi-value { color: #0b1736; font-size: 9pt; }

    /* ── Assessment card ── */
    .assessment-card {
      border: 1px solid #d8e1ea; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px;
      background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
      box-shadow: 0 4px 14px rgba(11, 23, 54, 0.06);
    }
    .assessment-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
    .assessment-title { font-size: 11pt; font-weight: 700; color: #0b1736; }
    .assessment-sub { font-size: 8pt; font-weight: 700; color: #64748b; }
    .assessment-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .assessment-pill {
      display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 7.5pt; font-weight: 700;
      border: 1px solid;
    }
    .pill-positive { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .pill-warn { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
    .pill-neutral { background: #f8fafc; color: #475569; border-color: #d8e1ea; }
    .assessment-note { font-size: 8pt; color: #64748b; line-height: 1.6; }
    .page-one-disclaimer { margin-top: 4px; }
    .page-one-label { margin-bottom: 6px; }

    .page-label {
      font-size: 6.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: #94a3b8; margin-bottom: 2px;
    }
    .accent-risk { background: linear-gradient(180deg, #ea580c, #f59e0b); }
    .accent-cta { background: linear-gradient(180deg, #f59e0b, #0b1736); }
    .subsection-head { margin: 12px 0 8px; }
    .subsection-head h3 { font-size: 10pt; color: #0b1736; margin-bottom: 2px; }
    .subsection-head p { font-size: 7.5pt; color: #64748b; }

    /* ── Case study ── */
    .case-study-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
    .case-study-card {
      border: 1px solid #d8e1ea; border-radius: 12px; padding: 14px;
      background: linear-gradient(145deg, #fff 0%, #eef3f8 100%);
      box-shadow: 0 3px 10px rgba(11, 23, 54, 0.05);
    }
    .case-tag { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
    .case-title { font-size: 10pt; font-weight: 700; color: #0b1736; margin-bottom: 4px; }
    .case-region { font-size: 8pt; font-weight: 700; color: #f59e0b; margin-bottom: 6px; }
    .case-desc { font-size: 7.5pt; color: #475569; line-height: 1.5; margin-bottom: 8px; }
    .case-placeholder {
      font-size: 7pt; color: #64748b; padding-top: 8px; border-top: 1px dashed #d8e1ea;
    }

    /* ── Legacy map (page 2+) ── */
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
    .notice.green { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }

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

    /* ── KEPCO office (PDF) ── */
    .kepco-office-card {
      margin-top: 10px; border: 1px solid #d8e1ea; border-radius: 12px; padding: 12px 14px;
      background: linear-gradient(180deg, #fff 0%, #eef3f8 100%);
      box-shadow: 0 2px 8px rgba(11, 23, 54, 0.05);
    }
    .kepco-office-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;
    }
    .kepco-office-label {
      font-size: 6.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;
    }
    .kepco-office-name { font-size: 11pt; font-weight: 700; color: #0b1736; margin-top: 3px; }
    .kepco-match-row { margin-bottom: 6px; }
    .kepco-match-row.meta .kepco-field-val { font-weight: 500; color: #64748b; font-size: 7pt; }
    .kepco-status { font-size: 6.5pt !important; }
    .kepco-note { font-size: 7.5pt; color: #64748b; line-height: 1.5; margin-bottom: 8px; word-break: keep-all; }
    .kepco-note.warn { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 8px; }
    .kepco-office-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;
    }
    .kepco-field-label { font-size: 6.5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
    .kepco-field-val { font-size: 8pt; font-weight: 700; color: #334155; margin-top: 3px; line-height: 1.4; word-break: keep-all; }
    .kepco-field-meta { font-size: 6.5pt; font-weight: 500; color: #64748b; margin-top: 2px; line-height: 1.35; word-break: keep-all; }
    .kepco-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .kepco-list { margin: 4px 0 0; padding-left: 12px; font-size: 7.5pt; color: #475569; line-height: 1.45; word-break: keep-all; }
    .kepco-list li { margin-bottom: 2px; }
    .kepco-contact-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;
    }
    .kepco-call-guide {
      font-size: 7pt; color: #334155; line-height: 1.45; border-top: 1px solid #d8e1ea; padding-top: 8px;
      background: #fff; border-radius: 6px; padding: 6px 8px; margin-top: 4px; word-break: keep-all;
    }

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

    .ord-info-banner {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin-bottom: 10px; padding: 8px 12px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
    }
    .ord-info-banner-text { font-size: 7.5pt; color: #1e3a8a; font-weight: 600; }
    .ord-kind {
      display: inline-block; padding: 2px 7px; border-radius: 6px;
      background: #e0f2fe; color: #0c4a6e; font-size: 7pt; font-weight: 700;
      border: 1px solid #bae6fd;
    }
    .ord-link { color: #0b1736; font-weight: 700; font-size: 7.5pt; text-decoration: underline; }
    .ord-url {
      margin-top: 3px; font-size: 6.5pt; color: #64748b; line-height: 1.45;
      word-break: break-all;
    }
    .ord-status-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
      padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    }
    .ord-status-municipality { font-size: 8.5pt; font-weight: 700; color: #0f172a; }
    .ord-summary-card {
      margin-bottom: 10px; border: 1px solid #d8e1ea; border-radius: 12px; overflow: hidden;
      background: #fff; box-shadow: 0 2px 8px rgba(11, 23, 54, 0.04);
    }
    .ord-summary-head {
      padding: 12px 14px; background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #eef3f8;
    }
    .ord-summary-label { font-size: 7pt; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
    .ord-summary-name { margin-top: 4px; font-size: 10pt; font-weight: 700; color: #0b1736; line-height: 1.4; }
    .ord-summary-article { margin-top: 4px; font-size: 9pt; font-weight: 700; color: #1e3a8a; }
    .ord-summary-appendix { margin-top: 2px; font-size: 7.5pt; color: #64748b; }
    .ord-summary-body { padding: 12px 14px 14px; }
    .ord-summary-list { margin: 0; padding-left: 16px; font-size: 8pt; color: #334155; line-height: 1.55; }
    .ord-summary-list li { margin-bottom: 4px; }
    .ord-summary-empty { font-size: 8pt; color: #64748b; line-height: 1.55; margin: 0; }
    .ord-summary-source { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eef3f8; }
    .ord-summary-source-label { display: block; font-size: 7pt; font-weight: 700; color: #64748b; margin-bottom: 3px; }
    .ord-notice-list {
      margin: 8px 0 0; padding: 10px 12px 10px 28px;
      background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;
      font-size: 7.5pt; color: #065f46; line-height: 1.5;
    }

    .page-break { break-before: page; page-break-before: always; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  `;
}
