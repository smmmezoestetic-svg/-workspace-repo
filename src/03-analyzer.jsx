import React from "react";
import { getConfig } from "./config.js";

/* ============ ANALYZER ============
   Two-stage analysis:
   1) MediaPipe Face Mesh (468 landmarks) → per-zone color sampling
   2) Vision-AI pass через серверный прокси, фото уходит как data URL
   Both stages are independent — Vision-AI can be skipped on failure.
*/

/* ── Вызов Claude через серверный прокси ──
   Ключ Anthropic живёт только на сервере (см. server/proxy.php). Браузер
   обращается к своему домену, поэтому ключ невозможно вытащить из исходников
   страницы. Если apiUrl не задан — Vision-AI просто выключен, и анализ
   деградирует до MediaPipe + анкеты. */
async function callClaude(messages) {
  const { apiUrl } = getConfig();
  if (!apiUrl) {
    throw new Error("AI-анализ не настроен: не задан apiUrl прокси.");
  }
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(`API ${resp.status}: ${e.error?.message || resp.statusText}`);
  }
  const d = await resp.json();
  return d.content?.[0]?.text || "";
}

// Vision-AI доступна ровно тогда, когда настроен прокси.
function hasVisionAI() {
  return Boolean(getConfig().apiUrl);
}

const ZONE_LANDMARKS = {
  // approximate landmark indices from MediaPipe FaceMesh (468 points)
  forehead:  [10, 67, 297, 332, 103, 338, 109, 9],
  leftCheek: [50, 101, 36, 205, 187, 207, 213],
  rightCheek:[280, 330, 266, 425, 411, 427, 433],
  nose:      [4, 5, 195, 197, 6, 168, 8, 9],
  chin:      [152, 175, 199, 200, 18, 200, 17],
  leftEye:   [33, 7, 163, 144, 145, 153, 154, 155, 133],
  rightEye:  [362, 382, 381, 380, 374, 373, 390, 249, 263],
  leftUnder: [228, 229, 230, 231, 232, 233],
  rightUnder:[453, 452, 451, 450, 449, 448],
  upperLip:  [0, 17, 18, 200, 199],
  perioral: [202, 212, 422, 432],
};

let __faceMeshLoaderPromise = null;
const FACEMESH_CDNS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js",
  "https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
];
function __loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed: " + src));
    document.head.appendChild(s);
  });
}
async function loadFaceMesh() {
  if (window.FaceMesh) return window.FaceMesh;
  if (__faceMeshLoaderPromise) return __faceMeshLoaderPromise;
  __faceMeshLoaderPromise = (async () => {
    for (const url of FACEMESH_CDNS) {
      try {
        await __loadScript(url);
        if (window.FaceMesh) {
          console.log("[analyzer] FaceMesh loaded from", url);
          return window.FaceMesh;
        }
      } catch (e) {
        console.warn("[analyzer] FaceMesh CDN failed:", url);
      }
    }
    console.warn("[analyzer] All FaceMesh CDNs failed — falling back to Vision-only");
    return null;
  })();
  return __faceMeshLoaderPromise;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function sampleZone(ctx, landmarks, indices, w, h, radius = 6) {
  let r = 0, g = 0, b = 0, n = 0;
  let minR = 255, maxR = 0, minL = 255, maxL = 0;
  const lumas = [];
  let bright = 0; // count of very-bright pixels (specular highlight)
  let red = 0; // erythema
  for (const i of indices) {
    const lm = landmarks[i];
    if (!lm) continue;
    const cx = Math.round(lm.x * w), cy = Math.round(lm.y * h);
    try {
      const data = ctx.getImageData(
        Math.max(0, cx - radius), Math.max(0, cy - radius),
        radius * 2, radius * 2
      ).data;
      for (let p = 0; p < data.length; p += 4) {
        const pr = data[p], pg = data[p+1], pb = data[p+2];
        r += pr; g += pg; b += pb; n++;
        const lum = 0.299*pr + 0.587*pg + 0.114*pb;
        lumas.push(lum);
        if (lum > 230) bright++;
        // erythema = red dominance
        if (pr - (pg + pb) / 2 > 25) red++;
        minR = Math.min(minR, pr); maxR = Math.max(maxR, pr);
        minL = Math.min(minL, lum); maxL = Math.max(maxL, lum);
      }
    } catch (e) { /* ignore */ }
  }
  if (!n) return null;
  const avgR = r / n, avgG = g / n, avgB = b / n;
  const meanL = lumas.reduce((a,b) => a+b, 0) / lumas.length;
  const variance = lumas.reduce((s,v) => s+(v-meanL)**2, 0) / lumas.length;
  const stddev = Math.sqrt(variance);
  const [hue, sat, light] = rgbToHsl(avgR, avgG, avgB);
  return {
    r: avgR, g: avgG, b: avgB,
    hue, sat, light,
    stddev,
    brightRatio: bright / n,
    redRatio: red / n,
    contrast: maxL - minL,
  };
}

async function runFaceMesh(img) {
  const FM = await loadFaceMesh().catch(() => null);
  if (!FM) return null;

  const fm = new FM({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
  });
  fm.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(null); }
    }, 8000);

    fm.onResults((res) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      if (res.multiFaceLandmarks && res.multiFaceLandmarks.length) {
        resolve(res.multiFaceLandmarks[0]);
      } else {
        resolve(null);
      }
    });
    fm.send({ image: img }).catch(() => {
      if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); }
    });
  });
}

/**
 * Детекция лица для проверки загруженного фото.
 *
 * Отдельная функция, а не runFaceMesh: там null означает и «лица нет», и
 * «не успели за отведённое время», а для проверки эти случаи разные. Не
 * нашли лицо — фото отклоняем; не успели или не загрузилась библиотека —
 * отклонять нельзя, иначе недоступный CDN закроет тест всем.
 *
 * @returns {Promise<{available: boolean, found: boolean, timedOut: boolean}>}
 */
async function detectFaceLandmarks(img) {
  const FM = await loadFaceMesh().catch(() => null);
  if (!FM) return { available: false, found: false, timedOut: false };

  const fm = new FM({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
  });
  fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5 });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => finish({ available: true, found: false, timedOut: true }), 8000);

    fm.onResults((res) => {
      const faces = res.multiFaceLandmarks || [];
      finish({ available: true, found: faces.length > 0, timedOut: false });
    });
    fm.send({ image: img }).catch(() => finish({ available: false, found: false, timedOut: false }));
  });
}

function deriveMetricsFromZones(zones) {
  // Convert raw zone signals into 0-100 metrics. These are HONEST visual-only metrics.
  const cheekRed = ((zones.leftCheek?.redRatio || 0) + (zones.rightCheek?.redRatio || 0)) / 2;
  const tzoneBright = ((zones.forehead?.brightRatio || 0) + (zones.nose?.brightRatio || 0)) / 2;
  const cheekBright = ((zones.leftCheek?.brightRatio || 0) + (zones.rightCheek?.brightRatio || 0)) / 2;

  // Tone evenness: stddev across zone luminances
  const zoneLights = ["forehead","leftCheek","rightCheek","nose","chin"]
    .map(k => zones[k]?.light).filter(v => v != null);
  let toneSpread = 0;
  if (zoneLights.length >= 3) {
    const m = zoneLights.reduce((a,b) => a+b, 0) / zoneLights.length;
    toneSpread = Math.sqrt(zoneLights.reduce((s,v) => s+(v-m)**2, 0) / zoneLights.length);
  }

  // Eye contrast = sign of dark circles + fine lines
  const eyeContrast = ((zones.leftUnder?.contrast || 0) + (zones.rightUnder?.contrast || 0)) / 2;

  // Texture stddev (under-eye + cheek)
  const textureStddev = ((zones.leftCheek?.stddev || 0) + (zones.rightCheek?.stddev || 0) + (zones.leftUnder?.stddev || 0) + (zones.rightUnder?.stddev || 0)) / 4;

  // Map raw signals to 0-100 metrics. Higher = more of that thing.
  const metrics = {
    // visible shine in T-zone, scaled
    shine: Math.min(100, Math.round(tzoneBright * 1200)),
    // visible redness on cheeks
    redness: Math.min(100, Math.round(cheekRed * 600)),
    // tone evenness — invert spread (high spread = uneven)
    evenness: Math.max(0, Math.min(100, Math.round(100 - toneSpread * 4))),
    // texture variability — higher = more texture/pores
    texture: Math.max(0, Math.min(100, Math.round(textureStddev * 1.4))),
    // eye area concern (contrast + relative darkness)
    eyeArea: Math.min(100, Math.round(eyeContrast * 0.6 + ((zones.leftUnder?.light || 60) < (zones.leftCheek?.light || 65) ? 25 : 0))),
    // T/U-zone contrast — combination signal
    tzoneVsCheek: Math.round((tzoneBright - cheekBright) * 600),
  };
  return metrics;
}

async function visionAnalysis(dataUrl, profile, lang) {
  if (!hasVisionAI()) {
    console.warn("[analyzer] Vision недоступна: не настроен apiUrl прокси");
    return null;
  }

  const langInstr = lang === "en"
    ? "Reply in English."
    : "Отвечай на русском.";

  const prompt = `You are a cosmetology assistant analyzing a self-portrait photo.

Look ONLY at what is visually evident. Do NOT diagnose. Do NOT estimate hydration, elasticity, pH or anything that requires instruments.

Visible signs you may comment on:
- redness / erythema (location)
- visible enlarged pores (location)
- visible shine / oiliness (T-zone vs cheeks)
- uneven tone / pigmentation spots
- visible fine lines / wrinkles (forehead, around eyes, nasolabial)
- under-eye darkness or puffiness
- visible breakouts / inflammation
- texture irregularities

User profile (self-reported):
- age: ${profile.age || "?"}
- sex: ${profile.sex || "?"}
- self-reported concerns: ${Object.keys(profile.concerns||{}).filter(k => profile.concerns[k]).join(", ") || "none"}
- lifestyle flags: ${Object.keys(profile.lifestyle||{}).filter(k => profile.lifestyle[k]).join(", ") || "none"}

Return STRICT JSON, no prose, no markdown, with this shape:
{
  "summary": "1-2 sentence honest summary of what you see (${langInstr.toLowerCase()})",
  "findings": [
    { "zone": "forehead|leftCheek|rightCheek|nose|chin|leftUnder|rightUnder|leftEye|rightEye|perioral|upperLip", "label": "short label", "severity": 1-5, "comment": "1 short sentence" }
  ],
  "skinTypeGuess": "normal|dry|oily|combo|sensitive|acne|mature|dehydrated",
  "confidence": 0-100
}

${langInstr}`;

  try {
    // detect actual image type
    const mtype = dataUrl.startsWith("data:image/png") ? "image/png"
                : dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    console.log("[analyzer] calling Vision AI, mediaType:", mtype);
    // 20s timeout for Vision-AI
    const visionPromise = callClaude([{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mtype, data: dataUrl.split(",")[1] || "" } },
        { type: "text", text: prompt }
      ]
    }]);
    const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("vision timeout")), 20000));
    const res = await Promise.race([visionPromise, timeoutPromise]);
    // Try to parse first JSON block
    const m = res.match(/\{[\s\S]*\}/);
    if (!m) {
      console.warn("[analyzer] vision returned non-JSON response");
      return null;
    }
    const parsed = JSON.parse(m[0]);
    console.log("[analyzer] vision parsed:", parsed);
    return parsed;
  } catch (e) {
    console.error("[analyzer] vision error:", e.message, e);
    return null;
  }
}

/* ============ MAIN ENTRY ============ */
async function analyzePhoto({ photo, profile, lang, onProgress }) {
  // For demo/synthetic photo — return empty so result falls back to profile-only
  if (!photo || !photo.src) {
    return { source: "profile-only", zones: null, metrics: null, vision: null };
  }

  onProgress?.({ stage: "load" });
  const img = await new Promise((r) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = photo.src;
  });
  if (!img) return { source: "load-failed", zones: null, metrics: null, vision: null };

  onProgress?.({ stage: "mesh" });
  const landmarks = await runFaceMesh(img).catch(() => null);

  let zones = null, metrics = null;
  if (landmarks) {
    onProgress?.({ stage: "zones" });
    // draw to canvas at native resolution for sampling
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    zones = {};
    try {
      for (const [name, idx] of Object.entries(ZONE_LANDMARKS)) {
        zones[name] = sampleZone(ctx, landmarks, idx, img.width, img.height, Math.max(4, Math.round(img.width * 0.012)));
      }
      metrics = deriveMetricsFromZones(zones);
    } catch (e) {
      zones = null; metrics = null;
    }
  }

  onProgress?.({ stage: "vision" });
  const vision = await visionAnalysis(photo.src, profile, lang).catch(() => null);

  // Confidence: average of mesh-success and vision-success
  // Floor at 60% if we have a real photo (we got past load), since we ran SOMETHING
  let confidence = 60;
  if (landmarks) confidence += 15;
  if (zones) confidence += 10;
  if (vision) confidence = Math.max(confidence, Math.min(95, vision.confidence || 80));

  const source = landmarks ? (vision ? "mesh+vision" : "mesh") : (vision ? "vision" : "fallback");
  console.log("[analyzer] complete:", { source, confidence, hasZones: !!zones, hasVision: !!vision });

  onProgress?.({ stage: "done" });
  return {
    source,
    zones, metrics, vision, confidence: Math.round(confidence),
    landmarks: landmarks ? landmarks.map(p => ({ x: p.x, y: p.y })) : null,
  };
}

window.analyzePhoto = analyzePhoto;
window.detectFaceLandmarks = detectFaceLandmarks;
window.__ZONE_LANDMARKS = ZONE_LANDMARKS;

/* ============ PRODUCT ANALOG FINDER ============
   Identifies a skincare product from a photo, then matches against the local catalog.
   Returns: { identified: {brand, name, category, actives, type}, analogs: [...], notes: "" }
*/
async function analyzeProductPhoto(dataUrl, lang) {
  if (!dataUrl) return { ok: false, reason: "no-photo" };
  if (!hasVisionAI()) {
    return { ok: false, reason: "no-vision" };
  }

  const langInstr = lang === "en" ? "Reply in English." : "Отвечай на русском.";

  const prompt = `You are analyzing a photo of a skincare product (bottle, tube, jar, ampoule).

Identify what you can see on the packaging:
- brand name (if visible)
- product name (if visible)
- product type — STRICT enum: cleanser | toner | serum | moist | spf | eye | mask | exfoliant
- key active ingredients (if listed on packaging)
- volume in ml (if visible)
- target skin type, if labeled (oily, dry, sensitive, etc.)

If the photo doesn't show a skincare product, return {"ok": false, "reason": "not-skincare"}.

Return STRICT JSON only, no prose, no markdown:
{
  "ok": true,
  "brand": "...",
  "name": "...",
  "category": "cleanser|toner|serum|moist|spf|eye|mask|exfoliant",
  "actives": ["...", "..."],
  "volume": "...",
  "targetSkinTypes": ["normal|dry|oily|combo|sensitive|acne|mature|dehydrated"],
  "comment": "1 sentence description (${langInstr.toLowerCase()})",
  "confidence": 0-100
}

${langInstr}`;

  try {
    const visionPromise = callClaude([{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] || "" } },
        { type: "text", text: prompt }
      ]
    }]);
    const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("vision timeout")), 25000));
    const res = await Promise.race([visionPromise, timeoutPromise]);
    const m = res.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, reason: "parse-failed" };
    const parsed = JSON.parse(m[0]);
    if (parsed.ok === false) return parsed;
    return { ...parsed, ok: true };
  } catch (e) {
    console.warn("[analyzer] product vision error:", e.message);
    return { ok: false, reason: "vision-error" };
  }
}

/* Score products in the catalog against an identified product */
function findAnalogs(identified) {
  if (!identified || !identified.category) return [];

  const PRODUCTS = window.__PRODUCTS || [];
  const targetActives = (identified.actives || []).map(a => a.toLowerCase());
  const targetTypes = identified.targetSkinTypes || [];

  const scored = PRODUCTS
    .filter(p => p.category === identified.category)
    .map(p => {
      let score = 0;
      // Same category baseline
      score += 10;

      // Matching actives — strongest signal
      const productActives = (p.actives || []).map(a => a.toLowerCase());
      const sharedActives = targetActives.filter(a =>
        productActives.some(pa => pa.includes(a) || a.includes(pa))
      );
      score += sharedActives.length * 15;

      // Matching target skin types
      const sharedTypes = targetTypes.filter(t => p.types && p.types.includes(t));
      score += sharedTypes.length * 5;

      return { product: p, score, sharedActives, sharedTypes };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return scored;
}

window.analyzeProductPhoto = analyzeProductPhoto;
window.findAnalogs = findAnalogs;

