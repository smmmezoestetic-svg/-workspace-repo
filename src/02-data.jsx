import React from "react";

const { useState, useEffect, useMemo, useRef } = React;

/* ============ DEMO SKIN TYPES ============ */
const SKIN_TYPES = {
  normal: { key: "normal", labelKey: "typeNormal", descKey: "typeNormalDesc",
    metrics: { hydration: 70, oil: 50, sensitivity: 30, pigment: 20, pores: 35, elasticity: 75, evenness: 70 } },
  dry: { key: "dry", labelKey: "typeDry", descKey: "typeDryDesc",
    metrics: { hydration: 30, oil: 25, sensitivity: 50, pigment: 30, pores: 25, elasticity: 55, evenness: 60 } },
  oily: { key: "oily", labelKey: "typeOily", descKey: "typeOilyDesc",
    metrics: { hydration: 55, oil: 88, sensitivity: 35, pigment: 25, pores: 80, elasticity: 70, evenness: 55 } },
  combo: { key: "combo", labelKey: "typeCombo", descKey: "typeComboDesc",
    metrics: { hydration: 50, oil: 70, sensitivity: 40, pigment: 30, pores: 60, elasticity: 70, evenness: 55 } },
  sensitive: { key: "sensitive", labelKey: "typeSensitive", descKey: "typeSensitiveDesc",
    metrics: { hydration: 45, oil: 40, sensitivity: 85, pigment: 35, pores: 30, elasticity: 65, evenness: 50 } },
  acne: { key: "acne", labelKey: "typeAcne", descKey: "typeAcneDesc",
    metrics: { hydration: 50, oil: 80, sensitivity: 60, pigment: 55, pores: 75, elasticity: 70, evenness: 40 } },
  mature: { key: "mature", labelKey: "typeMature", descKey: "typeMatureDesc",
    metrics: { hydration: 45, oil: 35, sensitivity: 45, pigment: 60, pores: 40, elasticity: 35, evenness: 45 } },
  dehydrated: { key: "dehydrated", labelKey: "typeDehydrated", descKey: "typeDehydratedDesc",
    metrics: { hydration: 25, oil: 50, sensitivity: 55, pigment: 35, pores: 45, elasticity: 55, evenness: 55 } },
};

/* ============ ZONES ON THE FACE MAP (% coordinates) ============ */
const FACE_ZONES = {
  forehead:   { x: 50, y: 22, label: { ru: "Лоб",       en: "Forehead" } },
  glabella:   { x: 50, y: 33, label: { ru: "Межбровье", en: "Glabella" } },
  leftEye:    { x: 33, y: 38, label: { ru: "Левая зона глаз", en: "Left eye area" } },
  rightEye:   { x: 67, y: 38, label: { ru: "Правая зона глаз", en: "Right eye area" } },
  nose:       { x: 50, y: 50, label: { ru: "Нос (Т-зона)", en: "Nose (T-zone)" } },
  leftCheek:  { x: 27, y: 56, label: { ru: "Левая щека", en: "Left cheek" } },
  rightCheek: { x: 73, y: 56, label: { ru: "Правая щека", en: "Right cheek" } },
  upperLip:   { x: 50, y: 67, label: { ru: "Над губой",   en: "Upper lip" } },
  chin:       { x: 50, y: 78, label: { ru: "Подбородок",  en: "Chin" } },
};

/* per-type problems mapped onto zones */
const PROBLEM_MAP = {
  normal: [
    { zone: "forehead",   severity: 1, label: { ru: "Лёгкая сухость", en: "Mild dryness" } },
    { zone: "leftEye",    severity: 1, label: { ru: "Едва заметные тонкие линии", en: "Faint fine lines" } },
  ],
  dry: [
    { zone: "leftCheek",  severity: 3, label: { ru: "Шелушение и стянутость", en: "Flaking & tightness" } },
    { zone: "rightCheek", severity: 3, label: { ru: "Шелушение и стянутость", en: "Flaking & tightness" } },
    { zone: "forehead",   severity: 2, label: { ru: "Сухость", en: "Dryness" } },
  ],
  oily: [
    { zone: "forehead",   severity: 3, label: { ru: "Жирный блеск", en: "Oily shine" } },
    { zone: "nose",       severity: 4, label: { ru: "Расширенные поры", en: "Enlarged pores" } },
    { zone: "chin",       severity: 3, label: { ru: "Жирный блеск", en: "Oily shine" } },
  ],
  combo: [
    { zone: "forehead",   severity: 3, label: { ru: "Жирность Т-зоны", en: "Oily T-zone" } },
    { zone: "nose",       severity: 3, label: { ru: "Чёрные точки", en: "Blackheads" } },
    { zone: "leftCheek",  severity: 2, label: { ru: "Сухость щёк", en: "Dry cheeks" } },
    { zone: "rightCheek", severity: 2, label: { ru: "Сухость щёк", en: "Dry cheeks" } },
  ],
  sensitive: [
    { zone: "leftCheek",  severity: 3, label: { ru: "Покраснения", en: "Redness" } },
    { zone: "rightCheek", severity: 3, label: { ru: "Покраснения", en: "Redness" } },
    { zone: "nose",       severity: 2, label: { ru: "Реактивность", en: "Reactivity" } },
  ],
  acne: [
    { zone: "chin",       severity: 4, label: { ru: "Воспаления", en: "Active breakouts" } },
    { zone: "forehead",   severity: 3, label: { ru: "Постакне", en: "Post-acne marks" } },
    { zone: "nose",       severity: 3, label: { ru: "Комедоны", en: "Comedones" } },
    { zone: "leftCheek",  severity: 2, label: { ru: "Высыпания", en: "Breakouts" } },
  ],
  mature: [
    { zone: "leftEye",    severity: 4, label: { ru: "Морщинки", en: "Fine lines" } },
    { zone: "rightEye",   severity: 4, label: { ru: "Морщинки", en: "Fine lines" } },
    { zone: "glabella",   severity: 3, label: { ru: "Залом", en: "Glabella crease" } },
    { zone: "leftCheek",  severity: 2, label: { ru: "Снижение тонуса", en: "Loss of firmness" } },
    { zone: "upperLip",   severity: 2, label: { ru: "Кисетные морщины", en: "Lip lines" } },
  ],
  dehydrated: [
    { zone: "leftCheek",  severity: 3, label: { ru: "Обезвоженность", en: "Dehydration" } },
    { zone: "rightCheek", severity: 3, label: { ru: "Обезвоженность", en: "Dehydration" } },
    { zone: "forehead",   severity: 2, label: { ru: "Тонкие линии обезвоженности", en: "Dehydration lines" } },
  ],
};

/* ============ PRODUCTS (mocked from a generic catalogue) ============ */
/* Each product: { id, name (ru/en), category, price (RUB), volume, actives, types[], goals[], step } */
const PRODUCTS = [
  // Cleansing
  { id: "p01", category: "cleanser", step: "cleanse", price: 1890, volume: "150 мл",
    name: { ru: "Гель «Aqua Pure» очищающий", en: "Aqua Pure cleansing gel" },
    actives: ["PHA", "Allantoin"], types: ["normal","oily","combo","acne"], goals: ["acne","pores","glow"] },
  { id: "p02", category: "cleanser", step: "cleanse", price: 2150, volume: "150 мл",
    name: { ru: "Молочко «Velvet» деликатное", en: "Velvet gentle milk" },
    actives: ["Squalane", "Bisabolol"], types: ["dry","sensitive","mature","dehydrated"], goals: ["hydration","redness"] },
  { id: "p03", category: "cleanser", step: "cleanse", price: 2390, volume: "200 мл",
    name: { ru: "Мицеллярная вода «Soft»", en: "Soft micellar water" },
    actives: ["Niacinamide"], types: ["combo","sensitive","normal"], goals: ["pores","redness"] },

  // Toner
  { id: "p04", category: "toner", step: "tone", price: 2490, volume: "200 мл",
    name: { ru: "Тонер «Hydra-Mist»", en: "Hydra-Mist toner" },
    actives: ["Hyaluronic Acid", "Panthenol"], types: ["dry","dehydrated","sensitive","mature"], goals: ["hydration","redness"] },
  { id: "p05", category: "toner", step: "tone", price: 2690, volume: "150 мл",
    name: { ru: "Тонер с азелаиновой кислотой", en: "Azelaic acid toner" },
    actives: ["Azelaic Acid", "Zinc PCA"], types: ["oily","acne","combo"], goals: ["acne","pigment","pores"] },

  // Serum
  { id: "p05a", category: "serum", step: "serum", price: 4290, volume: "30 мл",
    name: { ru: "Сыворотка «Hydra Lift» с гиалуроном", en: "Hydra Lift hyaluronic serum" },
    actives: ["Hyaluronic 3 weights", "B5"], types: ["dry","dehydrated","mature","normal"], goals: ["hydration","glow"] },
  { id: "p06", category: "serum", step: "serum", price: 4890, volume: "30 мл",
    name: { ru: "Сыворотка «Niacinamide 10»", en: "Niacinamide 10 serum" },
    actives: ["Niacinamide 10%", "Zn"], types: ["oily","combo","acne"], goals: ["pores","pigment","acne"] },
  { id: "p07", category: "serum", step: "serum", price: 5290, volume: "30 мл",
    name: { ru: "Сыворотка «Pigment Stop»", en: "Pigment Stop serum" },
    actives: ["Tranexamic Acid", "Vit C"], types: ["normal","mature","combo"], goals: ["pigment","glow"] },
  { id: "p08", category: "serum", step: "serum", price: 5990, volume: "30 мл",
    name: { ru: "Сыворотка «Retinal 0.05»", en: "Retinal 0.05 serum" },
    actives: ["Retinaldehyde", "Bakuchiol"], types: ["mature","oily","combo"], goals: ["antiage","pigment"] },
  { id: "p09", category: "serum", step: "serum", price: 4490, volume: "30 мл",
    name: { ru: "Сыворотка «Calm Cica»", en: "Calm Cica serum" },
    actives: ["Centella Asiatica", "Madecassoside"], types: ["sensitive","dry","acne"], goals: ["redness","acne"] },
  { id: "p10", category: "serum", step: "serum", price: 5490, volume: "30 мл",
    name: { ru: "Сыворотка «Peptide Lift»", en: "Peptide Lift serum" },
    actives: ["Peptides Matrixyl", "Argireline"], types: ["mature","normal"], goals: ["antiage","glow"] },

  // Eye
  { id: "p11", category: "eye", step: "eye", price: 3290, volume: "15 мл",
    name: { ru: "Крем для век «Bright Eye»", en: "Bright Eye cream" },
    actives: ["Caffeine", "Vit K"], types: ["normal","mature","combo","dry"], goals: ["eyes","antiage"] },

  // Moisturizer
  { id: "p12", category: "moist", step: "moist", price: 3590, volume: "50 мл",
    name: { ru: "Крем «Moisture Veil»", en: "Moisture Veil cream" },
    actives: ["Ceramides", "Glycerin"], types: ["dry","dehydrated","sensitive","mature"], goals: ["hydration","redness"] },
  { id: "p13", category: "moist", step: "moist", price: 3290, volume: "50 мл",
    name: { ru: "Гель-крем «Aqua Light»", en: "Aqua Light gel-cream" },
    actives: ["Hyaluronic", "Squalane"], types: ["oily","combo","acne","normal"], goals: ["hydration","pores"] },
  { id: "p14", category: "moist", step: "moist", price: 4290, volume: "50 мл",
    name: { ru: "Крем «Lift Night»", en: "Lift Night cream" },
    actives: ["Peptides", "Shea"], types: ["mature","dry","normal"], goals: ["antiage","hydration"] },

  // SPF
  { id: "p15", category: "spf", step: "spf", price: 3990, volume: "50 мл",
    name: { ru: "SPF 50 «Daily Shield»", en: "SPF 50 Daily Shield" },
    actives: ["Mineral filters", "Vit E"], types: ["normal","dry","mature","sensitive","combo","oily","acne","dehydrated"],
    goals: ["antiage","pigment","redness","hydration","acne","glow","pores","eyes"] },

  // Mask / weekly
  { id: "p16", category: "mask", step: "weekly", price: 2890, volume: "75 мл",
    name: { ru: "Маска «Clay Detox»", en: "Clay Detox mask" },
    actives: ["Kaolin", "Salicylic"], types: ["oily","combo","acne"], goals: ["pores","acne"] },
  { id: "p17", category: "mask", step: "weekly", price: 2590, volume: "75 мл",
    name: { ru: "Маска «Hydra Sleep»", en: "Hydra Sleep mask" },
    actives: ["Hyaluronic", "Polyglutamic"], types: ["dry","dehydrated","mature","sensitive","normal"], goals: ["hydration","glow"] },
  { id: "p18", category: "exfoliant", step: "weekly", price: 3490, volume: "30 мл",
    name: { ru: "Эксфолиант «Glow AHA/BHA»", en: "Glow AHA/BHA exfoliant" },
    actives: ["AHA 7%", "BHA 1%"], types: ["combo","oily","mature","normal"], goals: ["pores","pigment","glow"] },
];

/* ============ PROFESSIONAL CARE PRODUCTS ============ */
/* Средства для проф.ухода — пилинги, мезококтейли, концентраты, маски-проф */
const PROCEDURES = [
  /* ───── Пилинги ───── */
  { id: "pp01", types: ["mature","normal","combo","pigment"],
    cat: "peel",
    name: { ru: "Пилинг с гликолевой кислотой 35%", en: "Glycolic peel 35%" },
    actives: ["AHA · Glycolic 35%", "Allantoin"],
    volume: "30 мл",
    price: 4200,
    desc: { ru: "Поверхностный пилинг для выравнивания текстуры, тона и борьбы с тонкими линиями. Курс 4–6 процедур.",
            en: "Superficial peel to even texture/tone and address fine lines. Course of 4–6." },
    freqKey: "onceMonth" },
  { id: "pp02", types: ["acne","oily","combo"],
    cat: "peel",
    name: { ru: "Салициловый пилинг 20%", en: "Salicylic peel 20%" },
    actives: ["BHA · Salicylic 20%", "Zinc"],
    volume: "30 мл",
    price: 3900,
    desc: { ru: "Себорегулирующий пилинг для жирной и проблемной кожи. Растворяет себум в порах, уменьшает воспаления.",
            en: "Sebum-regulating peel for oily/acne-prone skin." },
    freqKey: "onceMonth" },
  { id: "pp03", types: ["pigment","mature","dry","normal"],
    cat: "peel",
    name: { ru: "Миндальный пилинг 40%", en: "Mandelic peel 40%" },
    actives: ["Mandelic 40%", "Lactic 5%"],
    volume: "30 мл",
    price: 4500,
    desc: { ru: "Деликатный пилинг для чувствительной и пигментированной кожи. Можно летом.",
            en: "Gentle peel for sensitive and pigmented skin, year-round safe." },
    freqKey: "onceMonth" },

  /* ───── Мезококтейли ───── */
  { id: "pp04", types: ["dehydrated","dry","mature","normal"],
    cat: "meso",
    name: { ru: "Мезококтейль HA Boost", en: "HA Boost meso-cocktail" },
    actives: ["HA нестаб. + стаб.", "B5", "Trehalose"],
    volume: "5 × 5 мл",
    price: 6800,
    desc: { ru: "Биоревитализирующий коктейль для интенсивного увлажнения и плотности кожи. Под мезотерапию или микронидлинг.",
            en: "Bio-revitalising cocktail for intense hydration and density." },
    freqKey: "once2Weeks" },
  { id: "pp05", types: ["mature","normal"],
    cat: "meso",
    name: { ru: "Мезококтейль Anti-Age Peptide", en: "Anti-Age Peptide cocktail" },
    actives: ["Matrixyl 3000", "Argireline", "DMAE"],
    volume: "5 × 5 мл",
    price: 8400,
    desc: { ru: "Пептидный коктейль для лифтинга, упругости и сокращения мимических морщин.",
            en: "Peptide cocktail for lifting, firmness, expression-line reduction." },
    freqKey: "once2Weeks" },
  { id: "pp06", types: ["pigment","mature","combo"],
    cat: "meso",
    name: { ru: "Мезококтейль Brightening", en: "Brightening cocktail" },
    actives: ["Tranexamic acid", "Glutathione", "Vit C"],
    volume: "5 × 5 мл",
    price: 7600,
    desc: { ru: "Депигментирующий коктейль: осветляет постакне, мелазму и общую неравномерность тона.",
            en: "Depigmenting cocktail for PIH, melasma and uneven tone." },
    freqKey: "once2Weeks" },
  { id: "pp07", types: ["acne","oily","combo"],
    cat: "meso",
    name: { ru: "Мезококтейль Sebum Control", en: "Sebum Control cocktail" },
    actives: ["Niacinamide 4%", "Zinc PCA", "Salicylic"],
    volume: "5 × 5 мл",
    price: 6200,
    desc: { ru: "Коктейль для проблемной кожи: матирование, противовоспалительное действие, сужение пор.",
            en: "Cocktail for acne-prone skin: mattifying, anti-inflammatory, pore-tightening." },
    freqKey: "once2Weeks" },

  /* ───── Концентраты / ампулы ───── */
  { id: "pp08", types: ["sensitive","dry","dehydrated","acne"],
    cat: "concentrate",
    name: { ru: "Концентрат восстанавливающий Cica", en: "Cica recovery concentrate" },
    actives: ["Centella 5%", "Panthenol 5%", "Madecassoside"],
    volume: "10 × 2 мл",
    price: 4900,
    desc: { ru: "Профессиональный концентрат для восстановления барьера после агрессивных процедур.",
            en: "Pro concentrate to restore the barrier post-procedure." },
    freqKey: "courseOf10" },
  { id: "pp09", types: ["mature","pigment","normal"],
    cat: "concentrate",
    name: { ru: "Ампулы Vitamin C 20%", en: "Vitamin C 20% ampoules" },
    actives: ["L-ascorbic 20%", "Ferulic", "Vit E"],
    volume: "10 × 2 мл",
    price: 5400,
    desc: { ru: "Антиоксидантный курс для сияния и осветления тона. Под маску или массаж.",
            en: "Antioxidant course for radiance and tone evening." },
    freqKey: "courseOf10" },

  /* ───── Профессиональные маски ───── */
  { id: "pp10", types: ["dehydrated","dry","sensitive","mature"],
    cat: "promask",
    name: { ru: "Альгинатная маска Hyaluronic", en: "Hyaluronic alginate mask" },
    actives: ["HA", "Spirulina", "Chlorella"],
    volume: "200 г",
    price: 1800,
    desc: { ru: "Финишная альгинатная маска под все проф.процедуры — фиксирует активы, успокаивает.",
            en: "Finishing alginate mask — locks in actives, calms the skin." },
    freqKey: "everyProcedure" },
  { id: "pp11", types: ["acne","oily","combo"],
    cat: "promask",
    name: { ru: "Альгинатная маска Anti-Acne", en: "Anti-Acne alginate mask" },
    actives: ["Tea tree", "Zinc", "Sulfur"],
    volume: "200 г",
    price: 1900,
    desc: { ru: "Финишная маска для проблемной кожи: подсушивает, снимает воспаление.",
            en: "Finishing mask for problem skin — drying, anti-inflammatory." },
    freqKey: "everyProcedure" },
];

/* ============ ROUTINE STEP TEMPLATES ============ */
const STEP_TEMPLATES = {
  cleanse:  { am: { ru: "Очищение", en: "Cleanse" },         pm: { ru: "Очищение", en: "Cleanse" } },
  tone:     { am: { ru: "Тонер",     en: "Toner" },          pm: { ru: "Тонер",     en: "Toner" } },
  serum:    { am: { ru: "Сыворотка", en: "Serum" },          pm: { ru: "Сыворотка (актив)", en: "Serum (active)" } },
  eye:      { am: { ru: "Крем для век", en: "Eye cream" },   pm: { ru: "Крем для век", en: "Eye cream" } },
  moist:    { am: { ru: "Лёгкий крем", en: "Light cream" },  pm: { ru: "Питательный крем", en: "Rich cream" } },
  spf:      { am: { ru: "SPF",       en: "SPF" },            pm: null },
  weekly:   { am: null, pm: { ru: "Еженедельно", en: "Weekly" } },
};

/* ============ DETERMINE TYPE FROM PROFILE ============ */
function determineSkinType(profile) {
  if (profile.demoType && profile.demoType !== "auto") return profile.demoType;
  // very simplified scoring based on selected concerns
  const c = profile.concerns || {};
  if (c.acne) return "acne";
  if (c.couperose) return "sensitive";
  if (c.wrinkles && profile.age >= 35) return "mature";
  if (c.pigment && profile.age >= 30) return "mature";
  if (c.pores && c.shine) return "oily";
  if (c.shine && c.dryness) return "combo";
  if (c.dryness) return "dry";
  if (c.tightness) return "dehydrated";
  if (c.shine) return "oily";
  if (c.sensitivity) return "sensitive";
  return "normal";
}

/* ============ BUILD ROUTINE ============ */
function buildRoutine(typeKey, goals, budget) {
  const allMatching = (cat) => PRODUCTS.filter(p => p.category === cat && p.types.includes(typeKey));
  const score = (p) => {
    let s = 0;
    Object.keys(goals).forEach(g => { if (goals[g] && p.goals.includes(g)) s += 2; });
    return s;
  };
  const pick = (cat, n = 1) => {
    const arr = [...allMatching(cat)].sort((a,b) => score(b) - score(a));
    return arr.slice(0, n);
  };
  const am = [
    ...pick("cleanser", 1),
    ...pick("toner", 1),
    ...pick("serum", 1),
    ...pick("eye", 1),
    ...pick("moist", 1),
    ...pick("spf", 1),
  ];
  const pmSerums = pick("serum", 2);
  const pm = [
    ...pick("cleanser", 1),
    ...pick("toner", 1),
    ...(pmSerums[1] ? [pmSerums[1]] : pmSerums),
    ...pick("eye", 1),
    ...pick("moist", 1),
  ];
  const weekly = [
    ...pick("mask", 1),
    ...pick("exfoliant", 1),
  ].filter(Boolean);

  // dedupe
  const seen = new Set();
  const dedupe = arr => arr.filter(p => p && !seen.has(p.id) && (seen.add(p.id), true));
  // Keep AM as is (preserve order), PM only items not already in AM if budget tight
  const amDedup = am.filter(Boolean);
  amDedup.forEach(p => seen.add(p.id));
  const pmDedup = pm.filter(p => p);

  return { am: amDedup, pm: pmDedup, weekly };
}

window.__SKIN_TYPES = SKIN_TYPES;
window.__FACE_ZONES = FACE_ZONES;
window.__PROBLEM_MAP = PROBLEM_MAP;
window.__PRODUCTS = PRODUCTS;
window.__PROCEDURES = PROCEDURES;
window.__STEP_TEMPLATES = STEP_TEMPLATES;
window.determineSkinType = determineSkinType;
window.buildRoutine = buildRoutine;

