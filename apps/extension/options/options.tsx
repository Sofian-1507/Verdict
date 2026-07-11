import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Gavel, Save, RotateCcw } from "lucide-react";
import type { ExtensionSettings } from "@verdict/shared-types";
import { DEFAULT_SETTINGS } from "@verdict/shared-types";
import "./options.css";

function Toggle({
  id, checked, onChange, label, description,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string;
}) {
  return (
    <label className="toggle-row" htmlFor={id}>
      <div className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </div>
      <div
        id={id}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        className={`toggle-switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => e.key === " " || e.key === "Enter" ? onChange(!checked) : undefined}
      >
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "VERDICT_SETTINGS_GET" }).then((res) => {
      if (res?.payload) setSettings(res.payload);
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    await chrome.runtime.sendMessage({ type: "VERDICT_SETTINGS_SET", payload: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = async () => {
    setSettings(DEFAULT_SETTINGS);
    await chrome.runtime.sendMessage({ type: "VERDICT_SETTINGS_SET", payload: DEFAULT_SETTINGS });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="options-root">
      <header className="options-header">
        <div className="options-logo"><Gavel size={22} /><span>Verdict Settings</span></div>
        <p className="options-subtitle">Configure your AI-powered fact-checking assistant</p>
      </header>

      <main className="options-body">
        <section className="options-section">
          <h2 className="section-title">General</h2>
          <div className="settings-card">
            <Toggle id="toggle-enabled" checked={settings.enabled} onChange={(v) => set("enabled", v)}
              label="Enable Verdict" description="Master on/off switch for the extension." />
            <Toggle id="toggle-auto" checked={settings.autoDetect} onChange={(v) => set("autoDetect", v)}
              label="Auto-detect claims" description="Automatically scan page content and YouTube captions." />
            <Toggle id="toggle-overlay" checked={settings.showOverlay} onChange={(v) => set("showOverlay", v)}
              label="Show floating overlay" description="Display verdict cards in the bottom-right corner of pages." />
            <Toggle id="toggle-youtube" checked={settings.youtubeEnabled} onChange={(v) => set("youtubeEnabled", v)}
              label="YouTube caption scanning" description="Automatically fact-check claims from video captions." />
          </div>
        </section>

        <section className="options-section">
          <h2 className="section-title">AI & Detection</h2>
          <div className="settings-card">
            <div className="field-row">
              <label className="field-label" htmlFor="min-confidence">Minimum confidence to flag</label>
              <select
                id="min-confidence"
                className="field-select"
                value={settings.minConfidence}
                onChange={(e) => set("minConfidence", e.target.value as ExtensionSettings["minConfidence"])}
              >
                <option value="high">High only</option>
                <option value="medium">Medium and above</option>
                <option value="low">All claims</option>
              </select>
            </div>
          </div>
        </section>

        <section className="options-section">
          <h2 className="section-title">Appearance</h2>
          <div className="settings-card">
            <div className="field-row">
              <label className="field-label" htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                className="field-select"
                value={settings.theme}
                onChange={(e) => set("theme", e.target.value as ExtensionSettings["theme"])}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">Follow system</option>
              </select>
            </div>
          </div>
        </section>

        <section className="options-section">
          <h2 className="section-title">API Configuration</h2>
          <div className="settings-card">
            <div className="field-row stacked">
              <label className="field-label" htmlFor="api-url">Backend API URL</label>
              <input
                id="api-url"
                type="url"
                className="field-input"
                value={settings.apiUrl}
                onChange={(e) => set("apiUrl", e.target.value)}
                placeholder="http://localhost:3001"
              />
              <span className="field-hint">The Verdict API server URL. Default: http://localhost:3001</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="options-footer">
        <button id="reset-settings" className="btn-secondary" onClick={reset}>
          <RotateCcw size={14} /> Reset to defaults
        </button>
        <button id="save-settings" className="btn-primary" onClick={save}>
          <Save size={14} />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </footer>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
