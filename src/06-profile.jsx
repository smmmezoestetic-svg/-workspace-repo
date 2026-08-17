import React from "react";

const { useState } = React;

/* ============ PROFILE STEP ============ */
function ProfileStep({ t, onNext, onBack, profile, setProfile }) {
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  const toggleC = (k) => set("concerns", { ...(profile.concerns || {}), [k]: !profile.concerns?.[k] });
  const toggleL = (k) => set("lifestyle", { ...(profile.lifestyle || {}), [k]: !profile.lifestyle?.[k] });

  const concerns = [
    { k: "shine",       l: { ru: "Жирный блеск",     en: "Oily shine" } },
    { k: "dryness",     l: { ru: "Сухость",          en: "Dryness" } },
    { k: "tightness",   l: { ru: "Стянутость",       en: "Tightness" } },
    { k: "pores",       l: { ru: "Расширенные поры", en: "Enlarged pores" } },
    { k: "blackheads",  l: { ru: "Чёрные точки",     en: "Blackheads" } },
    { k: "acne",        l: { ru: "Высыпания",        en: "Breakouts" } },
    { k: "couperose",   l: { ru: "Купероз",          en: "Couperose" } },
    { k: "redness",     l: { ru: "Покраснения",      en: "Redness" } },
    { k: "wrinkles",    l: { ru: "Морщины",          en: "Wrinkles" } },
    { k: "pigment",     l: { ru: "Пигментация",      en: "Pigmentation" } },
    { k: "darkCircles", l: { ru: "Тёмные круги",     en: "Dark circles" } },
    { k: "sensitivity", l: { ru: "Чувствительность", en: "Sensitivity" } },
  ];

  const ls = [
    { k: "city",   l: t("ls1") },
    { k: "sport",  l: t("ls2") },
    { k: "sun",    l: t("ls3") },
    { k: "fly",    l: t("ls4") },
    { k: "smoke",  l: t("ls5") },
    { k: "sleep",  l: t("ls6") },
  ];

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch", maxWidth: 980 }}>
      <div className="col" style={{ gap: 12, marginBottom: 36 }}>
        <Eyebrow>{t("stepProfile")} · 02 / 04</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("profileTitle")}</h1>
        <p className="lede">{t("profileLede")}</p>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px 40px", alignItems: "start" }} className="profile-grid">
          {/* Age */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("age")}</div>
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <input type="range" min="14" max="75" value={profile.age || 32} onChange={e => set("age", +e.target.value)}
              style={{ flex: 1, maxWidth: 360, accentColor: "var(--accent)" }}/>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 28, minWidth: 60, textAlign: "right",
            }}>{profile.age || 32}</div>
            <span style={{ color: "var(--ink-4)", fontSize: 13 }}>{t("yearsOld")}</span>
          </div>

          {/* Sex */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("sex")}</div>
          <div className="row">
            {[["f", t("sexF")], ["m", t("sexM")], ["x", t("sexX")]].map(([k, l]) => (
              <button key={k} className={"chip" + (profile.sex === k ? " selected" : "")} onClick={() => set("sex", k)}>{l}</button>
            ))}
          </div>

          {/* Concerns */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("egConcerns")}</div>
          <div className="row" style={{ gap: 8 }}>
            {concerns.map(c => (
              <button key={c.k}
                className={"chip accent" + (profile.concerns?.[c.k] ? " selected" : "")}
                onClick={() => toggleC(c.k)}
              >{c.l[t._lang] || c.l.ru}</button>
            ))}
          </div>

          {/* Lifestyle */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("lifestyle")}</div>
          <div className="row" style={{ gap: 8 }}>
            {ls.map(item => (
              <button key={item.k}
                className={"chip" + (profile.lifestyle?.[item.k] ? " selected" : "")}
                onClick={() => toggleL(item.k)}
              >{item.l}</button>
            ))}
          </div>

          {/* Sleep */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("sleepHours")}</div>
          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            <input type="range" min="3" max="12" step="0.5" value={profile.sleep || 7}
              onChange={e => set("sleep", +e.target.value)}
              style={{ flex: 1, maxWidth: 280, accentColor: "var(--accent)" }}/>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, minWidth: 50, textAlign: "right" }}>{profile.sleep || 7}h</div>
          </div>

          {/* Pregnancy */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("pregnancy")}</div>
          <div className="row">
            {[[true, t("yes")], [false, t("no")]].map(([k, l]) => (
              <button key={String(k)} className={"chip" + (profile.preg === k ? " selected" : "")} onClick={() => set("preg", k)}>{l}</button>
            ))}
          </div>

          {/* Allergies */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("allergies")}</div>
          <textarea className="textarea" placeholder={t("allergiesPlaceholder")}
            value={profile.allergies || ""} onChange={e => set("allergies", e.target.value)}
            style={{ maxWidth: 560 }}/>

          {/* Past use */}
          <div style={{ fontWeight: 500, paddingTop: 8 }}>{t("pastUse")}</div>
          <textarea className="textarea" placeholder={t("pastUsePlaceholder")}
            value={profile.past || ""} onChange={e => set("past", e.target.value)}
            style={{ maxWidth: 560 }}/>
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>{t("next")}</button>
      </div>
    </div>
  );
}

/* ============ GOALS STEP ============ */
function GoalsStep({ t, onNext, onBack, goals, setGoals }) {
  const items = [
    { k: "hydration", title: t("g_hydration"), desc: t("g_hydrationDesc"), icon: "drop" },
    { k: "antiage",   title: t("g_antiage"),   desc: t("g_antiageDesc"),   icon: "clock" },
    { k: "pigment",   title: t("g_pigment"),   desc: t("g_pigmentDesc"),   icon: "sun" },
    { k: "acne",      title: t("g_acne"),      desc: t("g_acneDesc"),      icon: "zap" },
    { k: "pores",     title: t("g_pores"),     desc: t("g_poresDesc"),     icon: "grid" },
    { k: "redness",   title: t("g_redness"),   desc: t("g_rednessDesc"),   icon: "leaf" },
    { k: "glow",      title: t("g_glow"),      desc: t("g_glowDesc"),      icon: "spark" },
    { k: "eyes",      title: t("g_eyes"),      desc: t("g_eyesDesc"),      icon: "eye" },
  ];
  const toggle = (k) => setGoals({ ...goals, [k]: !goals[k] });
  const count = Object.values(goals || {}).filter(Boolean).length;

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch", maxWidth: 980 }}>
      <div className="col" style={{ gap: 12, marginBottom: 36 }}>
        <Eyebrow>{t("stepGoals")} · 03 / 04</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("goalsTitle")}</h1>
        <p className="lede">{t("goalsLede")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="goals-grid">
        {items.map(g => {
          const sel = !!goals[g.k];
          return (
            <button key={g.k} onClick={() => toggle(g.k)} style={{
              textAlign: "left", padding: 22, borderRadius: "var(--r-lg)",
              border: sel ? "1.5px solid var(--accent)" : "1px solid var(--line)",
              background: sel ? "var(--accent-soft)" : "var(--bg-elev)",
              transition: "all .2s ease", position: "relative",
            }}>
              <GoalIcon kind={g.icon} active={sel}/>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, marginTop: 18, letterSpacing: "-0.01em" }}>{g.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.4 }}>{g.desc}</div>
              {sel && <div style={{
                position: "absolute", top: 16, right: 16, width: 22, height: 22, borderRadius: "50%",
                background: "var(--accent)", display: "grid", placeItems: "center",
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11"><path d="m2 5.5 2 2 5-5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 36, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn btn-ghost" onClick={onBack}>{t("back")}</button>
        <div style={{ color: "var(--ink-4)", fontSize: 13 }}>
          {count > 0 ? `${count} / 4` : t("requiredHint")}
        </div>
        <button className="btn btn-primary" disabled={count === 0} onClick={onNext}>{t("next")}</button>
      </div>
    </div>
  );
}

function GoalIcon({ kind, active }) {
  const c = active ? "var(--accent-ink)" : "var(--ink)";
  const set = {
    drop:  <path d="M14 4 C20 12 22 16 22 20 a8 8 0 0 1-16 0 C6 16 8 12 14 4 Z" stroke={c} strokeWidth="1.4" fill="none"/>,
    clock: <><circle cx="14" cy="14" r="9" stroke={c} strokeWidth="1.4" fill="none"/><path d="M14 8v6l4 2" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"/></>,
    sun:   <><circle cx="14" cy="14" r="4" stroke={c} strokeWidth="1.4" fill="none"/>{[0,45,90,135,180,225,270,315].map(a => <line key={a} x1={14+Math.cos(a*Math.PI/180)*7} y1={14+Math.sin(a*Math.PI/180)*7} x2={14+Math.cos(a*Math.PI/180)*10} y2={14+Math.sin(a*Math.PI/180)*10} stroke={c} strokeWidth="1.4" strokeLinecap="round"/>)}</>,
    zap:   <path d="M16 4 L7 16 h6 l-2 8 9-12 h-6 z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round"/>,
    grid:  <><circle cx="9" cy="9" r="1.6" fill={c}/><circle cx="14" cy="9" r="1.6" fill={c}/><circle cx="19" cy="9" r="1.6" fill={c}/><circle cx="9" cy="14" r="1.6" fill={c}/><circle cx="14" cy="14" r="1.6" fill={c}/><circle cx="19" cy="14" r="1.6" fill={c}/><circle cx="9" cy="19" r="1.6" fill={c}/><circle cx="14" cy="19" r="1.6" fill={c}/><circle cx="19" cy="19" r="1.6" fill={c}/></>,
    leaf:  <><path d="M6 22 C6 12 12 6 22 6 c0 10-6 16-16 16Z" stroke={c} strokeWidth="1.4" fill="none"/><path d="M6 22 16 12" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></>,
    spark: <><path d="M14 4 v6 m0 8 v6 m-10-10 h6 m8 0 h6 M7.5 7.5 l4 4 m5 5 l4 4 m0-13 l-4 4 m-5 5 l-4 4" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></>,
    eye:   <><path d="M3 14 C7 7 14 7 14 7 s7 0 11 7 c-4 7-11 7-11 7 s-7 0-11-7Z" stroke={c} strokeWidth="1.4" fill="none"/><circle cx="14" cy="14" r="3" stroke={c} strokeWidth="1.4" fill="none"/></>,
  };
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none">{set[kind]}</svg>;
}

/* ============ BUDGET STEP ============ */
function BudgetStep({ t, onAnalyze, onBack, budget, setBudget, lang }) {
  const opts = [
    { k: 4000,  title: t("bSmall"),  desc: t("bSmallDesc") },
    { k: 8000,  title: t("bMedium"), desc: t("bMediumDesc") },
    { k: 14000, title: t("bLarge"),  desc: t("bLargeDesc") },
  ];
  const fmt = (n) => lang === "ru" ? `${n.toLocaleString("ru-RU")} ₽` : `${n.toLocaleString("en-US")} ₽`;

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch", maxWidth: 900 }}>
      <div className="col" style={{ gap: 12, marginBottom: 36 }}>
        <Eyebrow>{t("stepBudget")} · 04 / 04</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("budgetTitle")}</h1>
        <p className="lede">{t("budgetLede")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} className="budget-grid">
        {opts.map(o => {
          const sel = budget === o.k;
          return (
            <button key={o.k} onClick={() => setBudget(o.k)} style={{
              textAlign: "left", padding: 28, borderRadius: "var(--r-lg)",
              border: sel ? "1.5px solid var(--accent)" : "1px solid var(--line)",
              background: sel ? "var(--accent-soft)" : "var(--bg-elev)",
              transition: "all .2s ease",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "-0.02em" }}>{fmt(o.k)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2, letterSpacing: ".06em", textTransform: "uppercase" }}>{t("perMonth")}</div>
              <div style={{ fontWeight: 500, marginTop: 16, fontSize: 16 }}>{o.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>{o.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div style={{ fontWeight: 500 }}>{t("bCustom")}</div>
            <div style={{ fontSize: 13, color: "var(--ink-4)" }}>{fmt(budget)} {t("perMonth")}</div>
          </div>
          <input type="range" min="2000" max="25000" step="500" value={budget} onChange={e => setBudget(+e.target.value)}
            style={{ flex: 1, maxWidth: 480, accentColor: "var(--accent)" }}/>
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack}>{t("back")}</button>
        <button className="btn btn-accent btn-lg" onClick={onAnalyze}>
          {t("analyze")}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

window.ProfileStep = ProfileStep;
window.GoalsStep = GoalsStep;
window.BudgetStep = BudgetStep;

