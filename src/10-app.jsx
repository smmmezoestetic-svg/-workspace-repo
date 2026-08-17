import React from "react";
import { getConfig } from "./config.js";
import { scrollToTop } from "./embed-host.js";

const { useState, useEffect, useMemo } = React;

const ACCENT_PRESETS = {
  rose:    { l: 0.68, c: 0.12, h: 35,  ink: { l: .42, h: 35 } },
  sage:    { l: 0.66, c: 0.08, h: 145, ink: { l: .38, h: 145 } },
  graphite:{ l: 0.45, c: 0.02, h: 260, ink: { l: .25, h: 260 } },
  amber:   { l: 0.74, c: 0.13, h: 70,  ink: { l: .42, h: 70 } },
  blush:   { l: 0.78, c: 0.06, h: 15,  ink: { l: .45, h: 15 } },
};

function applyAccent(name) {
  const a = ACCENT_PRESETS[name] || ACCENT_PRESETS.rose;
  const r = document.documentElement.style;
  r.setProperty("--accent",     `oklch(${a.l} ${a.c} ${a.h})`);
  r.setProperty("--accent-ink", `oklch(${a.ink.l} ${a.c} ${a.ink.h})`);
  r.setProperty("--accent-soft",`oklch(0.94 ${Math.min(a.c, .04)} ${a.h})`);
  r.setProperty("--accent-glow",`oklch(${a.l} ${a.c} ${a.h} / 0.18)`);
}

function App() {
  const cfg = getConfig();
  const lang = cfg.lang;
  const t = (key) => (window.__I18N[lang] || window.__I18N.ru)[key] || key;
  t._lang = lang;

  const [step, setStep] = useState("welcome");
  const [photo, setPhoto] = useState(null);
  const [profile, setProfile] = useState({ age: 32, sex: "f", concerns: {}, lifestyle: {}, sleep: 7 });
  const [goals, setGoals] = useState({ hydration: true });
  const [cart, setCart] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const SHOP_URL = cfg.shopUrl;

  useEffect(() => {
    document.documentElement.style.setProperty("--fs", String(cfg.fontScale));
  }, [cfg.fontScale]);

  useEffect(() => { applyAccent(cfg.accent); }, [cfg.accent]);

  const widget = cfg.embed === "widget";

  const stepKeys = [
    { key: "welcome",  labelKey: "stepWelcome" },
    { key: "photo",    labelKey: "stepPhoto" },
    { key: "profile",  labelKey: "stepProfile" },
    { key: "goals",    labelKey: "stepGoals" },
    { key: "scan",     labelKey: "stepScan" },
    { key: "result",   labelKey: "stepResult" },
  ];
  const currentStepIdx = stepKeys.findIndex(s => s.key === step);

  const typeKey = useMemo(() => {
    return window.determineSkinType({ ...profile, demoType: cfg.demoType });
  }, [profile, cfg.demoType, step]);

  const go = (s) => { scrollToTop(); setStep(s); };

  return (
    <div className={"app" + (widget ? " app--widget" : "")}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">m</div>
          <div>
            <div className="brand-name">{t("appName")}</div>
            <div className="brand-tag">{t("appTag")}</div>
          </div>
        </div>
        {!widget && step !== "welcome" && step !== "scan" && (
          <a href={SHOP_URL} target="_blank" rel="noreferrer" className="shop-link">
            {t("shopLink")}
            <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 2h7v7M2 9l7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </a>
        )}
      </header>

      {step !== "welcome" && step !== "scan" && (
        <window.StepBar steps={stepKeys} current={currentStepIdx} t={t}/>
      )}

      {step === "welcome" && <window.Welcome t={t} onStart={() => go("photo")} onAnalog={() => go("analog")} shopUrl={SHOP_URL}/>}
      {step === "analog" && (
        <window.AnalogStep t={t} lang={lang} onBack={() => go("welcome")} shopUrl={SHOP_URL}/>
      )}
      {step === "photo" && (
        <window.PhotoStep t={t} photo={photo} setPhoto={setPhoto}
          onNext={() => go("profile")} onBack={() => go("welcome")}/>
      )}
      {step === "profile" && (
        <window.ProfileStep t={t} profile={profile} setProfile={setProfile}
          onNext={() => go("goals")} onBack={() => go("photo")}/>
      )}
      {step === "goals" && (
        <window.GoalsStep t={t} goals={goals} setGoals={setGoals}
          onNext={() => go("scan")} onBack={() => go("profile")}/>
      )}
      {step === "scan" && (
        <window.ScanStep t={t} photo={photo} profile={profile} lang={lang} onDone={(result) => {
          setAnalysis(result);
          const r = window.buildRoutine(typeKey, goals, 999999);
          const ids = [];
          [...r.am, ...r.pm].forEach(p => { if (!ids.includes(p.id) && ids.length < 6) ids.push(p.id); });
          setCart(ids);
          go("result");
        }}/>
      )}
      {step === "result" && (
        <window.ResultStep t={t} lang={lang} profile={profile} photo={photo}
          typeKey={typeKey} goals={goals} analysis={analysis}
          cart={cart} setCart={setCart}
          onRestart={() => { setPhoto(null); setCart([]); setAnalysis(null); go("welcome"); }}
          shopUrl={SHOP_URL}/>
      )}
    </div>
  );
}

export default App;
