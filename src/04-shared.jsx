import React from "react";

const { useState, useEffect, useRef } = React;

/* ============ SHARED ============ */
function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

function ProgressBar({ value, tone }) {
  const t = tone || "neutral";
  const pal = {
    neutral: "var(--ink)",
    accent: "var(--accent)",
    good: "var(--good)",
    warn: "var(--warn)",
    crit: "var(--crit)",
  };
  return (
    <div style={{
      height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${Math.max(0, Math.min(100, value))}%`,
        background: pal[t], transition: "width .9s cubic-bezier(.2,.8,.2,1)",
        borderRadius: 999,
      }}/>
    </div>
  );
}

function StepBar({ steps, current, t }) {
  return (
    <div className="step-bar">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <span className={"dot" + (i === current ? " active" : i < current ? " done" : "")}/>
          {i === current && <span className="step-label">{t(s.labelKey)}</span>}
        </React.Fragment>
      ))}
      <span className="step-count">{current + 1} / {steps.length}</span>
    </div>
  );
}

/* ============ WELCOME ============ */
function Welcome({ t, onStart, onAnalog, shopUrl }) {
  return (
    <div className="stage fade-in" style={{ alignItems: "stretch" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 64, alignItems: "center",
        marginTop: 32,
      }} className="welcome-grid">
        <div className="col" style={{ gap: 26 }}>
          <Eyebrow>{t("welcomeEyebrow")}</Eyebrow>
          <h1>{t("welcomeTitle")}</h1>
          <p className="lede">{t("welcomeLede")}</p>
          <div className="row" style={{ marginTop: 8, gap: 12 }}>
            <button className="btn btn-primary btn-lg" onClick={onStart}>
              {t("welcomeStart")}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <a className="btn btn-ghost btn-lg" href={shopUrl} target="_blank" rel="noreferrer">
              {t("shopLink")}
            </a>
          </div>
          <button
            onClick={onAnalog}
            style={{
              marginTop: 18, alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "10px 18px", borderRadius: 999,
              background: "var(--accent-soft)", color: "var(--accent-ink)",
              border: "1px solid color-mix(in oklch, var(--accent) 22%, var(--line))",
              fontSize: 13, fontWeight: 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="2" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9 6h2v6H5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("findAnalog")}
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-4)" }}>
            {t("welcomeNote")}
          </div>
        </div>
        <div>
          <WelcomeArt t={t}/>
        </div>
      </div>

      <div style={{ marginTop: 96, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="features-grid">
        <FeatureCard n="01" title={t("feat1Title")} desc={t("feat1Desc")} icon="lens"/>
        <FeatureCard n="02" title={t("feat2Title")} desc={t("feat2Desc")} icon="list"/>
        <FeatureCard n="03" title={t("feat3Title")} desc={t("feat3Desc")} icon="leaf"/>
      </div>

    </div>
  );
}

function FeatureCard({ n, title, desc, icon }) {
  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: ".1em",
      }}>{n}</div>
      <FeatureIcon kind={icon}/>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 14, letterSpacing: "-0.01em" }}>{title}</div>
      <p style={{ color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5, fontSize: 14 }}>{desc}</p>
    </div>
  );
}

function FeatureIcon({ kind }) {
  const stroke = "var(--ink)";
  if (kind === "lens") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginTop: 18 }}>
      <circle cx="17" cy="17" r="11" stroke={stroke} strokeWidth="1.4"/>
      <circle cx="17" cy="17" r="5" stroke="var(--accent)" strokeWidth="1.4"/>
      <path d="m25.5 25.5 8 8" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (kind === "list") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginTop: 18 }}>
      <rect x="6" y="9" width="28" height="22" rx="3" stroke={stroke} strokeWidth="1.4"/>
      <path d="M11 16h12M11 21h18M11 26h8" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="29" cy="26" r="2.5" fill="var(--accent)"/>
    </svg>
  );
  if (kind === "leaf") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginTop: 18 }}>
      <path d="M8 32C8 18 18 8 32 8c0 14-10 24-24 24Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 32 24 16" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  return null;
}

function WelcomeArt({ t }) {
  // a calm illustrative composition: gradient circle, scan rings, softly drawn face silhouette
  return (
    <div style={{
      position: "relative", aspectRatio: "1/1", maxWidth: 520, marginInline: "auto",
      borderRadius: "var(--r-xl)",
      background: "linear-gradient(160deg, var(--surface) 0%, var(--accent-soft) 100%)",
      overflow: "hidden", border: "1px solid var(--line)",
    }}>
      <svg viewBox="0 0 400 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity=".7"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="silhouette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink)" stopOpacity=".95"/>
            <stop offset="100%" stopColor="var(--ink)" stopOpacity=".75"/>
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="170" fill="url(#halo)"/>
        {/* concentric scan rings */}
        {[80, 120, 160].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--ink)" strokeOpacity=".18" strokeWidth="1" strokeDasharray={i === 1 ? "4 6" : i === 2 ? "1 4" : ""}/>
        ))}
        {/* face silhouette - simple oval + neck */}
        <g transform="translate(200, 215)">
          <ellipse rx="84" ry="100" fill="url(#silhouette)"/>
          <path d="M-46 95 Q-46 130 0 130 Q46 130 46 95" fill="var(--ink)"/>
        </g>
        {/* scan markers */}
        <g>
          {[
            [148, 168],
            [252, 172],
            [200, 210],
            [170, 246],
            [232, 246],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="var(--accent)" opacity={0.85}>
                <animate attributeName="r" values="6;10;6" dur="2.4s" begin={`${i*0.4}s`} repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".85;0.3;.85" dur="2.4s" begin={`${i*0.4}s`} repeatCount="indefinite"/>
              </circle>
              <circle cx={x} cy={y} r="2.5" fill="white"/>
            </g>
          ))}
        </g>
        {/* corner caption labels */}
        <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink)" opacity=".6" letterSpacing="1.5">
          <text x="22" y="32">SCAN · 01</text>
          <text x="305" y="32">RGB / TX</text>
          <text x="22" y="378">HYDR · 64%</text>
          <text x="298" y="378">SEBUM · 52%</text>
        </g>
      </svg>
    </div>
  );
}

window.Welcome = Welcome;
window.StepBar = StepBar;
window.Eyebrow = Eyebrow;
window.ProgressBar = ProgressBar;

