import { useEffect, useMemo, useRef, useState } from "react";
import { loadProperties } from "./data/loadProperties";
import { runAssessment } from "./data/runAssessment";
import "./App.css";

import { getZoneFriendlyName } from "../../../src/overlay/zoneNames";

const PRECHECKS = [
  {
    key: "heritage_item",
    label: "Heritage item",
    description: "The lot is a listed heritage item under the LEP.",
  },
  {
    key: "heritage_conservation_area",
    label: "Heritage conservation area",
    description: "The site falls within a heritage conservation area boundary.",
  },
  {
    key: "environmentally_sensitive",
    label: "Environmentally sensitive land",
    description: "Mapped environmentally sensitive land or riparian corridor.",
  },
  {
    key: "critical_habitat",
    label: "Critical habitat / wilderness",
    description: "Identified critical habitat, wilderness area, or national park.",
  },
  {
    key: "asbestos_management_area",
    label: "Asbestos management area",
    description: "Lot sits in an asbestos encapsulation or management area.",
  },
];

const STRUCTURE_TYPES = [
  { value: "shed", label: "Shed" },
  { value: "patio", label: "Patio" },
  { value: "pergola", label: "Pergola" },
  { value: "carport", label: "Carport" },
];

const FEATURE_CARDS = [
  {
    icon: "check",
    title: "Quick & Easy",
    description: "Get instant feedback on whether your proposed structure qualifies as Exempt Development.",
    accent: "success",
  },
  {
    icon: "document",
    title: "Clause References",
    description: "Detailed explanations with specific SEPP 2008 clause references for transparency.",
    accent: "primary",
  },
  {
    icon: "warning",
    title: "Overlay Checks",
    description: "Considers zoning, flood, bushfire, and heritage constraints (datasets pending approval).",
    accent: "warning",
  },
];

const NAV_ITEMS = [
  { id: "about", label: "About us" },
  { id: "landing", label: "Overview" },
  { id: "assessment", label: "Assessment" },
  { id: "history", label: "History" },
];

const DATASET_OPTIONS = [
  {
    key: "curated",
    label: "Curated (fast)",
    blurb: "20 hand-picked samples that keep the prototype snappy.",
  },
  {
    key: "full",
    label: "Full inventory",
    blurb: "3,000+ properties from the portal for deeper exploration.",
  },
];

function toCSV(rows) {
  if (!rows?.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v) =>
    typeof v === "string"
      ? `"${v.replace(/"/g, '""')}"`
      : v === null || v === undefined
      ? ""
      : String(v);
  return `${cols.join(",")}\n${rows
    .map((row) => cols.map((col) => esc(row[col])).join(","))
    .join("\n")}`;
}

const ICON_MAP = {
  check: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="#16a34a" strokeWidth="2" fill="rgba(22,163,74,0.08)" />
      <path
        d="M8.5 12.5l2.3 2.3 4.7-5.3"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  document: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="3" stroke="#2563eb" strokeWidth="2" fill="rgba(37,99,235,0.08)" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4l8 14H4l8-14z"
        stroke="#f97316"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="rgba(249,115,22,0.08)"
      />
      <path d="M12 10v4" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="#f97316" />
    </svg>
  ),
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function TopBar({ currentPage, onNavigate, theme, onToggleTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPage]);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const handleNavigate = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className="top-bar">
      <div
        className="brand"
        onClick={() => onNavigate("landing")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onNavigate("landing");
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Return to overview"
      >
        <img src="/albury-city-logo.png" alt="Albury City Council logo" className="brand-logo" />
        <div className="brand-copy">
          <h1>SEPP Assessment Tool</h1>
          <p>Albury City Council</p>
        </div>
      </div>
      <div className="top-nav-wrap">
        <button
          type="button"
          className="menu-toggle"
          onClick={toggleMobile}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
        >
          <span className="sr-only">Toggle navigation</span>
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <nav
          id="primary-navigation"
          className={`top-nav${mobileOpen ? ' top-nav--open' : ''}`}
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={classNames("pill-button", currentPage === item.id && "pill-button--active")}
              onClick={() => handleNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="pill-button theme-toggle"
            onClick={onToggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  );
}

function LandingPage({
  onStartAssessment,
  onViewHistory,
  propertyCount,
  completedCount,
  datasetMode,
  activeDataset,
  onDatasetChange,
  onRetryDataset,
  datasetError,
  loadingDataset,
}) {
  const activeOption = DATASET_OPTIONS.find((option) => option.key === activeDataset) ?? DATASET_OPTIONS[0];
  const datasetMessage = datasetError
    ? {
        tone: "warning",
        text: "Full dataset unavailable. Showing curated sample instead.",
        detail: datasetError.message,
      }
    : {
        tone: "muted",
        text: activeOption.blurb,
        detail: null,
      };

  return (
    <div className="landing">
      <section className="landing-hero">
        <span className="hero-kicker">NSW SEPP 2008 · Part 2 — Exempt Development</span>
        <h2>Exempt Development Assessment</h2>
        <p>Check if your shed, patio, pergola, or carport qualifies as Exempt Development under NSW SEPP 2008.</p>
        <div className="hero-actions">
          <button type="button" className="button-primary" onClick={onStartAssessment}>
            Start Assessment
          </button>
          <button type="button" className="button-secondary" onClick={onViewHistory}>
            View History
          </button>
        </div>
        <div className="dataset-switcher" aria-live="polite">
          <div className="dataset-switcher__row">
            <span className="dataset-switcher__label">Dataset</span>
            <div className="dataset-switcher__buttons" role="group" aria-label="Choose dataset">
              {DATASET_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={classNames(
                    "pill-button",
                    "dataset-switcher__button",
                    datasetMode === option.key && "pill-button--active"
                  )}
                  onClick={() => onDatasetChange(option.key)}
                  disabled={loadingDataset && datasetMode === option.key}
                  aria-pressed={datasetMode === option.key}
                >
                  {loadingDataset && datasetMode === option.key ? "Loading…" : option.label}
                </button>
              ))}
            </div>
          </div>
          <p className={classNames("dataset-switcher__message", datasetMessage.tone === "warning" && "is-warning")}>
            {datasetMessage.text}
            {datasetMessage.detail && (
              <>
                {" "}
                <button type="button" className="link-button" onClick={onRetryDataset}>
                  Retry load
                </button>
                <span className="dataset-switcher__detail">{datasetMessage.detail}</span>
              </>
            )}
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{propertyCount}</strong>
            <span>Sample sites loaded</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>Assessments saved locally</span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURE_CARDS.map((card) => (
          <article key={card.title} className={classNames("feature-card", `feature-card--${card.accent}`)}>
            <div className="feature-icon">{ICON_MAP[card.icon]}</div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="card about-card">
        <h3>About This Tool</h3>
        <p>
          This prototype assessment tool helps residents, builders, and property purchasers understand whether
          small-scale residential structures qualify as <strong>Exempt Development</strong> under the State Environmental
          Planning Policy (Exempt and Complying Development Codes) 2008.
        </p>
        <p>
          <strong>What is Exempt Development?</strong> Exempt development is minor building work that can be carried out
          without requiring council approval or a Development Application (DA).
        </p>
        <p>
          <strong>Current Scope:</strong> This tool assesses sheds, patios, pergolas, and carports against SEPP Part 2
          (Exempt Development) criteria for the Albury Local Government Area.
        </p>
        <div className="notice-card">
          <div className="notice-icon" aria-hidden>⚠️</div>
          <div>
            <strong>Important Notice</strong>
            <p>
              This tool provides preliminary guidance only. Overlay datasets (flood, bushfire, heritage) are pending
              approval for integration. Always verify requirements with Albury City Council before proceeding with
              construction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AssessmentPage({
  properties,
  selectedId,
  onSelectProperty,
  onAddSample,
  selected,
  type,
  setType,
  length,
  setLength,
  width,
  setWidth,
  height,
  setHeight,
  setback,
  setSetback,
  precheckValues,
  onTogglePrecheck,
  assessment,
  verdict,
  overlaySnap,
  area,
  precheckBlocking,
  guidanceVisible,
  logEntries,
  onRunAssessment,
  showOutcome,
  hasRunBefore,
}) {
  const [query, setQuery] = useState("");

  const handleAddSampleClick = () => {
    setQuery("");
    onAddSample();
  };

  if (!properties.length) {
    return (
      <div className="assessment-shell">
        <section className="card assessment-card">
          <h2>No sample data found</h2>
          <p className="muted">Import sample properties to begin an assessment.</p>
        </section>
      </div>
    );
  }

  const checks = assessment?.checks || [];
  const running = assessment.status === "running";
  const errored = assessment.status === "error";

  const filteredProperties = query
    ? properties.filter((property) =>
        [property.label, property.zone, property.zone_label]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query.toLowerCase()))
      )
    : properties;

  const summaryBadges = selected
    ? [
        {
          label: "Zone",
          value: selected.zone_label || getZoneFriendlyName(selected.zone),
        },
        {
          label: "Lot size",
          value: `${Number(selected.lot_size_m2 || 0).toLocaleString()} m²`,
        },
        {
          label: "Frontage",
          value: `${Number(selected.frontage_m || 0)} m`,
        },
        selected.corner_lot
          ? {
              label: "Corner lot",
              value: "Yes",
            }
          : null,
        {
          label: "Foreshore proximity",
          value: selected.foreshore_proximity ? "Within 40 m" : "Outside 40 m",
          tone: selected.foreshore_proximity ? "alert" : "neutral",
        },
      ].filter(Boolean)
    : [];

  return (
    <div className="assessment-shell">
      <div className="assessment-main">
        <section className="card assessment-card">
          <header className="assessment-card__header">
            <div>
              <p className="eyebrow">Site selection</p>
              <h2>Choose sample property</h2>
            </div>
            <button type="button" className="pill-button" onClick={handleAddSampleClick}>
              + Add sample
            </button>
          </header>

          <div className="assessment-select">
            <label htmlFor="property-select" className="field-label">
              Sample property
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by label, zone, or suburb"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              id="property-select"
              value={selectedId}
              onChange={(event) => onSelectProperty(event.target.value)}
            >
              {filteredProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </select>
            {query && !filteredProperties.length && (
              <p className="muted small">No matches found. Try a different search.</p>
            )}
          </div>

          {selected && (
            <div className="assessment-badges" aria-live="polite">
              {summaryBadges.map((item, index) => (
                <div key={index} className={`assessment-badge${item.tone ? ` assessment-badge--${item.tone}` : ''}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card assessment-card">
          <header className="assessment-card__header">
            <div>
              <p className="eyebrow">Structure inputs</p>
              <h2>Describe the proposal</h2>
            </div>
            <div className="footprint-chip">
              <span>Footprint</span>
              <strong>{area.toFixed(1)} m²</strong>
            </div>
          </header>

          <div className="structure-grid">
            <label className="field">
              <span className="field-label">Type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                {STRUCTURE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Length (m)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={length}
                onChange={(event) => setLength(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Width (m)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={width}
                onChange={(event) => setWidth(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Height (m)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Nearest boundary (m)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={setback}
                onChange={(event) => setSetback(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="card assessment-card">
          <header className="assessment-card__header">
            <div>
              <p className="eyebrow">Site restrictions</p>
              <h2>Pre-checks</h2>
            </div>
            <p className="muted">Toggle any overlays or constraints that apply to the lot.</p>
          </header>
          {selected?.foreshore_proximity && (
            <div className="foreshore-callout" role="alert">
              <strong>Clause 7.5 Foreshore building line</strong>
              <p>
                This property sits within 40 metres of the Murray River foreshore. Confirm exemption criteria with
                Council before advising the customer.
              </p>
            </div>
          )}
          <div className="precheck-grid">
            {PRECHECKS.map((item) => (
              <label key={item.key} className="precheck-tile">
                <input
                  type="checkbox"
                  checked={!!precheckValues[item.key]}
                  onChange={() => onTogglePrecheck(item.key)}
                />
                <div>
                  <div className="precheck-title">{item.label}</div>
                  <p className="muted">{item.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="card assessment-card assessment-run-card">
          <div className="assessment-run-card__header">
            <h2>Run assessment</h2>
            <p className="muted">Generate the outcome once the property details are complete.</p>
          </div>
          <div className="assessment-run-actions">
            <button
              type="button"
              className="button-primary"
              onClick={onRunAssessment}
              disabled={running || !selected}
            >
              {running ? "Running…" : hasRunBefore ? "Run assessment again" : "Run assessment"}
            </button>
            <span className={classNames("assessment-run-hint", running ? "assessment-run-hint--active" : "")}>
              {running
                ? "We’re crunching the ruleset. Hang tight."
                : !hasRunBefore
                ? "Complete the steps above, then run the assessment to see the outcome."
                : showOutcome
                ? "Outcome reflects the latest inputs."
                : "Details changed since your last run. Run the assessment to refresh the outcome."}
            </span>
          </div>
        </section>

        {showOutcome && (
          <section className="card assessment-card" aria-live="polite">
            <header className="assessment-card__header">
              <div>
                <p className="eyebrow">Automated verdict</p>
                <h2>Assessment outcome</h2>
              </div>
              <div className="verdict-pill">
                {running ? "Running…" : verdict}
              </div>
            </header>

            {errored && (
              <div className="alert alert-danger">
                <div>Couldn’t run the ruleset. {assessment.message}</div>
              </div>
            )}

            {!running && !errored && (
              <>
                {precheckBlocking && (
                  <div className="alert alert-warning">
                    <div>One or more site restrictions prevent exempt development.</div>
                  </div>
                )}

                {checks.length ? (
                  <div className="criteria-list">
                    {checks.map((check, index) => (
                      <div
                        key={check.id || index}
                        className={classNames("criteria-item", check.ok ? "pass" : "fail")}
                      >
                        <div className="criteria-title">{check.ok ? "Pass" : "Fail"}</div>
                        <p>{check.message || check.code || "See details"}</p>
                        {(check.clause || check.citation) && (
                          <div className="muted small">
                            {check.clause}
                            {check.clause && check.citation && " — "}
                            {check.citation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No clause messages returned. Adjust the inputs to refresh the checks.</p>
                )}
              </>
            )}

            {running && (
              <p className="muted">We’re running the ruleset against the supplied details.</p>
            )}
          </section>
        )}
      </div>

      <aside className="assessment-sidebar">
        <section className="card assessment-card">
          <header className="assessment-card__header">
            <div>
              <p className="eyebrow">Overlay snapshot</p>
              <h2>Environmental context</h2>
            </div>
          </header>
          {overlaySnap ? (
            <div className="overlay-grid">
              <div className="overlay-tile">
                <span>Zone</span>
                <strong>{overlaySnap.zone || "Unknown"}</strong>
              </div>
              <div className="overlay-tile">
                <span>BAL</span>
                <strong>{overlaySnap.bal || "Unknown"}</strong>
              </div>
              <div className="overlay-tile">
                <span>Flood</span>
                <strong>{overlaySnap.floodCategory || "Unknown"}</strong>
              </div>
              {typeof overlaySnap.floodControlLot === "boolean" && (
                <div className="overlay-tile">
                  <span>Flood control lot</span>
                  <strong>{overlaySnap.floodControlLot ? "Yes" : "No"}</strong>
                </div>
              )}
            </div>
          ) : (
            <p className="muted">
              Overlay snapshot unavailable. Import BAL and flood datasets to view gating results.
            </p>
          )}
        </section>

        <section className="card assessment-card">
          <header className="assessment-card__header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Assessment log</h2>
            </div>
          </header>
          {logEntries.length ? (
            <ul className="history-list">
              {logEntries.slice(-5).reverse().map((entry) => (
                <li key={entry.timestamp} className="history-item">
                  <span className="meta">{new Date(entry.timestamp).toLocaleString()}</span>
                  <strong>{entry.sampleLabel || entry.sampleId}</strong>
                  <span className={classNames("verdict-chip", entry.verdict === "LIKELY EXEMPT" ? "good" : "bad")}>
                    {entry.verdict}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Run an assessment to start building the log.</p>
          )}
        </section>

        {showOutcome && guidanceVisible && (
          <section className="card assessment-card">
            <header className="assessment-card__header">
              <div>
                <p className="eyebrow">Guidance</p>
                <h2>Next steps</h2>
              </div>
            </header>
            <div className="guidance-list">
              {verdict === "LIKELY EXEMPT" ? (
                <div className="guidance-item">
                  <h4>All conditions satisfied</h4>
                  <p>
                    Structure and overlay gates both passed. Export the summary and share it with the applicant to
                    document exempt development advice.
                  </p>
                </div>
              ) : (
                <>
                  {!precheckBlocking && (
                    <div className="guidance-item">
                      <h4>Consider complying development</h4>
                      <p>
                        Inland Housing Code eligibility may still apply if flood and BAL thresholds are satisfied.
                      </p>
                    </div>
                  )}
                  <div className="guidance-item">
                    <h4>{precheckBlocking ? "Speak with Council" : "Development application"}</h4>
                    <p>
                      {precheckBlocking
                        ? "Site restrictions trigger an immediate referral. Ask the customer to speak with Council’s duty planner for bespoke guidance."
                        : "If Inland Housing standards cannot be met, progress towards a Development Application under the Albury DCP 2010 (Part 10—Division D)."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

function HistoryPage({ logEntries, onExportLog }) {
  return (
    <div className="history-page">
      <section className="card history-card">
        <h2>Assessment history</h2>
        <p>Entries are stored in your browser only. Export before closing this window if you need a record.</p>
        <div className="history-actions">
          <button type="button" className="button-primary" onClick={() => onExportLog("csv")}>
            Export CSV
          </button>
          <button type="button" className="button-secondary" onClick={() => onExportLog("json")}>
            Export JSON
          </button>
        </div>
        {logEntries.length ? (
          <ul className="history-list">
            {logEntries
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`} className="history-item">
                  <span className="meta">{new Date(entry.timestamp).toLocaleString()}</span>
                  <strong>{entry.sampleLabel || entry.sampleId}</strong>
                  <span className="meta">{entry.reason}</span>
                  <span className={classNames("verdict-chip", entry.verdict === "LIKELY EXEMPT" ? "good" : "bad")}>
                    {entry.verdict}
                  </span>
                  {entry.clauses && <span className="meta">Clauses: {entry.clauses}</span>}
                </li>
              ))}
          </ul>
        ) : (
          <div className="alert alert-warning">
            <div>No saved history yet. Complete an assessment to populate this list.</div>
          </div>
        )}
      </section>
    </div>
  );
}

function AboutPage() {
  const highlights = [
    {
      title: "Our mission",
      body: "Give council staff and residents instant clarity on SEPP Part 2 requirements so exempt approvals are fast, consistent, and transparent.",
    },
    {
      title: "What we built",
      body: "A rules-driven assistant that merges property overlays, assessment logic, and guided UI flows into a single experience.",
    },
    {
      title: "What’s next",
      body: "Expand overlays (flood, BAL, heritage), plug in foreshore proximity datasets, and keep iterating with council feedback.",
    },
  ];

  const contributors = [
    { name: "Kush Kapadia", role: "Fullstack developer" },
    { name: "Rohan Khurana", role: "Fullstack developer" },
    { name: "Stephanie Potts", role: "Data sourcing & mapping access" },
    { name: "Ummay Neha", role: "Contributor" },
    { name: "Jonathan Azzi", role: "Contributor" },
    { name: "Albury City Council", role: "Project owner" },
  ];

  return (
    <div className="about-page">
      <section className="about-hero">
        <p className="eyebrow">About this project</p>
        <h1>Helping Albury deliver exempt development advice with confidence</h1>
        <p>
          This prototype blends planning rules, overlay intelligence, and an approachable UI so council staff can
          deliver clearer guidance to the community in minutes.
        </p>
      </section>

      <section className="about-grid">
        {highlights.map((item) => (
          <article key={item.title} className="about-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="about-team">
        <div className="team-intro">
          <h2>Who’s behind the build</h2>
          <p className="muted">
            We’re Fathom Minds, a delivery team pairing product craft with council know-how to make SEPP assessments
            easier for frontline staff. Our engineers and data specialists collaborate closely with Albury City Council
            to turn planning rules and overlay checks into a practical workflow.
          </p>
          <p className="muted">
            Albury City Council leads the vision as project owner while the contributors below bring the build and data
            foundations to life.
          </p>
        </div>
        <ul className="team-grid">
          {contributors.map((person) => (
            <li key={person.name}>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-cta">
        <h2>Want to collaborate?</h2>
        <p>
          Share data sources, planning rules, or feedback and we’ll continue improving the assessment experience for
          councils across NSW.
        </p>
        <a href="mailto:kushkapadia9660@gmail.com" className="button-primary about-button">
          Contact Fathom Minds
        </a>
      </section>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="pill-button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-meta">
          <span>© Fathom Minds | {year} Albury City Council · SEPP Exempt Development Assessment Tool</span>
          <span>Based on SEPP (Exempt and Complying Development Codes) 2008</span>
        </div>
        <time className="footer-date" dateTime={new Date().toISOString()}>
          {today}
        </time>
      </div>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");

  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedIdState] = useState("");

  const [logEntries, setLogEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("assessmentLog") || "[]");
    } catch {
      return [];
    }
  });

  const [type, setType] = useState("Type");
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [setback, setSetback] = useState(0);

  const [precheckValues, setPrecheckValues] = useState(() =>
    PRECHECKS.reduce((acc, item) => {
      acc[item.key] = false;
      return acc;
    }, {})
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessment, setAssessment] = useState({ status: "idle" });
  const runVersionRef = useRef(0);
  const prevInputSignatureRef = useRef("");
  const [runRequestId, setRunRequestId] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [hasRunBefore, setHasRunBefore] = useState(false);

  const setSelectedId = (valueOrUpdater) => {
    setSelectedIdState((prev) => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      if (next !== prev) {
        runVersionRef.current += 1;
        setShowOutcome(false);
        setAssessment({ status: "idle" });
      }
      return next;
    });
  };

  const [datasetMode, setDatasetMode] = useState(() => {
    if (typeof window === "undefined") return "curated";
    try {
      const stored = window.localStorage.getItem("datasetPreference");
      return stored === "full" ? "full" : "curated";
    } catch {
      return "curated";
    }
  });
  const [activeDataset, setActiveDataset] = useState("curated");
  const [datasetError, setDatasetError] = useState(null);


  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('uiTheme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
    try {
      window.localStorage.setItem('uiTheme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("datasetPreference", datasetMode);
    } catch {}
  }, [datasetMode]);

  const [addOpen, setAddOpen] = useState(false);
  const [newSample, setNewSample] = useState({
    label: "",
    zone: "R1 General Residential",
    lot_size_m2: "",
    frontage_m: "",
    corner_lot: false,
  });

  useEffect(() => {
    localStorage.setItem("assessmentLog", JSON.stringify(logEntries));
  }, [logEntries]);

  const getUserSamples = () => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("userSamples") || "[]") || [];
    } catch {
      return [];
    }
  };

  const mergeSamples = (baseList = []) => {
    const userList = getUserSamples();
    const byId = new Map();
    [...baseList, ...userList].forEach((property) => {
      if (property && property.id) {
        byId.set(property.id, property);
      }
    });
    return Array.from(byId.values());
  };

  const ensureSelection = (list) => {
    if (!Array.isArray(list) || !list.length) {
      setSelectedId("");
      return;
    }
    setSelectedId((prev) => (prev && list.some((item) => item.id === prev) ? prev : list[0].id));
  };

  async function fetchProperties(mode = datasetMode) {
    setLoading(true);
    try {
      const res = await loadProperties({ dataset: mode });
      if (!res.ok) {
        throw new Error(res.message || "Failed to load properties");
      }
      const list = mergeSamples(res.data.properties || []);
      setProperties(list);
      ensureSelection(list);
      setError(null);
      setDatasetError(null);
      setActiveDataset(mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mode !== "curated") {
        setDatasetError({ requested: mode, message });
        try {
          const fallback = await loadProperties({ dataset: "curated" });
          if (!fallback.ok) {
            throw new Error(fallback.message || "Failed to load curated dataset");
          }
          const list = mergeSamples(fallback.data.properties || []);
          setProperties(list);
          ensureSelection(list);
          setError(null);
          setActiveDataset("curated");
        } catch (fallbackErr) {
          const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          setProperties([]);
          setSelectedId("");
          setError({ message: `Fallback failed: ${fallbackMessage}` });
        }
      } else {
        setProperties([]);
        setSelectedId("");
        setError({ message });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperties(datasetMode);
  }, [datasetMode]);

  const handleDatasetChange = (mode) => {
    if (mode === datasetMode) return;
    setDatasetError(null);
    setDatasetMode(mode);
  };

  const retryDatasetLoad = () => fetchProperties(datasetMode);

  const selected = properties.find((property) => property.id === selectedId);
  const safeNum = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const area = safeNum(length) * safeNum(width);

  const precheckKey = PRECHECKS.map((item) => (precheckValues[item.key] ? "1" : "0")).join("");
  const precheckTriggers = PRECHECKS.filter((item) => precheckValues[item.key]);
  const precheckBlocking = precheckTriggers.length > 0;

  const proposal = useMemo(
    () => ({
      kind: type,
      length_m: safeNum(length),
      width_m: safeNum(width),
      height_m: safeNum(height),
      nearest_boundary_m: safeNum(setback),
      area_m2: area,
    }),
    [type, length, width, height, setback, area]
  );

  function recordLog(entry) {
    setLogEntries((prev) => [...prev, entry]);
  }

  function handleExportLog(format = "csv") {
    if (!logEntries.length) {
      alert("No log entries to export yet.");
      return;
    }

    if (format === "csv") {
      const csvBlob = new Blob([toCSV(logEntries)], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "assessment_log.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      const jsonBlob = new Blob([JSON.stringify(logEntries, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(jsonBlob);
      link.download = "assessment_log.json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const defaults = selected.prechecks || {};
    setPrecheckValues((prev) => {
      const next = { ...prev };
      PRECHECKS.forEach((item) => {
        next[item.key] = Boolean(defaults[item.key]);
      });
      return next;
    });
  }, [selected]);

  useEffect(() => {
    const signature = JSON.stringify({
      selectedId,
      type,
      length,
      width,
      height,
      setback,
      prechecks: precheckKey,
    });

    if (!showOutcome) {
      prevInputSignatureRef.current = signature;
      return;
    }

    if (prevInputSignatureRef.current !== signature) {
      runVersionRef.current += 1;
      setShowOutcome(false);
      setAssessment({ status: "idle" });
    }

    prevInputSignatureRef.current = signature;
  }, [selectedId, type, length, width, height, setback, precheckKey, showOutcome]);

  useEffect(() => {
    if (!selected) return;
    if (runRequestId === 0) return;

    const currentRunId = runRequestId;

    if (precheckBlocking) {
      const blockedChecks = precheckTriggers.map((item) => ({
        id: `precheck-${item.key}`,
        ok: false,
        message: `${item.label} applies to this site.`,
        clause: "SEPP Exempt Development 2008 Part 2 — General restrictions",
        citation: item.description,
      }));

      if (runVersionRef.current !== currentRunId) {
        return;
      }

      setAssessment({ status: "blocked", checks: blockedChecks, result: { verdict: "NOT EXEMPT" } });

      if (runVersionRef.current === currentRunId) {
        recordLog({
          timestamp: new Date().toISOString(),
          sampleId: selected.id,
          sampleLabel: selected.label,
          verdict: "NOT EXEMPT",
          reason: "Pre-check failed",
          prechecks: blockedChecks.map((check) => check.message).join("; "),
          clauses: blockedChecks.map((check) => check.clause || "N/A").join("; "),
          overlay: "N/A",
          inputs: JSON.stringify(proposal),
        });
      }
      return;
    }

    let cancelled = false;

    setAssessment({ status: "running", checks: [] });

    (async () => {
      try {
        const output = await runAssessment(selected, proposal);
        if (cancelled) return;
        if (runVersionRef.current !== currentRunId) return;

        if (output && output.ok) {
          const checks = output.result?.checks || output.checks || output.issues || [];
          const verdict = output.result?.verdict ?? "NOT EXEMPT";
          const overlay = output.result?.overlay || output.overlay || output.result?.overlays || null;

          setAssessment({ status: "done", checks, result: { verdict, overlay } });

          if (runVersionRef.current === currentRunId) {
            const overlaySnapshot = overlay?.snapshot || overlay || null;
            recordLog({
              timestamp: new Date().toISOString(),
              sampleId: selected.id,
              sampleLabel: selected.label,
              verdict,
              reason: verdict === "LIKELY EXEMPT" ? "All checks passed" : "Overlay/structure checks failed",
              clauses: checks.map((check) => check.clause || "N/A").join("; "),
              overlay: overlaySnapshot
                ? `${overlaySnapshot.zone ?? "UNKNOWN"} | ${overlaySnapshot.bal ?? "UNKNOWN"} | ${overlaySnapshot.floodCategory ?? "UNKNOWN"}`
                : "UNKNOWN",
              inputs: JSON.stringify(proposal),
            });
          }
        } else {
          throw new Error(output?.message || "Unknown engine error");
        }
      } catch (err) {
        if (!cancelled && runVersionRef.current === currentRunId) {
          setAssessment({ status: "error", message: err.message || String(err) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, proposal, precheckBlocking, precheckKey, runRequestId]);

  const overlaySnap = useMemo(() => {
    const overlay = assessment?.result?.overlay || assessment?.overlay || null;
    if (!overlay && selected) {
      const zoneString = selected.zone || "";
      const zoneCode = zoneString.split(" ")[0] || "UNKNOWN";
      return {
        zone: zoneCode,
        bal: selected.bal || "UNKNOWN",
        floodCategory: selected.floodCategory || "UNKNOWN",
        floodControlLot: Boolean(selected.floodControlLot),
      };
    }
    if (!overlay) return null;
    if (overlay.snapshot) return overlay.snapshot;
    return overlay;
  }, [assessment, selected]);

  const verdict = assessment.result?.verdict ?? "NOT EXEMPT";
  const guidanceVisible = showOutcome && (assessment.status === "done" || assessment.status === "blocked");

  const handleRunAssessment = () => {
    if (!selected) return;
    const nextRunId = runVersionRef.current + 1;
    runVersionRef.current = nextRunId;
    setHasRunBefore(true);
    setShowOutcome(true);
    setRunRequestId(nextRunId);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  function handleTogglePrecheck(key) {
    setPrecheckValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCreateSample(event) {
    event.preventDefault();
    const trimmed = (value) => String(value || "").trim();

    const sample = {
      id: `USR_${Date.now()}`,
      label: trimmed(newSample.label) || "Untitled sample",
      zone: trimmed(newSample.zone) || "R1 General Residential",
      lot_size_m2: Number(newSample.lot_size_m2) || 0,
      frontage_m: Number(newSample.frontage_m) || 0,
      corner_lot: Boolean(newSample.corner_lot),
    };

    const next = [sample, ...properties];
    setProperties(next);
    setSelectedId(sample.id);

    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem("userSamples") || "[]") || [];
    } catch {
      existing = [];
    }
    localStorage.setItem("userSamples", JSON.stringify([sample, ...existing]));

    const allRows = next.map((property) => ({
      id: property.id,
      label: property.label,
      zone: property.zone,
      lot_size_m2: property.lot_size_m2,
      frontage_m: property.frontage_m,
      corner_lot: property.corner_lot,
    }));

    const jsonBlob = new Blob([JSON.stringify({ properties: allRows }, null, 2)], {
      type: "application/json",
    });
    const jsonLink = document.createElement("a");
    jsonLink.href = URL.createObjectURL(jsonBlob);
    jsonLink.download = "properties.json";
    jsonLink.click();
    URL.revokeObjectURL(jsonLink.href);

    const csvBlob = new Blob([toCSV(allRows)], { type: "text/csv" });
    const csvLink = document.createElement("a");
    csvLink.href = URL.createObjectURL(csvBlob);
    csvLink.download = "properties.csv";
    csvLink.click();
    URL.revokeObjectURL(csvLink.href);

    setAddOpen(false);
    setNewSample({
      label: "",
      zone: "R1 General Residential",
      lot_size_m2: "",
      frontage_m: "",
      corner_lot: false,
    });
  }

  let content;
  if (loading) {
    content = (
      <div className="page-state">
        <div className="card">
          <h3>Loading sample data…</h3>
          <p className="muted">Preparing assessment engine and overlay snapshots.</p>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="page-state">
        <div className="card">
          <h3>Couldn’t load property data</h3>
          <p className="muted">{error.message || "Invalid data."}</p>
          <button type="button" className="button-primary" onClick={() => fetchProperties(datasetMode)}>
            Try again
          </button>
        </div>
      </div>
    );
  } else {
    if (page === "landing") {
      content = (
        <LandingPage
          onStartAssessment={() => setPage("assessment")}
          onViewHistory={() => setPage("history")}
          propertyCount={properties.length}
          completedCount={logEntries.length}
          datasetMode={datasetMode}
          activeDataset={activeDataset}
          onDatasetChange={handleDatasetChange}
          onRetryDataset={retryDatasetLoad}
          datasetError={datasetError}
          loadingDataset={loading}
        />
      );
    } else if (page === "assessment") {
      content = (
        <AssessmentPage
          properties={properties}
          selectedId={selectedId}
          onSelectProperty={setSelectedId}
          onAddSample={() => setAddOpen(true)}
          selected={selected}
          type={type}
          setType={setType}
          length={length}
          setLength={setLength}
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
          setback={setback}
          setSetback={setSetback}
          precheckValues={precheckValues}
          onTogglePrecheck={handleTogglePrecheck}
          assessment={assessment}
          verdict={verdict}
          overlaySnap={overlaySnap}
          area={area}
          precheckBlocking={precheckBlocking}
          guidanceVisible={guidanceVisible}
          logEntries={logEntries}
          onRunAssessment={handleRunAssessment}
          showOutcome={showOutcome}
          hasRunBefore={hasRunBefore}
        />
      );
  } else if (page === "history") {
    content = <HistoryPage logEntries={logEntries} onExportLog={handleExportLog} />;
  } else if (page === "about") {
    content = <AboutPage />;
  }
  }

  return (
    <div className="app-shell">
      <TopBar
        currentPage={page}
        onNavigate={setPage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="app-main" role="main">
        {content}
      </main>
      <Footer />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a sample property">
        <form onSubmit={handleCreateSample} className="form-grid">
          <label className="field" htmlFor="sample-label">
            <span className="field-label">Label</span>
            <input
              id="sample-label"
              value={newSample.label}
              onChange={(event) => setNewSample((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="e.g. Urban small lot — Newtown"
              required
            />
          </label>
          <label className="field" htmlFor="sample-zone">
            <span className="field-label">Zone</span>
            <input
              id="sample-zone"
              value={newSample.zone}
              onChange={(event) => setNewSample((prev) => ({ ...prev, zone: event.target.value }))}
            />
          </label>
          <label className="field" htmlFor="sample-lot-size">
            <span className="field-label">Lot size (m²)</span>
            <input
              id="sample-lot-size"
              type="number"
              min="0"
              step="1"
              value={newSample.lot_size_m2}
              onChange={(event) => setNewSample((prev) => ({ ...prev, lot_size_m2: event.target.value }))}
              required
            />
          </label>
          <label className="field" htmlFor="sample-frontage">
            <span className="field-label">Frontage (m)</span>
            <input
              id="sample-frontage"
              type="number"
              min="0"
              step="0.1"
              value={newSample.frontage_m}
              onChange={(event) => setNewSample((prev) => ({ ...prev, frontage_m: event.target.value }))}
              required
            />
          </label>
          <label className="field field--checkbox" htmlFor="sample-corner">
            <span className="field-label">Corner lot</span>
            <input
              id="sample-corner"
              type="checkbox"
              checked={!!newSample.corner_lot}
              onChange={(event) => setNewSample((prev) => ({ ...prev, corner_lot: event.target.checked }))}
            />
          </label>
          <div className="modal-actions">
            <button type="submit" className="button-primary">
              Save & Download JSON/CSV
            </button>
            <button type="button" className="button-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
          </div>
          <p className="muted">
            Saved samples persist locally (browser storage). The downloaded files contain the combined list.
          </p>
        </form>
      </Modal>
    </div>
  );
}
