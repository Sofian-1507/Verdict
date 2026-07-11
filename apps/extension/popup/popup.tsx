import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Gavel,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Trash2,
  Settings,
  Power,
  ExternalLink,
} from "lucide-react";
import type { StoredClaimResult, ExtensionSettings, FactCheckResult } from "@verdict/shared-types";
import { DEFAULT_SETTINGS } from "@verdict/shared-types";
import "./popup.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VERDICT_COLORS: Record<string, { text: string; bg: string }> = {
  True:          { text: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  False:         { text: "#f87171", bg: "rgba(239,68,68,0.12)" },
  Misleading:    { text: "#facc15", bg: "rgba(234,179,8,0.12)" },
  Uncertain:     { text: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  Unverifiable:  { text: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function VerdictIcon({ verdict }: { verdict: string }) {
  const size = 14;
  switch (verdict) {
    case "True":      return <CheckCircle size={size} style={{ color: VERDICT_COLORS.True.text }} />;
    case "False":     return <XCircle size={size} style={{ color: VERDICT_COLORS.False.text }} />;
    case "Misleading":return <AlertTriangle size={size} style={{ color: VERDICT_COLORS.Misleading.text }} />;
    default:          return <HelpCircle size={size} style={{ color: VERDICT_COLORS.Uncertain.text }} />;
  }
}

function ClaimCard({ claim }: { claim: StoredClaimResult }) {
  const colors = VERDICT_COLORS[claim.verdict] ?? VERDICT_COLORS.Uncertain;
  const deviationPct = Math.round((claim.factDeviationScore ?? 0) * 100);

  return (
    <div className="claim-card">
      <div className="claim-header">
        <span className="verdict-badge" style={{ color: colors.text, background: colors.bg }}>
          <VerdictIcon verdict={claim.verdict} />
          {claim.verdict}
        </span>
        <span className="claim-time">
          {new Date(claim.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <p className="claim-text">"{claim.claim}"</p>
      <p className="claim-fact">{claim.fact}</p>

      <div className="claim-footer">
        <div className="deviation-row">
          <span className="deviation-label">Fact deviation</span>
          <div className="deviation-bar-wrap">
            <div
              className="deviation-bar"
              style={{
                width: `${deviationPct}%`,
                background: deviationPct < 30 ? "#4ade80" : deviationPct < 60 ? "#facc15" : "#f87171",
              }}
            />
          </div>
          <span className="deviation-pct">{deviationPct}%</span>
        </div>

        {claim.source && (
          <div className="claim-source">
            {claim.sourceUrl ? (
              <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer">
                {claim.source} <ExternalLink size={10} />
              </a>
            ) : (
              <span>{claim.source}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Popup Root Component ─────────────────────────────────────────────────────

function Popup() {
  const [history, setHistory] = useState<StoredClaimResult[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [historyRes, settingsRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: "VERDICT_HISTORY_GET" }),
      chrome.runtime.sendMessage({ type: "VERDICT_SETTINGS_GET" }),
    ]);
    setHistory(historyRes?.payload ?? []);
    setSettings(settingsRes?.payload ?? DEFAULT_SETTINGS);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleEnabled = async () => {
    const next = !settings.enabled;
    await chrome.runtime.sendMessage({
      type: "VERDICT_SETTINGS_SET",
      payload: { enabled: next },
    });
    setSettings((s) => ({ ...s, enabled: next }));
  };

  const clearHistory = async () => {
    await chrome.runtime.sendMessage({ type: "VERDICT_CLEAR_HISTORY" });
    setHistory([]);
  };

  return (
    <div className="popup-root">
      {/* Header */}
      <header className="popup-header">
        <div className="popup-logo">
          <Gavel size={18} />
          <span>Verdict</span>
        </div>
        <div className="popup-header-actions">
          <button
            id="toggle-enabled"
            className={`power-btn ${settings.enabled ? "active" : ""}`}
            onClick={toggleEnabled}
            aria-label={settings.enabled ? "Disable Verdict" : "Enable Verdict"}
            title={settings.enabled ? "Disable" : "Enable"}
          >
            <Power size={16} />
          </button>
          <button
            id="open-options"
            className="icon-btn"
            onClick={() => chrome.runtime.openOptionsPage()}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Status Banner */}
      {!settings.enabled && (
        <div className="status-banner disabled" role="alert">
          Verdict is disabled — click the power button to enable.
        </div>
      )}

      {/* History */}
      <main className="popup-body">
        <div className="section-header">
          <span>Recent Fact-Checks</span>
          {history.length > 0 && (
            <button id="clear-history" className="text-btn" onClick={clearHistory} aria-label="Clear all history">
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" role="status" aria-label="Loading" />
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state" role="status">
            <Gavel size={32} style={{ opacity: 0.2 }} />
            <p>No fact-checks yet.</p>
            <p className="empty-sub">
              Highlight text on any page and right-click → <strong>Fact Check with Verdict</strong>
            </p>
          </div>
        ) : (
          <ul className="claim-list" role="list">
            {history.slice(0, 20).map((c) => (
              <li key={c.id} role="listitem">
                <ClaimCard claim={c} />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Footer */}
      <footer className="popup-footer">
        <span>{history.length} check{history.length !== 1 ? "s" : ""} recorded</span>
        <span>Verdict v1.0</span>
      </footer>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
