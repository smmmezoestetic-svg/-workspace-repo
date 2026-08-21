import React from "react";

const { useState: useStateA, useRef: useRefA } = React;

/* ============ ANALOG FINDER STEP ============ */
function AnalogStep({ t, lang, onBack, shopUrl }) {
  const fileRef = useRefA(null);
  const [photo, setPhoto] = useStateA(null);
  const [analyzing, setAnalyzing] = useStateA(false);
  const [result, setResult] = useStateA(null);
  const [error, setError] = useStateA(null);

  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => startAnalysis(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function startAnalysis(src) {
    setPhoto({ src });
    setError(null);
    setResult(null);
    setAnalyzing(true);
    try {
      const r = await window.analyzeProductPhoto(src, lang);
      // Аналоги ищутся по каталогу магазина — дожидаемся его загрузки.
      if (window.__catalogReady) await window.__catalogReady.catch(() => {});
      if (!r.ok) {
        setError(r.reason || "vision-error");
        setResult(null);
      } else {
        const analogs = window.findAnalogs(r);
        setResult({ identified: r, analogs });
      }
    } catch (e) {
      setError("vision-error");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setPhoto(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch" }}>
      {!photo && (
        <AnalogIntro t={t} onUpload={() => fileRef.current?.click()} onBack={onBack}/>
      )}

      {photo && (
        <div className="col" style={{ gap: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 36, alignItems: "start" }} className="analog-grid">
            <ProductPhotoPreview t={t} photo={photo} analyzing={analyzing}/>
            <AnalogResultPanel t={t} lang={lang} result={result} error={error} analyzing={analyzing}/>
          </div>

          {result && result.analogs && result.analogs.length > 0 && (
            <AnalogList t={t} lang={lang} analogs={result.analogs} identified={result.identified} shopUrl={shopUrl}/>
          )}

          {result && (!result.analogs || result.analogs.length === 0) && !error && (
            <div style={{
              padding: 32, borderRadius: "var(--r-lg)", background: "var(--surface)",
              textAlign: "center", color: "var(--ink-3)",
            }}>{t("analogNoResults")}</div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onBack}>{t("back")}</button>
            <button className="btn btn-primary" onClick={reset}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7a5 5 0 1 1 1.5 3.5L2 12m0-5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("analogTryAgain")}
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile}/>
    </div>
  );
}

function AnalogIntro({ t, onUpload, onBack }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 56, alignItems: "start" }} className="analog-intro-grid">
      <div className="col" style={{ gap: 18 }}>
        <Eyebrow>AI · Vision</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("analogTitle")}</h1>
        <p className="lede">{t("analogLede")}</p>

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button className="btn btn-primary btn-lg" onClick={onUpload}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 11V3m0 0L4.5 6.5M8 3l3.5 3.5M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("photoUpload")}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={onBack}>{t("back")}</button>
        </div>

        <div style={{ marginTop: 28, padding: 20, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>{t("analogTipsTitle")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-3)", fontSize: 14, lineHeight: 1.8 }}>
            <li>{t("analogTip1")}</li>
            <li>{t("analogTip2")}</li>
            <li>{t("analogTip3")}</li>
          </ul>
        </div>
      </div>

      <div>
        <BottleArt/>
      </div>
    </div>
  );
}

function BottleArt() {
  return (
    <div style={{
      aspectRatio: "1/1", maxWidth: 460, marginInline: "auto",
      borderRadius: "var(--r-xl)", overflow: "hidden",
      background: "linear-gradient(155deg, var(--accent-soft), oklch(.94 .03 60))",
      border: "1px solid var(--line)", position: "relative",
    }}>
      <svg viewBox="0 0 400 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="bg-art" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.5)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>
          <linearGradient id="bottle1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white"/>
            <stop offset="100%" stopColor="oklch(.92 .015 60)"/>
          </linearGradient>
          <linearGradient id="bottle2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(.65 .12 35)"/>
            <stop offset="100%" stopColor="oklch(.48 .12 35)"/>
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="160" fill="url(#bg-art)"/>
        {/* Bottle 1 (recognized product) */}
        <g transform="translate(120, 130)">
          <rect x="0" y="0" width="80" height="160" rx="6" fill="url(#bottle1)" stroke="var(--ink)" strokeOpacity=".15" strokeWidth="1"/>
          <rect x="20" y="-18" width="40" height="20" rx="2" fill="var(--ink)" opacity=".4"/>
          <rect x="10" y="40" width="60" height="2" fill="var(--ink)" opacity=".2"/>
          <rect x="10" y="50" width="40" height="2" fill="var(--ink)" opacity=".15"/>
          <rect x="10" y="100" width="20" height="8" rx="1" fill="var(--accent)" opacity=".6"/>
        </g>
        {/* Arrow */}
        <g transform="translate(218, 200)" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round">
          <line x1="0" y1="0" x2="36" y2="0"/>
          <polyline points="28,-6 36,0 28,6"/>
        </g>
        {/* Bottle 2 (analog) */}
        <g transform="translate(260, 140)">
          <rect x="0" y="0" width="60" height="140" rx="6" fill="url(#bottle2)"/>
          <rect x="14" y="-14" width="32" height="16" rx="2" fill="oklch(.32 .04 30)"/>
          <rect x="8" y="34" width="44" height="2" fill="white" opacity=".7"/>
          <rect x="8" y="42" width="30" height="2" fill="white" opacity=".5"/>
        </g>
        {/* Particles / scan dots */}
        {[[80, 100, .3], [340, 90, .25], [70, 320, .4], [320, 330, .3], [200, 80, .2], [200, 340, .2]].map(([x, y, op], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" opacity={op}>
            <animate attributeName="opacity" values={`${op};${op*2};${op}`} dur="2.4s" begin={`${i*.2}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function ProductPhotoPreview({ t, photo, analyzing }) {
  return (
    <div style={{
      aspectRatio: "3/4", borderRadius: "var(--r-xl)", overflow: "hidden",
      background: "var(--ink)", border: "1px solid var(--line)", position: "relative",
    }}>
      {photo?.src && (
        <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
      )}
      {analyzing && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(20,18,12,.55)",
          display: "grid", placeItems: "center", color: "white",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 36, height: 36, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "white",
              borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite",
            }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize: 13, letterSpacing: ".05em" }}>{t("analogAnalyzing")}</div>
          </div>
        </div>
      )}
      {/* Scan overlay when analyzing */}
      {analyzing && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg, transparent 40%, var(--accent-glow) 50%, transparent 60%)",
          mixBlendMode: "screen",
          animation: "beam 2.4s ease-in-out infinite",
        }}/>
      )}
      <style>{`@keyframes beam { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }`}</style>
    </div>
  );
}

function AnalogResultPanel({ t, lang, result, error, analyzing }) {
  // Шаг ищет аналог по фото средства, поэтому здесь свои тексты: сообщения
  // с шага диагностики говорят про лицо и формат файла и сбивают с толку,
  // когда на деле недоступен сервис распознавания.
  const errorMessages = {
    "not-skincare": t("analogNotProduct"),
    "vision-error": t("analogErrService"),
    "no-vision":    t("analogErrService"),
    "parse-failed": t("analogErrUnclear"),
  };

  if (analyzing) {
    return (
      <div style={{ padding: 28 }}>
        <Eyebrow>AI · Vision</Eyebrow>
        <h2 style={{ marginTop: 10 }}>{t("analogAnalyzing")}</h2>
        <p className="lede" style={{ fontSize: 14, marginTop: 10 }}>{t("scanSub")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 28, borderRadius: "var(--r-lg)",
        background: "color-mix(in oklch, var(--crit) 8%, var(--bg-elev))",
        border: "1px solid color-mix(in oklch, var(--crit) 35%, var(--line))",
      }}>
        <Eyebrow>{t("analogErrTitle")}</Eyebrow>
        <h2 style={{ marginTop: 10, fontSize: 22 }}>{t("analogErrTitle")}</h2>
        <p style={{ marginTop: 10, color: "var(--ink-3)" }}>{errorMessages[error] || t("analogErrService")}</p>
      </div>
    );
  }

  if (!result) return null;

  const id = result.identified;
  const catLabels = { cleanser: "Очищение", toner: "Тоник", serum: "Сыворотка", moist: "Крем", spf: "SPF", eye: "Зона глаз", mask: "Маска", exfoliant: "Эксфолиант" };
  const catLabelsEn = { cleanser: "Cleanser", toner: "Toner", serum: "Serum", moist: "Cream", spf: "SPF", eye: "Eye care", mask: "Mask", exfoliant: "Exfoliant" };
  const catLabel = lang === "en" ? (catLabelsEn[id.category] || id.category) : (catLabels[id.category] || id.category);

  return (
    <div className="card" style={{ padding: 28 }}>
      <Eyebrow>{t("analogIdentified")}</Eyebrow>
      <h2 style={{ marginTop: 10, fontSize: 26, lineHeight: 1.2 }}>
        {[id.brand, id.name].filter(Boolean).join(" · ") || (lang === "en" ? "Skincare product" : "Косметическое средство")}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "14px 22px", marginTop: 22, fontSize: 13 }}>
        <div style={{ color: "var(--ink-4)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          {t("productCategory")}
        </div>
        <div style={{ fontWeight: 500 }}>{catLabel}</div>

        {id.volume && <>
          <div style={{ color: "var(--ink-4)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            {lang === "en" ? "Volume" : "Объём"}
          </div>
          <div>{id.volume}</div>
        </>}

        {id.actives && id.actives.length > 0 && <>
          <div style={{ color: "var(--ink-4)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            {t("actives")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {id.actives.map(a => (
              <span key={a} style={{
                padding: "3px 9px", fontSize: 12, border: "1px solid var(--line-2)",
                borderRadius: 999, color: "var(--ink-2)", background: "var(--bg-elev)",
              }}>{a}</span>
            ))}
          </div>
        </>}

        {id.targetSkinTypes && id.targetSkinTypes.length > 0 && <>
          <div style={{ color: "var(--ink-4)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            {lang === "en" ? "For skin" : "Для кожи"}
          </div>
          <div style={{ color: "var(--ink-2)" }}>{id.targetSkinTypes.join(", ")}</div>
        </>}
      </div>

      {id.comment && (
        <p style={{ marginTop: 22, fontSize: 14, color: "var(--ink-3)", lineHeight: 1.55, fontStyle: "italic" }}>
          {id.comment}
        </p>
      )}
    </div>
  );
}

function AnalogList({ t, lang, analogs, identified, shopUrl }) {
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
  const maxScore = Math.max(...analogs.map(a => a.score), 1);
  const [cart, setCart] = useStateA([]);
  const toggleCart = (id) => setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const cartTotal = analogs
    .filter(({ product }) => cart.includes(product.id))
    .reduce((s, { product }) => s + product.price, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h2 style={{ fontSize: 26 }}>{t("analogAnalogs")}</h2>
        <span style={{ color: "var(--ink-4)", fontSize: 13 }}>{analogs.length}</span>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16,
      }}>
        {analogs.map(({ product, score, sharedActives }) => {
          const [c1, c2] = palettes[product.category] || ["var(--surface-2)", "var(--surface)"];
          const matchPct = Math.round((score / maxScore) * 100);
          const inCart = cart.includes(product.id);
          return (
            <div key={product.id} className="card" style={{
              padding: 0, overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
              <a href={shopUrl} target="_blank" rel="noreferrer" style={{
                aspectRatio: "1.1/1", background: `linear-gradient(155deg, ${c1}, ${c2})`,
                position: "relative", overflow: "hidden", display: "block", textDecoration: "none",
              }}>
                {window.BottleSVG ? <window.BottleSVG kind={product.category}/> : null}
                <div style={{ position: "absolute", left: 14, top: 14, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: 1.4, textTransform: "uppercase" }}>{product.category}</div>
                <div style={{
                  position: "absolute", right: 12, top: 12,
                  padding: "4px 10px", borderRadius: 999,
                  background: "rgba(255,255,255,.92)", color: "var(--accent-ink)",
                  fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: ".05em",
                }}>{t("matchScore")} {matchPct}%</div>
              </a>
              <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href={shopUrl} target="_blank" rel="noreferrer" style={{
                  fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.25, letterSpacing: "-0.01em",
                  color: "inherit", textDecoration: "none",
                }}>
                  {product.name[lang] || product.name.ru}
                </a>
                <div style={{ fontSize: 12, color: "var(--ink-4)" }}>{product.volume}</div>
                {sharedActives && sharedActives.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>{t("sharedActives")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {sharedActives.slice(0, 3).map(a => (
                        <span key={a} style={{
                          padding: "3px 8px", fontSize: 11, background: "var(--accent-soft)",
                          color: "var(--accent-ink)", borderRadius: 999, fontWeight: 500,
                        }}>✓ {a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{product.price.toLocaleString("ru-RU")} ₽</div>
                  <button
                    className={"btn btn-sm " + (inCart ? "btn-ghost" : "btn-primary")}
                    onClick={(e) => { e.preventDefault(); toggleCart(product.id); }}
                  >
                    {inCart ? "✓ " + t("inCart") : t("addToCart")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div style={{
          position: "sticky", bottom: 16, marginTop: 24, padding: "16px 22px",
          background: "var(--ink)", color: "white", borderRadius: 999,
          display: "flex", alignItems: "center", gap: 18, justifyContent: "space-between",
          boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: "var(--accent)",
              display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500,
            }}>{cart.length}</div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", letterSpacing: ".1em", textTransform: "uppercase" }}>{t("cartTitle")}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 1 }}>{cartTotal.toLocaleString("ru-RU")} ₽</div>
            </div>
          </div>
          <a href={shopUrl} target="_blank" rel="noreferrer" className="btn btn-accent btn-sm">
            {t("goShop")} →
          </a>
        </div>
      )}
    </div>
  );
}

window.AnalogStep = AnalogStep;

