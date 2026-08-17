import React from "react";

const { useState, useMemo } = React;

/* ============ RESULT ============ */
function ResultStep({ t, lang, profile, photo, typeKey, goals, analysis, cart, setCart, onRestart, shopUrl }) {
  const [tab, setTab] = useState("map");
  const skinType = window.__SKIN_TYPES[typeKey];
  const baseProblems = window.__PROBLEM_MAP[typeKey] || [];
  // Merge in vision findings (if any) as additional problems
  const problems = useMemo(() => {
    if (!analysis?.vision?.findings?.length) return baseProblems;
    const ZONES = window.__FACE_ZONES;
    const extra = analysis.vision.findings
      .filter(f => ZONES[f.zone])
      .map(f => ({
        zone: f.zone,
        label: { ru: f.label, en: f.label },
        severity: Math.max(1, Math.min(5, f.severity || 3)),
        comment: f.comment,
        fromVision: true,
      }));
    // dedupe by zone+label
    const seen = new Set(baseProblems.map(p => p.zone + "|" + (p.label.ru || p.label.en)));
    const merged = [...baseProblems];
    for (const e of extra) {
      const key = e.zone + "|" + e.label.ru;
      if (!seen.has(key)) { merged.push(e); seen.add(key); }
    }
    return merged;
  }, [baseProblems, analysis]);
  const routine = useMemo(() => window.buildRoutine(typeKey, goals || {}, 999999), [typeKey, goals]);
  const procedures = window.__PROCEDURES.filter(p => p.types.includes(typeKey));

  const allProducts = useMemo(() => {
    const ids = new Set();
    const arr = [];
    [...routine.am, ...routine.pm, ...routine.weekly].forEach(p => {
      if (!ids.has(p.id)) { ids.add(p.id); arr.push(p); }
    });
    return arr;
  }, [routine]);

  const inCart = (id) => cart.includes(id);
  const toggleCart = (id) => setCart(inCart(id) ? cart.filter(x => x !== id) : [...cart, id]);

  const totalPrice = useMemo(() => allProducts.filter(p => cart.includes(p.id)).reduce((s, p) => s + p.price, 0), [cart, allProducts]);

  const tabs = [
    { k: "map",      l: t("tabMap") },
    { k: "routine",  l: t("tabRoutine") },
    { k: "products", l: t("tabProducts") },
    { k: "pro",      l: t("tabPro") },
    { k: "summary",  l: t("tabSummary") },
  ];

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch", maxWidth: 1240 }}>
      <ResultHeader t={t} lang={lang} skinType={skinType} profile={profile} photo={photo} typeKey={typeKey} analysis={analysis}/>
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 36, paddingTop: 14, display: "flex", gap: 4, overflowX: "auto" }}>
        {tabs.map(x => (
          <button key={x.k} onClick={() => setTab(x.k)} style={{
            padding: "12px 18px", borderRadius: "var(--r-pill)", whiteSpace: "nowrap",
            background: tab === x.k ? "var(--ink)" : "transparent",
            color: tab === x.k ? "var(--bg-elev)" : "var(--ink-3)",
            fontWeight: 500, fontSize: 14,
          }}>{x.l}</button>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        {tab === "map"      && <ProblemMap t={t} lang={lang} typeKey={typeKey} problems={problems} photo={photo} analysis={analysis}/>}
        {tab === "routine"  && <RoutineView t={t} lang={lang} routine={routine}/>}
        {tab === "products" && <ProductsView t={t} lang={lang} products={allProducts} cart={cart} toggleCart={toggleCart}/>}
        {tab === "pro"      && <ProView t={t} lang={lang} procedures={procedures}/>}
        {tab === "summary"  && <SummaryView t={t} lang={lang} routine={routine} cart={cart} totalPrice={totalPrice} setCart={setCart} allProducts={allProducts} shopUrl={shopUrl} onRestart={onRestart}/>}
      </div>
    </div>
  );
}

/* ============ HEADER ============ */
function ResultHeader({ t, lang, skinType, profile, photo, typeKey, analysis }) {
  const baseMetrics = skinType.metrics;
  // Blend vision metrics into baseline where available
  const metrics = useMemo(() => {
    const m = { ...baseMetrics };
    const real = analysis?.metrics;
    if (!real) return m;
    // Map raw zone signals → user-facing metrics (50/50 blend)
    if (real.shine != null) m.oil = Math.round((m.oil + real.shine) / 2);
    if (real.redness != null) m.sensitivity = Math.round((m.sensitivity + Math.max(real.redness, m.sensitivity * .7)) / 2);
    if (real.evenness != null) m.evenness = Math.round((m.evenness + real.evenness) / 2);
    if (real.texture != null) m.pores = Math.round((m.pores + real.texture) / 2);
    return m;
  }, [baseMetrics, analysis]);

  const m_keys = ["hydration", "oil", "sensitivity", "pigment", "pores", "elasticity", "evenness"];
  const labels = { hydration: t("m_hydration"), oil: t("m_oil"), sensitivity: t("m_sensitivity"),
    pigment: t("m_pigment"), pores: t("m_pores"), elasticity: t("m_elasticity"), evenness: t("m_evenness") };
  const tone = (k, v) => {
    if (k === "elasticity" || k === "evenness" || k === "hydration") {
      if (v < 40) return "crit"; if (v < 60) return "warn"; return "good";
    }
    if (k === "sensitivity" || k === "pigment" || k === "oil" || k === "pores") {
      if (v > 70) return "crit"; if (v > 50) return "warn"; return "good";
    }
    return "neutral";
  };

  const skinAge = (profile.age || 32) + (
    typeKey === "mature" ? 4 : typeKey === "dry" ? 2 : typeKey === "sensitive" ? 1 :
    typeKey === "normal" ? -2 : 0
  );

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <Eyebrow>{t("resultBased")}</Eyebrow>
          <h1 style={{ fontSize: "clamp(34px, 4vw, 52px)", marginTop: 10 }}>{t("resultTitle")}</h1>
        </div>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--ink-4)", letterSpacing: ".06em", textTransform: "uppercase" }}>{t("confidence")}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, marginTop: 2 }}>{analysis?.confidence ?? 60}%</div>
            {analysis?.source && analysis.source !== "fallback" && (
              <div style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                {analysis.source}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1.2fr 1fr", gap: 28, alignItems: "stretch" }} className="result-hero">
        {/* Photo */}
        <div style={{
          width: 220, height: 220, borderRadius: "var(--r-lg)", overflow: "hidden",
          background: "var(--ink)", border: "1px solid var(--line)", flexShrink: 0,
        }}>
          {photo?.src ? <img src={photo.src} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <DemoPhotoSVG/>}
        </div>

        {/* Type card */}
        <div className="card" style={{
          background: "var(--ink)", color: "var(--bg-elev)",
          borderColor: "var(--ink)", padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>{t("typeBlock")}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 38, marginTop: 8, letterSpacing: "-0.02em" }}>{t(skinType.labelKey)}</div>
            <p style={{ color: "rgba(255,255,255,.7)", marginTop: 12, lineHeight: 1.55, fontSize: 14 }}>{t(skinType.descKey)}</p>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.12)" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>{t("skinAge")}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 4 }}>{skinAge} {t("yearsShort")}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>{t("age")}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 4 }}>{profile.age || 32} {t("yearsShort")}</div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>{t("metricsTitle")}</div>
          <div className="col" style={{ gap: 11 }}>
            {m_keys.map(k => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--ink-2)" }}>{labels[k]}</span>
                  <span style={{ color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>{metrics[k]}%</span>
                </div>
                <ProgressBar value={metrics[k]} tone={tone(k, metrics[k])}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ PROBLEM MAP ============ */
function ProblemMap({ t, lang, typeKey, problems, photo, analysis }) {
  const [hover, setHover] = useState(null);
  const ZONES = window.__FACE_ZONES;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="map-grid">
      <div>
        <h2>{t("mapTitle")}</h2>
        <p className="lede" style={{ fontSize: 15, marginTop: 8 }}>{t("mapLede")}</p>

        {analysis?.vision?.summary && (
          <div style={{
            marginTop: 18, padding: "14px 16px", borderRadius: "var(--r-md)",
            background: "var(--accent-soft)", border: "1px solid var(--line-2)",
            fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em",
              textTransform: "uppercase", color: "var(--accent-ink)", marginBottom: 6 }}>AI · Vision</div>
            {analysis.vision.summary}
          </div>
        )}

        <div className="col" style={{ gap: 8, marginTop: 20 }}>
          {problems.map((p, i) => {
            const sev = p.severity;
            const sevColor = sev >= 4 ? "var(--crit)" : sev >= 3 ? "var(--warn)" : "var(--good)";
            return (
              <div key={i} onMouseEnter={() => setHover(p.zone)} onMouseLeave={() => setHover(null)} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
                padding: "12px 16px", borderRadius: "var(--r-md)",
                background: hover === p.zone ? "var(--surface)" : "transparent",
                border: "1px solid " + (hover === p.zone ? "var(--line-2)" : "transparent"),
                cursor: "default", transition: "all .15s",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor, flexShrink: 0 }}/>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    {p.label[lang] || p.label.ru}
                    {p.fromVision && <span style={{
                      fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: ".1em",
                      padding: "2px 6px", background: "var(--accent-soft)", color: "var(--accent-ink)",
                      borderRadius: 999,
                    }}>AI</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
                    {ZONES[p.zone].label[lang] || ZONES[p.zone].label.ru}
                    {p.comment && hover === p.zone && <span style={{ marginLeft: 6, fontStyle: "italic" }}>· {p.comment}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{
                      width: 6, height: 14, borderRadius: 2,
                      background: n <= sev ? sevColor : "var(--line-2)",
                    }}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: "relative", aspectRatio: "1/1.05", maxWidth: 480, margin: "0 auto",
        borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface)",
        border: "1px solid var(--line)",
      }}>
        <FaceDiagram problems={problems} hover={hover} setHover={setHover} lang={lang} t={t}/>
      </div>
    </div>
  );
}

function FaceDiagram({ problems, hover, setHover, lang, t }) {
  const ZONES = window.__FACE_ZONES;
  return (
    <svg viewBox="0 0 100 105" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="facegrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--surface-2)"/>
          <stop offset="100%" stopColor="var(--surface)"/>
        </linearGradient>
      </defs>
      {/* face shape */}
      <path d="M50 8 C 73 8 84 28 84 50 C 84 75 70 95 50 95 C 30 95 16 75 16 50 C 16 28 27 8 50 8 Z"
        fill="url(#facegrad)" stroke="var(--line-2)" strokeWidth=".4"/>
      {/* facial features (subtle) */}
      <ellipse cx="38" cy="40" rx="3" ry="1" fill="var(--ink-4)" opacity=".4"/>
      <ellipse cx="62" cy="40" rx="3" ry="1" fill="var(--ink-4)" opacity=".4"/>
      <path d="M42 70 Q50 73 58 70" stroke="var(--ink-4)" strokeWidth=".5" fill="none" opacity=".5"/>
      <path d="M48 50 L50 60 L52 50" stroke="var(--ink-4)" strokeWidth=".4" fill="none" opacity=".3"/>

      {/* problem markers */}
      {problems.map((p, i) => {
        const z = ZONES[p.zone];
        const sev = p.severity;
        const r = 3 + sev * 0.7;
        const sevColor = sev >= 4 ? "var(--crit)" : sev >= 3 ? "var(--warn)" : "var(--good)";
        const isHover = hover === p.zone;
        return (
          <g key={i} onMouseEnter={() => setHover(p.zone)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <circle cx={z.x} cy={z.y} r={r * 1.6} fill={sevColor} opacity={isHover ? 0.4 : 0.18}>
              <animate attributeName="r" values={`${r*1.6};${r*2.2};${r*1.6}`} dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx={z.x} cy={z.y} r={r} fill={sevColor} opacity={isHover ? 1 : 0.85}/>
            {isHover && (
              <g>
                <rect x={z.x + 5} y={z.y - 8} width={Math.max(40, (p.label[lang]||p.label.ru).length * 1.4)} height="6.5" rx="1.5" fill="var(--ink)"/>
                <text x={z.x + 7} y={z.y - 3.5} fill="white" fontSize="3" fontFamily="var(--font-ui)">{p.label[lang]||p.label.ru}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============ ROUTINE ============ */
function RoutineView({ t, lang, routine }) {
  return (
    <div>
      <h2>{t("tabRoutine")}</h2>
      <p className="lede" style={{ fontSize: 15, marginTop: 8 }}>{t("routineLede")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28 }} className="routine-grid">
        <RoutineColumn t={t} lang={lang} title={t("morning")} icon="sun" steps={routine.am} when="am"/>
        <RoutineColumn t={t} lang={lang} title={t("evening")} icon="moon" steps={routine.pm} when="pm"/>
      </div>

      {routine.weekly?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <RoutineColumn t={t} lang={lang} title={t("weekly")} icon="cal" steps={routine.weekly} when="weekly"/>
        </div>
      )}
    </div>
  );
}

function RoutineColumn({ t, lang, title, icon, steps, when }) {
  const TPL = window.__STEP_TEMPLATES;
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 16 }}>
        <RoutineIcon kind={icon}/>
        <h2 style={{ fontSize: 22 }}>{title}</h2>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((p, i) => {
          const stepLabel = TPL[p.step]?.[when === "weekly" ? "pm" : when];
          return (
            <li key={p.id} style={{
              display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 14, alignItems: "center",
              padding: "14px 14px", borderRadius: "var(--r-md)", background: "var(--surface)",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-4)", textAlign: "center",
              }}>{String(i+1).padStart(2, "0")}</div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".1em", textTransform: "uppercase" }}>{stepLabel?.[lang] || stepLabel?.ru || ""}</div>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{p.name[lang] || p.name.ru}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {p.actives.map(a => <span key={a} style={{ padding: "2px 8px", border: "1px solid var(--line-2)", borderRadius: 999 }}>{a}</span>)}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{p.price.toLocaleString("ru-RU")} ₽</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RoutineIcon({ kind }) {
  if (kind === "sun") return <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="4" fill="var(--accent)"/>{[0,45,90,135,180,225,270,315].map(a => <line key={a} x1={11+Math.cos(a*Math.PI/180)*6.5} y1={11+Math.sin(a*Math.PI/180)*6.5} x2={11+Math.cos(a*Math.PI/180)*9.5} y2={11+Math.sin(a*Math.PI/180)*9.5} stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round"/>)}</svg>;
  if (kind === "moon") return <svg width="22" height="22" viewBox="0 0 22 22"><path d="M16 12 a6 6 0 1 1-6-7 a5 5 0 0 0 6 7Z" fill="var(--ink)"/></svg>;
  if (kind === "cal") return <svg width="22" height="22" viewBox="0 0 22 22"><rect x="3" y="5" width="16" height="14" rx="2" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><path d="M3 9h16M7 3v4M15 3v4" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round"/></svg>;
  return null;
}

/* ============ PRODUCTS ============ */
function ProductsView({ t, lang, products, cart, toggleCart }) {
  return (
    <div>
      <h2>{t("productsTitle")}</h2>
      <p className="lede" style={{ fontSize: 15, marginTop: 8 }}>{t("productsLede")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 28 }}>
        {products.map(p => (
          <ProductCard key={p.id} t={t} lang={lang} product={p} inCart={cart.includes(p.id)} onToggle={() => toggleCart(p.id)}/>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ t, lang, product, inCart, onToggle }) {
  const palettes = {
    cleanser: ["oklch(.94 .04 200)", "oklch(.86 .05 200)"],
    toner:    ["oklch(.94 .04 130)", "oklch(.86 .05 130)"],
    serum:    ["oklch(.94 .05 35)",  "oklch(.86 .07 35)"],
    eye:      ["oklch(.94 .04 280)", "oklch(.86 .05 280)"],
    moist:    ["oklch(.94 .03 80)",  "oklch(.86 .04 80)"],
    spf:      ["oklch(.94 .06 60)",  "oklch(.86 .08 60)"],
    mask:     ["oklch(.94 .04 320)", "oklch(.86 .05 320)"],
    exfoliant:["oklch(.94 .05 350)", "oklch(.86 .06 350)"],
  };
  const [c1, c2] = palettes[product.category] || ["var(--surface-2)", "var(--surface)"];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ aspectRatio: "1.1/1", background: `linear-gradient(155deg, ${c1}, ${c2})`, position: "relative", overflow: "hidden" }}>
        <BottleSVG kind={product.category}/>
        <div style={{ position: "absolute", left: 14, top: 14, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: 1.4, textTransform: "uppercase" }}>{product.category}</div>
      </div>
      <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{product.name[lang] || product.name.ru}</div>
        <div style={{ fontSize: 12, color: "var(--ink-4)" }}>{product.volume}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {product.actives.slice(0,2).map(a => (
            <span key={a} style={{ padding: "3px 8px", fontSize: 11, border: "1px solid var(--line-2)", borderRadius: 999, color: "var(--ink-3)" }}>{a}</span>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{product.price.toLocaleString("ru-RU")} ₽</div>
          <button className={"btn btn-sm " + (inCart ? "btn-ghost" : "btn-primary")} onClick={onToggle}>
            {inCart ? "✓ " + t("inCart") : t("addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}

function BottleSVG({ kind }) {
  // simple abstract bottle shapes
  const shapes = {
    cleanser: <g><rect x="38" y="35" width="24" height="50" rx="3" fill="white" opacity=".9"/><rect x="42" y="28" width="16" height="9" rx="1" fill="var(--ink)" opacity=".25"/></g>,
    toner: <g><rect x="36" y="30" width="28" height="56" rx="14" fill="white" opacity=".9"/><rect x="46" y="24" width="8" height="8" fill="var(--ink)" opacity=".25"/></g>,
    serum: <g><rect x="40" y="32" width="20" height="48" rx="2" fill="white" opacity=".95"/><rect x="42" y="22" width="16" height="11" rx="1.5" fill="var(--ink)" opacity=".5"/><circle cx="50" cy="22" r="4" fill="var(--ink)" opacity=".3"/></g>,
    eye: <g><ellipse cx="50" cy="60" rx="18" ry="22" fill="white" opacity=".9"/><rect x="44" y="32" width="12" height="9" rx="1" fill="var(--ink)" opacity=".25"/></g>,
    moist: <g><circle cx="50" cy="60" r="22" fill="white" opacity=".9"/><rect x="38" y="35" width="24" height="6" rx="2" fill="var(--ink)" opacity=".25"/></g>,
    spf: <g><rect x="36" y="32" width="28" height="50" rx="6" fill="white" opacity=".95"/><text x="50" y="62" textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fill="var(--ink)">SPF 50</text></g>,
    mask: <g><circle cx="50" cy="58" r="22" fill="white" opacity=".9"/><circle cx="50" cy="58" r="14" fill="none" stroke="var(--ink)" strokeOpacity=".25" strokeWidth=".5"/></g>,
    exfoliant: <g><rect x="38" y="32" width="24" height="50" rx="2" fill="white" opacity=".95"/><circle cx="50" cy="55" r="2" fill="var(--ink)" opacity=".3"/><circle cx="46" cy="62" r="1.5" fill="var(--ink)" opacity=".3"/><circle cx="54" cy="65" r="1.7" fill="var(--ink)" opacity=".3"/></g>,
  };
  return <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{shapes[kind]}</svg>;
}

/* ============ PRO (professional care products) ============ */
function ProView({ t, lang, procedures }) {
  // group by category
  const groups = procedures.reduce((acc, p) => {
    const k = p.cat || "peel";
    (acc[k] = acc[k] || []).push(p);
    return acc;
  }, {});
  const order = ["peel", "meso", "concentrate", "promask"];
  const titleKey = { peel: "proCatPeel", meso: "proCatMeso", concentrate: "proCatConcentrate", promask: "proCatPromask" };
  const palettes = {
    peel:        ["oklch(.92 .07 25)",  "oklch(.82 .09 25)"],
    meso:        ["oklch(.92 .06 280)", "oklch(.82 .08 280)"],
    concentrate: ["oklch(.92 .06 145)", "oklch(.82 .08 145)"],
    promask:     ["oklch(.92 .05 60)",  "oklch(.82 .07 60)"],
  };
  const fmt = n => `${n.toLocaleString("ru-RU")} ₽`;

  return (
    <div>
      <h2>{t("proTitle")}</h2>
      <p className="lede" style={{ fontSize: 15, marginTop: 8 }}>{t("proLede")}</p>

      {order.filter(k => groups[k]?.length).map(k => {
        const [c1, c2] = palettes[k];
        return (
          <div key={k} style={{ marginTop: 36 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)",
              letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14,
            }}>{t(titleKey[k])}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {groups[k].map(p => (
                <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ aspectRatio: "2.2/1", background: `linear-gradient(155deg, ${c1}, ${c2})`, position: "relative" }}>
                    <div style={{
                      position: "absolute", left: 16, top: 14, fontFamily: "var(--font-mono)",
                      fontSize: 10, color: "var(--ink-3)", letterSpacing: 1.4, textTransform: "uppercase",
                    }}>{t(titleKey[k])} · PRO</div>
                    <div style={{
                      position: "absolute", right: 16, bottom: 14,
                      fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-2)",
                    }}>{p.volume}</div>
                  </div>
                  <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                      {p.name[lang] || p.name.ru}
                    </div>
                    <p style={{ color: "var(--ink-3)", lineHeight: 1.5, fontSize: 13, margin: 0 }}>{p.desc[lang] || p.desc.ru}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {p.actives.map(a => (
                        <span key={a} style={{
                          padding: "3px 8px", fontSize: 11, border: "1px solid var(--line-2)",
                          borderRadius: 999, color: "var(--ink-3)",
                        }}>{a}</span>
                      ))}
                    </div>
                    <div style={{
                      marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line)",
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em" }}>{t("proFreq")}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{t(p.freqKey)}</div>
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{fmt(p.price)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ SUMMARY ============ */
function SummaryView({ t, lang, routine, cart, totalPrice, setCart, allProducts, shopUrl, onRestart }) {
  const fmt = n => `${n.toLocaleString("ru-RU")} ₽`;

  function selectAll() {
    setCart(allProducts.map(p => p.id));
  }

  function downloadPdf() {
    window.print();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28 }} className="summary-grid">
      <div>
        <h2>{t("summaryTitle")}</h2>
        <p className="lede" style={{ fontSize: 15, marginTop: 8 }}>{t("summaryLede")}</p>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 14 }}>{t("morning")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {routine.am.map((p, i) => <SummaryStep key={p.id} n={i+1} name={p.name[lang]||p.name.ru}/>)}
          </div>
          <div style={{ fontWeight: 500, margin: "22px 0 14px" }}>{t("evening")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {routine.pm.map((p, i) => <SummaryStep key={p.id} n={i+1} name={p.name[lang]||p.name.ru}/>)}
          </div>
          {routine.weekly?.length > 0 && (<>
            <div style={{ fontWeight: 500, margin: "22px 0 14px" }}>{t("weekly")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {routine.weekly.map((p, i) => <SummaryStep key={p.id} n={i+1} name={p.name[lang]||p.name.ru}/>)}
            </div>
          </>)}
        </div>

        <div className="row" style={{ marginTop: 24, gap: 12 }}>
          <button className="btn btn-ghost" onClick={onRestart}>{t("restart")}</button>
          <button className="btn btn-ghost" onClick={downloadPdf}>{t("pdfDownload")}</button>
        </div>
      </div>

      <div className="card" style={{ padding: 26, position: "sticky", top: 100, alignSelf: "flex-start", height: "fit-content" }}>
        <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".14em", textTransform: "uppercase" }}>{t("cartTitle")}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: "-0.02em" }}>{cart.length} / {allProducts.length}</div>
          {cart.length === 0 && <button className="btn btn-sm btn-primary" onClick={selectAll}>+ all</button>}
        </div>

        <div style={{ marginTop: 20, marginBottom: 14, maxHeight: 280, overflowY: "auto" }}>
          {cart.length === 0 && <div style={{ color: "var(--ink-4)", fontSize: 14 }}>{t("cartEmpty")}</div>}
          <div className="col" style={{ gap: 8 }}>
            {allProducts.filter(p => cart.includes(p.id)).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                <span style={{ color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name[lang]||p.name.ru}</span>
                <span style={{ color: "var(--ink-3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmt(p.price)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ color: "var(--ink-3)", fontSize: 14 }}>{t("total")} <span style={{ fontSize: 11, color: "var(--ink-4)" }}>({t("monthlyEst")})</span></div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26 }}>{fmt(totalPrice)}</div>
        </div>

        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: "var(--r-sm)",
          background: "color-mix(in oklch, var(--good) 15%, var(--bg-elev))",
          fontSize: 12, color: "var(--ink-2)",
        }}>
          {t("monthlyEst")}
        </div>

        <a href={shopUrl} target="_blank" rel="noreferrer" className="btn btn-accent btn-lg" style={{ width: "100%", marginTop: 16, display: "flex" }}>
          {t("goShop")}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3h8v8M3 11l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </a>

        <div style={{ marginTop: 14, fontSize: 11, color: "var(--ink-4)", lineHeight: 1.5 }}>{t("disclaimer")}</div>
      </div>
    </div>
  );
}

function SummaryStep({ n, name }) {
  return (
    <div style={{
      padding: "8px 14px", border: "1px solid var(--line-2)", borderRadius: "var(--r-pill)",
      fontSize: 13, display: "inline-flex", gap: 8, alignItems: "center",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{String(n).padStart(2, "0")}</span>
      <span>{name}</span>
    </div>
  );
}

window.ResultStep = ResultStep;
window.ProductCard = ProductCard;
window.BottleSVG = BottleSVG;

