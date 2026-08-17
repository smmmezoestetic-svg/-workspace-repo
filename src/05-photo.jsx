import React from "react";

const { useState, useEffect, useRef } = React;

/* ============ FACE VALIDATION ============ */
/* Heuristic: load image into canvas, sample pixels and look for skin-tone pixels
   distributed in a face-like region. Combined with FaceDetector API where supported. */
async function validatePhoto(dataUrl) {
  if (!dataUrl) return { ok: true, reason: null };

  // Load image
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  }).catch(() => null);

  if (!img) return { ok: false, reason: "loadError" };

  // Reject very small images
  if (img.width < 200 || img.height < 200) {
    return { ok: false, reason: "tooSmall" };
  }

  // Try native FaceDetector first
  if (window.FaceDetector) {
    try {
      const det = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      const faces = await det.detect(img);
      if (faces && faces.length > 0) return { ok: true, reason: null, source: "native" };
      // FaceDetector ran but found nothing — definitive rejection
      return { ok: false, reason: "noFace", source: "native" };
    } catch (e) {
      // fall through to heuristic
    }
  }

  // Heuristic skin-tone detection
  const W = 160;
  const H = Math.round((img.height / img.width) * W);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  let data;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch (e) {
    return { ok: true, reason: null, source: "skip" }; // CORS — can't analyze, accept
  }

  let skin = 0, total = 0;
  // mask: build coarse 16x16 grid where skin is dominant
  const gx = 16, gy = 16;
  const cellW = W / gx, cellH = H / gy;
  const grid = new Array(gx * gy).fill(0);
  const cellTotal = new Array(gx * gy).fill(0);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      total++;
      // Standard skin-tone heuristic (RGB)
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      const isSkin =
        r > 95 && g > 40 && b > 20 &&
        max - min > 15 &&
        Math.abs(r - g) > 15 &&
        r > g && r > b;
      const cx = Math.min(gx-1, Math.floor(x / cellW));
      const cy = Math.min(gy-1, Math.floor(y / cellH));
      cellTotal[cy*gx+cx]++;
      if (isSkin) {
        skin++;
        grid[cy*gx+cx]++;
      }
    }
  }

  const skinRatio = skin / total;
  // Cells where >40% skin pixels
  let skinCells = 0;
  let skinCenterX = 0, skinCenterY = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] / cellTotal[i] > 0.4) {
      skinCells++;
      skinCenterX += (i % gx) + 0.5;
      skinCenterY += Math.floor(i / gx) + 0.5;
    }
  }

  // Skin must cover ~10–80% of image and form a contiguous-ish blob in the upper-center
  if (skinRatio < 0.07) return { ok: false, reason: "noSkin" };
  if (skinRatio > 0.85) return { ok: false, reason: "tooFlat" }; // single solid color
  if (skinCells < 6) return { ok: false, reason: "noFace" };

  // Cluster check: skin should be vertically in upper 70% of image
  const avgY = skinCenterY / Math.max(1, skinCells);
  if (avgY / gy > 0.85) return { ok: false, reason: "noFace" };

  // Variation check: stddev of luminance in skin cells (very low = solid color, fail)
  const lumas = [];
  for (let i = 0; i < data.length; i += 4*16) {
    lumas.push(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
  }
  const mean = lumas.reduce((a,b)=>a+b,0) / lumas.length;
  const variance = lumas.reduce((s,v)=>s+(v-mean)**2, 0) / lumas.length;
  const stddev = Math.sqrt(variance);
  if (stddev < 12) return { ok: false, reason: "tooFlat" };

  return { ok: true, reason: null, source: "heuristic", skinRatio };
}

window.validatePhoto = validatePhoto;

/* ============ PHOTO STEP ============ */
function PhotoStep({ t, onNext, onBack, photo, setPhoto }) {
  const fileRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  function clearError() { setError(null); }

  async function handleNewPhoto(payload) {
    setError(null);
    if (payload.type === "demo" || payload.type === "camera") {
      // Demo/synthetic photo — always valid
      setPhoto(payload);
      return;
    }
    setValidating(true);
    setPhoto(payload);
    const result = await window.validatePhoto(payload.src);
    setValidating(false);
    if (!result.ok) {
      setError(result.reason);
      setPhoto(null);
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow same file re-upload
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleNewPhoto({ src: ev.target.result, type: "upload" });
    reader.readAsDataURL(f);
  }

  function useDemo() {
    handleNewPhoto({ src: null, type: "demo" });
  }

  function takeDemoFromCamera() {
    handleNewPhoto({ src: null, type: "camera" });
    setCameraOpen(false);
  }

  const errMessages = {
    noFace: t("errNoFace"),
    noSkin: t("errNoFace"),
    tooSmall: t("errTooSmall"),
    tooFlat: t("errTooFlat"),
    loadError: t("errLoadError"),
  };

  return (
    <div className="stage fade-in" style={{ alignItems: "stretch" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 56, alignItems: "start" }} className="photo-grid">
        <div className="col" style={{ gap: 18 }}>
          <Eyebrow>{t("stepPhoto")} · 01 / 03</Eyebrow>
          <h1 style={{ fontSize: "clamp(30px, 3.4vw, 44px)" }}>{t("photoTitle")}</h1>
          <p className="lede">{t("photoLede")}</p>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={validating}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 11V3m0 0L4.5 6.5M8 3l3.5 3.5M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("photoUpload")}
            </button>
            <button className="btn btn-ghost" onClick={() => setCameraOpen(true)} disabled={validating}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="8" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6 4l1-1.5h2L10 4" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              {t("photoCamera")}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile}/>

          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={useDemo} disabled={validating}>
            {t("photoSkip")}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: "14px 16px", borderRadius: "var(--r-md)",
              background: "color-mix(in oklch, var(--crit) 12%, var(--bg-elev))",
              border: "1px solid color-mix(in oklch, var(--crit) 35%, var(--line))",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="10" cy="10" r="8" stroke="var(--crit)" strokeWidth="1.5"/>
                <path d="M10 6v5M10 14v.5" stroke="var(--crit)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{t("errTitle")}</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>{errMessages[error] || t("errNoFace")}</div>
              </div>
              <button onClick={clearError} style={{ marginLeft: "auto", color: "var(--ink-4)", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          <div style={{ marginTop: 36, padding: 20, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
            <div style={{ fontWeight: 500, marginBottom: 10 }}>{t("photoTipsTitle")}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-3)", fontSize: 14, lineHeight: 1.8 }}>
              <li>{t("photoTip1")}</li>
              <li>{t("photoTip2")}</li>
              <li>{t("photoTip3")}</li>
              <li>{t("photoTip4")}</li>
            </ul>
          </div>
        </div>

        <div>
          <PhotoPreview t={t} photo={photo} validating={validating} onChange={() => { setPhoto(null); setError(null); }}/>
        </div>
      </div>

      <div style={{ marginTop: 56, display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack}>{t("back")}</button>
        <button className="btn btn-primary" disabled={!photo || validating} onClick={onNext}>
          {validating ? t("validating") : t("next")}
        </button>
      </div>

      {cameraOpen && (
        <div onClick={() => setCameraOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(20,18,12,.5)", zIndex: 50,
          display: "grid", placeItems: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--bg-elev)", borderRadius: "var(--r-xl)", padding: 32,
            maxWidth: 440, width: "100%", textAlign: "center",
          }}>
            <div style={{
              aspectRatio: "1/1", background: "var(--ink)", borderRadius: "var(--r-lg)",
              marginBottom: 24, position: "relative", overflow: "hidden",
            }}>
              <CameraOverlay/>
            </div>
            <h2>{t("photoCameraTitle")}</h2>
            <p className="lede" style={{ fontSize: 14, margin: "10px auto 24px" }}>{t("photoCameraDesc")}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setCameraOpen(false)}>{t("photoBack")}</button>
              <button className="btn btn-accent" onClick={takeDemoFromCamera}>{t("photoTakeDemo")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraOverlay() {
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <ellipse cx="100" cy="95" rx="50" ry="62" stroke="white" strokeOpacity=".4" strokeDasharray="4 6" fill="none" strokeWidth="1.2"/>
      {[[15,15,1,1],[185,15,-1,1],[15,185,1,-1],[185,185,-1,-1]].map(([x,y,sx,sy],i) => (
        <path key={i} d={`M${x} ${y+12*sy}V${y}H${x+12*sx}`} stroke="white" strokeWidth="1.5" fill="none"/>
      ))}
      <text x="100" y="180" textAnchor="middle" fill="white" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="1.5" opacity=".7">DEMO PREVIEW</text>
    </svg>
  );
}

function PhotoPreview({ t, photo, validating, onChange }) {
  const empty = !photo;
  return (
    <div style={{
      aspectRatio: "1/1", borderRadius: "var(--r-xl)", overflow: "hidden",
      background: empty ? "var(--surface)" : "var(--ink)",
      border: "1px solid var(--line)", position: "relative",
      backgroundImage: empty ? "repeating-linear-gradient(45deg, transparent 0 14px, rgba(0,0,0,.025) 14px 15px)" : "none",
    }}>
      {empty && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".15em",
        }}>
          PHOTO PREVIEW
        </div>
      )}
      {!empty && photo.src && (
        <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
      )}
      {!empty && !photo.src && <DemoPhotoSVG/>}
      {validating && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(20,18,12,.5)",
          display: "grid", placeItems: "center", color: "white",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 32, height: 32, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "white",
              borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite",
            }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize: 13, letterSpacing: ".05em" }}>{t("validating")}</div>
          </div>
        </div>
      )}
      {!empty && !validating && (
        <div style={{
          position: "absolute", left: 16, bottom: 16, right: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{
            background: "rgba(255,255,255,.92)", padding: "6px 12px", borderRadius: 999,
            fontSize: 12, fontWeight: 500,
          }}>
            ✓ {t("photoLoaded")}
          </span>
          <button className="btn btn-sm" style={{
            background: "rgba(255,255,255,.92)", color: "var(--ink)",
          }} onClick={onChange}>{t("photoChange")}</button>
        </div>
      )}
    </div>
  );
}

function DemoPhotoSVG() {
  return (
    <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="demoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d3933"/>
          <stop offset="100%" stopColor="#1a1814"/>
        </linearGradient>
        <radialGradient id="demoFace" cx="50%" cy="42%" r="46%">
          <stop offset="0%" stopColor="oklch(0.78 0.06 60)"/>
          <stop offset="100%" stopColor="oklch(0.55 0.05 50)"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#demoBg)"/>
      <ellipse cx="200" cy="180" rx="100" ry="125" fill="url(#demoFace)"/>
      <path d="M100 160 Q100 60 200 60 Q300 60 300 160 L300 130 Q260 90 200 90 Q140 90 100 130 Z" fill="#1a1814"/>
      <path d="M160 290 Q160 340 200 340 Q240 340 240 290" fill="oklch(0.55 0.05 50)"/>
      <ellipse cx="170" cy="170" rx="6" ry="3" fill="#1a1814"/>
      <ellipse cx="230" cy="170" rx="6" ry="3" fill="#1a1814"/>
      <path d="M198 195 Q195 220 200 230" stroke="oklch(0.45 0.05 40)" strokeWidth="1.2" fill="none"/>
      <path d="M180 250 Q200 258 220 250 Q200 248 180 250" fill="oklch(0.5 0.08 25)"/>
      <text x="200" y="385" textAnchor="middle" fill="white" opacity=".5" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="2">DEMO PHOTO</text>
    </svg>
  );
}

window.PhotoStep = PhotoStep;
window.DemoPhotoSVG = DemoPhotoSVG;

