import React from "react";

const { useState, useEffect, useRef } = React;

/* ============ SCAN (analyzing animation + real analysis) ============ */
function ScanStep({ t, photo, profile, lang, onDone }) {
  const steps = [t("scanStep1"), t("scanStep2"), t("scanStep3"), t("scanStep4"), t("scanStep5"), t("scanStep6")];
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const stageRef = useRef("load");

  useEffect(() => {
    let cancelled = false;
    let analysisDone = false;
    let analysisResult = null;
    const minDuration = 4200;
    const start = performance.now();

    // Start real analysis in parallel with the animation
    (async () => {
      try {
        analysisResult = await window.analyzePhoto({
          photo, profile, lang,
          onProgress: ({ stage }) => { stageRef.current = stage; }
        });
      } catch (e) {
        analysisResult = { source: "error", zones: null, metrics: null, vision: null };
      }
      analysisDone = true;
    })();

    let raf;
    const tick = (now) => {
      if (cancelled) return;
      const elapsed = now - start;
      // map stage -> baseline progress
      const stageProgress = {
        load: 8, mesh: 30, zones: 55, vision: 80, done: 100, error: 100
      }[stageRef.current] || 0;
      const timeBased = Math.min(95, (elapsed / minDuration) * 100);
      const target = analysisDone ? 100 : Math.max(timeBased, stageProgress);
      setProgress(prev => Math.min(target, prev + (target - prev) * 0.08 + 0.3));
      const i = Math.min(steps.length - 1, Math.floor((target / 100) * steps.length));
      setIdx(i);

      if (analysisDone && elapsed >= minDuration) {
        setProgress(100);
        setTimeout(() => { if (!cancelled) onDone(analysisResult); }, 350);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="stage fade-in" style={{ alignItems: "center", textAlign: "center" }}>
      <Eyebrow>{t("scanTitle")}</Eyebrow>
      <h1 style={{ marginTop: 18, fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("scanTitle")}…</h1>
      <p className="lede">{t("scanSub")}</p>

      <div style={{
        position: "relative", marginTop: 36, width: "min(440px, 80vw)", aspectRatio: "1/1",
        borderRadius: "var(--r-xl)", overflow: "hidden",
        background: "var(--ink)", border: "1px solid var(--line)",
      }}>
        {photo?.src ? (
          <img src={photo.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(.95) brightness(.95)" }}/>
        ) : <DemoPhotoSVG/>}

        {/* scan beam */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg, transparent 40%, var(--accent-glow) 50%, transparent 60%)",
          mixBlendMode: "screen",
          animation: "beam 2.4s ease-in-out infinite",
        }}/>
        <style>{`
          @keyframes beam { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
          @keyframes ring { 0%{transform:scale(.6); opacity:.0} 50%{opacity:.7} 100%{transform:scale(1.4); opacity:0} }
          @keyframes blip { 0%,100%{opacity:.4} 50%{opacity:1} }
        `}</style>

        {/* face landmarks */}
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* corner brackets */}
          {[[6,6,1,1],[94,6,-1,1],[6,94,1,-1],[94,94,-1,-1]].map(([x,y,sx,sy],i) => (
            <path key={i} d={`M${x} ${y+8*sy}V${y}H${x+8*sx}`} stroke="white" strokeWidth=".4" fill="none"/>
          ))}
          {/* moving landmarks */}
          {[[35,42],[65,42],[50,55],[40,68],[60,68],[50,30]].map(([x,y],i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="1" fill="var(--accent)" style={{ animation: `blip 1.4s ease ${i*.15}s infinite` }}/>
              <circle cx={x} cy={y} r="3" fill="none" stroke="var(--accent)" strokeWidth=".3"
                style={{ animation: `ring 2s ease ${i*.2}s infinite`, transformOrigin: `${x}px ${y}px` }}/>
            </g>
          ))}
        </svg>

        {/* corner readings */}
        <div style={{
          position: "absolute", left: 16, bottom: 16, color: "white", opacity: .8,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5,
        }}>SCAN · {Math.round(progress)}%</div>
      </div>

      <div style={{ width: "min(440px, 80vw)", marginTop: 28 }}>
        <ProgressBar value={progress} tone="accent"/>
      </div>

      <div style={{ marginTop: 28, height: 70, position: "relative", width: "min(540px, 92vw)" }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? "none" : "translateY(8px)",
            transition: "all .35s ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-4)", fontSize: 12 }}>{String(i+1).padStart(2,"0")}</span>
            <span style={{ fontSize: 17, color: "var(--ink-2)" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ScanStep = ScanStep;

