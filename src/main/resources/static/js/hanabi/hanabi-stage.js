// 縁 · 오늘의 우연 — 3D 축제 거리 뽑기 연출 (Three.js + GSAP)
// 사용법은 파일 맨 아래 createHanabiStage 주석 참고.
// 의존성: import map 의 'three', 'three/addons/' + 전역 window.gsap
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const gsap = window.gsap;

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

/**
 * @param {HTMLCanvasElement} canvas  화면을 덮는 canvas
 * @param {{ calm?: boolean }} [opts]  calm: true → 차분한 모드 (카메라 고정, 진동 없음)
 * @returns {{ play: Function, release: Function, skip: Function, abort: Function, idle: Function, introGlyph: Function, setScroll: Function, ambient: Function, destroy: Function }}
 *
 * 흐름: play() → (API 응답 오면) release() → 등불이 떠올라 터지는 순간 onBurst 콜백 → 결과 카드 표시
 *  - release() 전에는 등불이 매듭 지어진 상태에서 맥박 치며 기다림 (API가 느려도 자연스럽게 대기)
 *  - skip(): 남은 연출 없이 바로 결과 (onBurst 즉시 호출)
 *  - abort(): API 실패 시 연출을 접고 대기 화면으로
 */
export function createHanabiStage(canvas, opts = {}) {
  // calm: 동작 줄이기 켜진 기기용. 3D·등불·불꽃은 그대로, 카메라 흔들림·이동·진동만 뺌
  const calm = !!opts.calm;
  // 페이지마다 다른 무대: street(홈·뽑기) / yatai(축제 목록) / shrine(축제 상세) / alley(주변 맛집) / river(로그인)
  const SCENE = opts.scene || 'street';
  const lite = !!opts.lite;
  const buzz = (p) => { if (calm) return; try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };
  let renderer;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const PR = Math.min(devicePixelRatio || 1, lite ? 1.75 : 2.5);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const NIGHT = new THREE.Color('#070A1A');
  scene.background = NIGHT;
  scene.fog = new THREE.FogExp2(NIGHT, 0.034);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  // 세로로 긴 폰 화면이면 거리를 좁히고 카메라를 뒤로, 장면을 화면 위쪽으로 (아래는 글자·카드 자리)
  const _r0 = canvas.getBoundingClientRect();
  const portrait = (_r0.width || innerWidth) / (_r0.height || innerHeight) < .75;
  const P = portrait ? {
    sx: 2.25, wx: 3.3, bx: 4.1,
    camHome: [0, 1.9, 10.5], lookHome: [0, .5, -10],
    rouletteCam: [0, 2.5, 9.5], rouletteLook: [0, 4.4, -8],
    liftLook: 10.6, finalLook: 10.5, glyphW: 3.3, introGlyph: [0, 9.2, -16], introW: 6.2,
  } : {
    sx: 3.3, wx: 4.6, bx: 5.2,
    camHome: [0, 1.7, 8], lookHome: [0, 4.2, -10],
    rouletteCam: [0, 3, 8.5], rouletteLook: [0, 3.8, -10],
    liftLook: 11, finalLook: 9.5, glyphW: 5.2, introGlyph: [0, 13.4, -16], introW: 8,
  };
  if (SCENE === 'ema') { P.camHome = [0, 1.7, portrait ? 1.6 : 1.2]; P.lookHome = [0, portrait ? 3.15 : 2.6, -4]; P.introGlyph = [0, 5.6, -10]; P.introW = portrait ? 3 : 5; }
  if (SCENE === 'goldfish') { P.camHome = [0, portrait ? 12.5 : 9, portrait ? 3.2 : 2.4]; P.lookHome = [0, 0, -.3]; P.introGlyph = [0, 2.5, -1]; P.introW = portrait ? 3.2 : 5; }
  if (SCENE === 'moon') { P.camHome = [0, 1.2, 10]; P.lookHome = [0, portrait ? 4.2 : 3.4, -20]; P.introGlyph = [0, 13, -40]; P.introW = portrait ? 8 : 12; }
  if (SCENE === 'river') { P.camHome = portrait ? [0, 1.6, 9] : [0, 1.4, 8]; P.lookHome = portrait ? [0, -1.6, -10] : [0, .6, -10]; }
  if (SCENE === 'shrine') { P.camHome = portrait ? [0, 1.7, 4] : [0, 1.7, 6]; P.lookHome = portrait ? [0, -1.4, -18] : [0, 2.6, -18]; P.introGlyph = portrait ? [0, 10.3, -24] : [0, 12.5, -24]; P.introW = portrait ? 5 : 7; }
  if (SCENE === 'yatai') { P.lookHome = portrait ? [0, -.4, -10] : [0, 3, -10]; }
  if (SCENE === 'alley') { P.lookHome = portrait ? [0, 1.2, -10] : [0, 3.4, -10]; }
  const CAM_HOME = new THREE.Vector3(...P.camHome);
  const LOOK_HOME = new THREE.Vector3(...P.lookHome);
  camera.position.copy(CAM_HOME);
  const look = LOOK_HOME.clone();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(PR);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .75, .5, .78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ───────── textures (drawn, no images) ─────────
  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.2, 'rgba(255,220,170,0.8)');
    r.addColorStop(0.5, 'rgba(255,120,60,0.25)');
    r.addColorStop(1, 'rgba(255,80,40,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function paperTexture(kanji) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#E8502F'; g.fillRect(0, 0, 1024, 512);
    for (let y = 0; y < 512; y += 28) { g.fillStyle = 'rgba(120,20,10,0.35)'; g.fillRect(0, y, 1024, 3); }
    if (kanji) {
      g.fillStyle = '#1A0E08';
      g.font = '900 230px "Zen Old Mincho", serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(kanji, 256, 270);   // u=0.25 → faces +Z (camera)
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const GLOW = glowTexture();
  

  // ───────── world ─────────
  scene.add(new THREE.HemisphereLight('#3A3F7A', '#120A08', 0.35));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 120),
    new THREE.MeshStandardMaterial({ color: '#0E0F1C', roughness: 0.35, metalness: 0.2 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.z = -40;
  scene.add(ground);

  if (SCENE === 'street') {
  // buildings: dark boxes with a few warm windows
  const bMat = new THREE.MeshStandardMaterial({ color: '#0B0C18', roughness: 0.9 });
  const winMat = new THREE.MeshBasicMaterial({ color: '#FFB866' });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const h = 4 + Math.random() * 6, w = 2.5 + Math.random() * 1.5;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.2), bMat);
      b.position.set(side * (P.bx + w / 2 - 1.25 + Math.random() * .6), h / 2, 4 - i * 4);
      scene.add(b);
      for (let k = 0; k < 3; k++) {
        if (Math.random() < .5) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .7), winMat);
        win.position.set(side * (5.2 - w / 2 - .01) * 1 + side * .0, 1.5 + Math.random() * (h - 2.5), b.position.z + (Math.random() - .5) * 2);
        win.position.x = b.position.x - side * (w / 2 + .01);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        scene.add(win);
      }
    }
  }

  }

  // lanterns — barrel-shaped ribbed paper (lathe) lit from inside
  const RIBS = 20;
  function lanternProfile() {
    const pts = [], H = 0.72, R = 0.47, E = 2.6;
    for (let i = 0; i <= 120; i++) {
      const y = -H + i / 120 * 2 * H;
      let r = R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y / (H + .06)), E)), 1 / E);
      r = Math.max(r, 0.17);
      const k = (y + H) / (2 * H) * RIBS;
      r *= 1 + 0.022 * Math.pow(Math.abs(Math.cos(k * Math.PI)), 6);   // raised bamboo rib
      pts.push(new THREE.Vector2(r, y));
    }
    return pts;
  }
  const bodyGeo = new THREE.LatheGeometry(lanternProfile(), 72);
  const capGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.2, 0.0), new THREE.Vector2(0.215, 0.015),
    new THREE.Vector2(0.215, 0.075), new THREE.Vector2(0.2, 0.09), new THREE.Vector2(0.0, 0.09)], 36);
  const capMat = new THREE.MeshStandardMaterial({ color: '#120C09', roughness: 0.22, metalness: 0.55 });
  const tasselGeo = new THREE.CylinderGeometry(0.03, 0.065, 0.4, 10);
  const tasselMat = new THREE.MeshStandardMaterial({ color: '#A51E16', roughness: 0.85 });
  const hookGeo = new THREE.TorusGeometry(0.055, 0.011, 8, 16);

  function rnd(seed) { let x = seed * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); }
  function lanternPaper(text, kind = 'red', seed = 1) {
    const r = rnd(seed);
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    g.scale(.5, .5);
    const base = kind === 'white' ? ['#B9A88C', '#E6D6B8', '#EFE0C4'] : ['#B5341C', '#E9542F', '#F2643A'];
    const grad = g.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, base[0]); grad.addColorStop(.18, base[1]); grad.addColorStop(.5, base[2]);
    grad.addColorStop(.82, base[1]); grad.addColorStop(1, base[0]);
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
    // washi fibre and blotches
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = `rgba(${kind === 'white' ? '120,90,50' : '90,20,8'},${r() * .06})`;
      g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 1 + r() * 6, .5 + r() * 1.5, r() * 3.14, 0, 6.28); g.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * 1024, y = r() * 1024, rad = 30 + r() * 90;
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, `rgba(${kind === 'white' ? '200,160,100' : '120,30,10'},${.05 + r() * .06})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // vertical paper seams (overlapping sheets look a bit denser)
    for (let k = 0; k < 6; k++) { const x = (k + r() * .3) / 6 * 1024; g.fillStyle = 'rgba(80,20,10,.08)'; g.fillRect(x, 0, 6, 1024); }
    // backlit bamboo ribs: dark thin lines, slightly wavy
    for (let k = 1; k < RIBS; k++) {
      const y0 = k / RIBS * 1024;
      g.strokeStyle = `rgba(40,10,4,${.55 + r() * .15})`; g.lineWidth = 3.5;
      g.beginPath();
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y0 + Math.sin(x / 90 + k) * 1.6);
      g.stroke();
    }
    // brush lettering, vertical, like real chōchin
    if (text) {
      g.fillStyle = kind === 'white' ? '#141010' : '#120806';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...text], size = chars.length === 1 ? 430 : chars.length === 2 ? 300 : 230;
      g.font = `900 ${size}px "Zen Old Mincho", "Noto Serif JP", serif`;
      const step = size * .95, top = 512 - (chars.length - 1) * step / 2;
      chars.forEach((ch, i) => { g.globalAlpha = .93; g.fillText(ch, 512, top + i * step + 10); });
      g.globalAlpha = 1;
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }

  // light passes through thin paper: brightest where we look straight in, darker toward the rim,
  // plus a soft hot spot where the candle sits
  function paperMaterial(tex, warm) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(warm), emissiveIntensity: .05, roughness: .9, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvLY = position.y;').replace('void main() {', 'varying float vLY;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vLY;\nvoid main() {').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        float through = mix(.38, 1.25, pow(facing, 1.4));
        float hot = exp(-pow(vLY / .32, 2.)) * pow(facing, 3.) * .9;
        float cap = smoothstep(.72, .5, abs(vLY));
        totalEmissiveRadiance *= (through + hot) * mix(.45, 1., cap);`);
    };
    return mat;
  }

  const STREET_TEXT = [null, '祭', null, '縁日', null, '御神燈', null, '祭', '寄道', null];
  const PAPERS = STREET_TEXT.map((t, i) => lanternPaper(t, i === 5 || i === 8 ? 'white' : 'red', i + 3));
  const PAPER = PAPERS[0];

  function makeLantern(tex, scale = 1, hero = false, white = false) {
    const g = new THREE.Group();
    const mat = paperMaterial(tex, white ? '#F2A866' : '#FF6A38');
    const body = new THREE.Mesh(bodyGeo, mat);
    if (hero) body.rotation.y = Math.PI;          // lettering (u=0.5) faces +Z
    const top = new THREE.Mesh(capGeo, capMat); top.position.y = 0.66;
    const bot = new THREE.Mesh(capGeo, capMat); bot.rotation.x = Math.PI; bot.position.y = -0.66;
    const hook = new THREE.Mesh(hookGeo, capMat); hook.position.y = 0.82;
    const tassel = new THREE.Mesh(tasselGeo, tasselMat); tassel.position.y = -0.98;
    const core = new THREE.PointLight('#FF8A48', 0, 3.2, 2);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: white ? '#FFC07A' : '#FF7A48', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.2);
    g.add(body, top, bot, hook, tassel, glow);
    if (hero) g.add(core);
    g.scale.setScalar(scale);
    g.userData = { mat, glow, core, phase: Math.random() * 6.28, lit: 0 };
    return g;
  }
  function setLit(l, v) { l.userData.lit = v; }

  const street = [];   // 이 배열의 등불은 흔들림·깜빡임이 자동으로 적용됨 (모든 무대 공용)
  const ROWS = 9;
  if (SCENE === 'street') for (let i = 0; i < ROWS; i++) {
    for (const side of [-1, 1]) {
      const idx = (i * 2 + (side > 0 ? 1 : 0)) % PAPERS.length;
      const l = makeLantern(PAPERS[idx], 0.9, false, idx === 5 || idx === 8);
      l.children[0].rotation.y = side < 0 ? -Math.PI * .75 : Math.PI * .75;   // lettering faces the street / viewer
      l.position.set(side * P.sx, 3.3, 2 - i * 4.2);
      scene.add(l); street.push(l);
    }
  }
  // wires across the street
  const wireMat = new THREE.LineBasicMaterial({ color: '#3A3550' });
  if (SCENE === 'street') for (let i = 0; i < ROWS; i++) {
    const z = 2 - i * 4.2;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-P.wx, 4.3, z), new THREE.Vector3(0, 3.7, z), new THREE.Vector3(P.wx, 4.3, z));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), wireMat));
  }


  // ───────── 페이지별 무대 ─────────
  const W = portrait ? .72 : 1;          // 세로 화면이면 좌우 폭을 좁힘
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  // 간판·노렌 글씨 (캔버스 비율 = 실제 판 비율이라 글자가 안 늘어남)
  function textBanner(text, bg, fg, vertical = false, aspect = 1) {
    const w = vertical ? 256 : Math.round(256 * Math.max(1, aspect)), h = vertical ? Math.round(256 / Math.min(1, aspect)) : 256;
    return canvasTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 900; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...text];
      if (vertical) {
        const size = Math.min(w * .7, h * .86 / chars.length);
        g.font = `900 ${size}px "Zen Old Mincho", "Noto Serif JP", serif`;
        chars.forEach((ch, i) => g.fillText(ch, w / 2, h / 2 + (i - (chars.length - 1) / 2) * size));
      } else {
        const size = Math.min(h * .62, w * .86 / chars.length);
        g.font = `900 ${size}px "Zen Old Mincho", "Noto Serif JP", serif`;
        g.fillText(text, w / 2, h / 2 + size * .05);
      }
    });
  }
  const darkWood = new THREE.MeshStandardMaterial({ color: '#2A1A10', roughness: .8 });
  const facing = (side) => (side < 0 ? Math.PI / 2 : -Math.PI / 2);   // 길 가운데를 바라보게
  const swayers = [];   // 바람에 흔들리는 천 (노렌·깃발)
  let SKY_EVERY = 2600, DRIFT = 0, SCROLL_DEPTH = 9;   // DRIFT: 카메라가 천천히 앞뒤로 걷는 거리, SCROLL_DEPTH: 스크롤 끝까지 내렸을 때 들어가는 거리

  // 축제 목록: 노점(屋台) 거리 — 입체 포장마차, 줄무늬 지붕, 두께 있는 간판, 진열대 음식, 처마 등불
  if (SCENE === 'yatai') {
    SKY_EVERY = 3200; DRIFT = 6; SCROLL_DEPTH = 14;
    const stripe = canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#F2EDE2' : '#D8392A'; g.fillRect(x, 0, 32, h); } });
    stripe.wrapS = THREE.RepeatWrapping; stripe.repeat.set(3, 1);
    const awnMat = new THREE.MeshStandardMaterial({ map: stripe, emissiveMap: stripe, emissive: new THREE.Color('#FF9A5A'), emissiveIntensity: .55, roughness: .9 });
    const valance = stripe.clone(); valance.needsUpdate = true; valance.repeat.set(6, 1);
    const valMat = new THREE.MeshStandardMaterial({ map: valance, emissiveMap: valance, emissive: new THREE.Color('#FFB070'), emissiveIntensity: .8, roughness: .9 });
    const wood = new THREE.MeshStandardMaterial({ color: '#5A3820', roughness: .75 });
    const interior = new THREE.MeshStandardMaterial({ color: '#2A160C', emissive: '#FF9A50', emissiveIntensity: 1.1, roughness: 1 });
    for (const z of [0, -10, -20]) { const pl = new THREE.PointLight('#FFB070', 7, 13, 1.6); pl.position.set(0, 2.3, z); scene.add(pl); }
    const FLAG = [['#F4EBD8', '#B3261A'], ['#B3261A', '#FFF4E0'], ['#1F2E6B', '#FFF4E0'], ['#F2C14E', '#3A1206']];
    const pole = new THREE.MeshStandardMaterial({ color: '#C9B48A', roughness: .7 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#E8E2D4', roughness: .8 });
    const FOOD = [
      { c: '#D9822B', r: .09, n: 14 },  // たこ焼き
      { c: '#F6B6D2', r: .16, n: 6 },   // わたあめ
      { c: '#C8141E', r: .11, n: 8 },   // りんご飴
      { c: '#8FD3F5', r: .12, n: 6 },   // かき氷
      { c: '#E9C46A', r: .1, n: 10 },   // ベビーカステラ
    ];
    const NAMES = ['焼きそば', 'たこ焼き', '金魚すくい', 'わたあめ', 'かき氷', 'りんご飴', '射的', 'ラムネ', 'お面', 'やきとり', 'チョコバナナ', '輪投げ', 'ベビーカステラ', 'いか焼き'];
    const lean = (side) => side;   // 지붕은 길 쪽으로 기울어짐
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const z = 1 - i * 5, x = side * 3.0 * W, g = new THREE.Group();
      g.position.set(x, 0, z); g.rotation.y = facing(side) - Math.PI / 2 * 0;   // 그룹 로컬: +X = 길 가운데 쪽
      const inward = -side;   // 월드 기준 길 가운데 방향 (x 부호)
      // 진열대(앞판·상판), 뒷벽(안쪽 불빛)
      const front = new THREE.Mesh(new THREE.BoxGeometry(.12, .95, 3.2), wood); front.position.set(inward * .62, .48, 0);
      const top = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, 3.3), edgeMat); top.position.set(inward * .42, .98, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(.1, 2.4, 3.2), interior); back.position.set(-inward * .55, 1.2, 0);
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, .08), wood); sideL.position.set(0, 1.2, -1.6);
      const sideR = sideL.clone(); sideR.position.z = 1.6;
      g.add(front, top, back, sideL, sideR);
      // 기둥
      for (const dz of [-1.6, 1.6]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(.09, 2.7, .09), wood); post.position.set(inward * .62, 1.35, dz); g.add(post);
      }
      // 지붕: 두께 있는 경사판 + 앞쪽 처마 천
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, .06, 3.7), awnMat);
      roof.position.set(inward * .25, 2.85, 0); roof.rotation.z = inward * -.28; g.add(roof);
      const val = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, 3.7), valMat); val.position.set(inward * 1.14, 2.45, 0); g.add(val);
      // 간판: 두께 있는 상자, 길 쪽 면에만 글씨
      const name = NAMES[(i * 2 + (side > 0 ? 1 : 0)) % NAMES.length];
      const signTex = textBanner(name, '#F4EBD8', '#B3261A', false, 2.4 / .5);
      const signFace = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false });
      const signMats = [wood, wood, wood, wood, wood, wood];
      signMats[inward > 0 ? 0 : 1] = signFace;   // +X 면 또는 -X 면
      const sign = new THREE.Mesh(new THREE.BoxGeometry(.08, .5, 2.4), signMats);
      // BoxGeometry 의 +X/-X 면 UV 는 Z 축을 따라 펼쳐짐 → 글자 방향 맞추기
      signTex.center.set(.5, .5); signTex.rotation = 0; signTex.repeat.x = inward > 0 ? -1 : 1; signTex.wrapS = THREE.RepeatWrapping;
      sign.position.set(inward * 1.18, 2.05, 0); g.add(sign);
      // 진열대 위 음식
      const f = FOOD[(i + (side > 0 ? 2 : 0)) % FOOD.length];
      const fm = new THREE.MeshStandardMaterial({ color: f.c, roughness: .5, emissive: f.c, emissiveIntensity: .15 });
      const fg = new THREE.SphereGeometry(f.r, 12, 8);
      for (let k = 0; k < f.n; k++) {
        const ball = new THREE.Mesh(fg, fm);
        ball.position.set(inward * (.3 + Math.random() * .25), 1.04 + f.r, -1.3 + k * (2.6 / f.n)); g.add(ball);
      }
      g.rotation.y = 0; scene.add(g);
      // のぼり 깃발: 보는 사람 쪽(+Z)을 향한 세로 깃발, 바람에 흔들림
      const [fbg, ffg] = FLAG[(i + (side > 0 ? 1 : 0)) % FLAG.length];
      const px = x + inward * 1.45, pz = z + 1.75;
      const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 3.4, 6), pole); pl2.position.set(px, 1.7, pz); scene.add(pl2);
      const flagGeo = new THREE.PlaneGeometry(.55, 2.1); flagGeo.translate(inward * .3, 0, 0);
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ map: textBanner(name, fbg, ffg, true, .55 / 2.1), toneMapped: false, side: THREE.DoubleSide }));
      const fp = new THREE.Group(); fp.position.set(px, 2.15, pz); fp.rotation.y = inward * .35; fp.add(flag); scene.add(fp);
      swayers.push({ o: flag, ph: Math.random() * 6.28, amp: .18, axis: 'y' });
      for (const dz of [-1.3, 0, 1.3]) {
        const l = makeLantern(PAPERS[(i + (dz > 0 ? 3 : dz < 0 ? 1 : 0)) % PAPERS.length], .36);
        l.position.set(x + inward * 1.25, 2.55 - .45, z + dz); scene.add(l); street.push(l);
      }
    }
    for (let i = 0; i < 7; i++) {   // 길 위를 가로지르는 등불 줄
      const z = -1.5 - i * 5;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.4 * W, 3.7, z), new THREE.Vector3(0, 3.2, z), new THREE.Vector3(3.4 * W, 3.7, z));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)), wireMat));
      for (const tt of [.3, .5, .7]) { const l = makeLantern(PAPERS[(i + tt * 10) % PAPERS.length | 0], .42); l.position.copy(curve.getPoint(tt)).add(new THREE.Vector3(0, -.45, 0)); scene.add(l); street.push(l); }
    }
  }

  // 축제 상세: 신사 — 붉은 도리이, 석등 길, 그 위로 큰 불꽃놀이
  if (SCENE === 'shrine') {
    SKY_EVERY = 1500; SCROLL_DEPTH = 30;
    const red = new THREE.MeshStandardMaterial({ color: '#C8341F', emissive: '#5A1208', emissiveIntensity: .6, roughness: .5 });
    const black = new THREE.MeshStandardMaterial({ color: '#141010', roughness: .4, metalness: .3 });
    function torii(z, s) {
      const g = new THREE.Group();
      for (const x of [-2.1, 2.1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(.24, .3, 5.4, 16), red); p.position.set(x, 2.7, 0); g.add(p);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.36, .38, .5, 16), black); base.position.set(x, .25, 0); g.add(base);
      }
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.4, .28, .3), red); nuki.position.y = 4.3; g.add(nuki);
      const shimaki = new THREE.Mesh(new THREE.BoxGeometry(6.4, .3, .45), red); shimaki.position.y = 5.25; g.add(shimaki);
      for (const sgn of [-1, 1]) {   // 양 끝이 살짝 올라간 지붕 보 (笠木)
        const k = new THREE.Mesh(new THREE.BoxGeometry(3.6, .32, .6), black);
        k.position.set(sgn * 1.7, 5.62, 0); k.rotation.z = sgn * .07; g.add(k);
      }
      const gaku = new THREE.Mesh(new THREE.PlaneGeometry(.55, .9), new THREE.MeshBasicMaterial({ map: textBanner('神社', '#141010', '#F2C14E', true, .55 / .9), toneMapped: false }));
      gaku.position.set(0, 4.8, .2); g.add(gaku);
      g.position.z = z; g.scale.setScalar(s); scene.add(g);
    }
    torii(-12, 1); torii(-24, .9); torii(-34, .8);
    for (const z of [-9, -21]) { const pl = new THREE.PointLight('#FF8A50', 9, 16, 1.6); pl.position.set(0, 3.2, z); scene.add(pl); }
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 60), new THREE.MeshStandardMaterial({ color: '#3A3A44', roughness: .6 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, .01, -20); scene.add(path);
    const stone = new THREE.MeshStandardMaterial({ color: '#5E5A55', roughness: .95 });
    const fire = new THREE.MeshBasicMaterial({ color: '#FFC27A', toneMapped: false });
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {   // 석등 (灯籠)
      const g = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .5), stone); b1.position.y = .1; g.add(b1);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, 1, 8), stone); col.position.y = .7; g.add(col);
      const box = new THREE.Mesh(new THREE.BoxGeometry(.5, .45, .5), stone); box.position.y = 1.42; g.add(box);
      const win = new THREE.Mesh(new THREE.BoxGeometry(.52, .2, .3), fire); win.position.y = 1.44; g.add(win);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(.5, .35, 4), stone); roof.position.y = 1.82; roof.rotation.y = Math.PI / 4; g.add(roof);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB067', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.y = 1.44; halo.scale.setScalar(1.6); g.add(halo);
      g.position.set(side * 2.0 * W + side * .3, 0, -1 - i * 4.2); scene.add(g);
    }
    for (let i = 0; i < 6; i++) {   // 뒤쪽 숲·산 실루엣
      const hill = new THREE.Mesh(new THREE.SphereGeometry(10 + Math.random() * 6, 20, 12), new THREE.MeshBasicMaterial({ color: '#04050C' }));
      hill.position.set((i - 2.5) * 12, -6, -55 - Math.random() * 10); scene.add(hill);
    }
  }

  // 주변 맛집: 붉은 초칭(赤ちょうちん) 골목 — 처마, 돌출 간판, 흔들리는 노렌, 가게 등불
  if (SCENE === 'alley') {
    SKY_EVERY = 4200; DRIFT = 5; SCROLL_DEPTH = 14;
    const wallMat = new THREE.MeshStandardMaterial({ color: '#1A1520', roughness: .9 });
    const wall2 = new THREE.MeshStandardMaterial({ color: '#221A22', roughness: .9 });
    const tile = new THREE.MeshStandardMaterial({ color: '#0E0D14', roughness: .5, metalness: .4 });
    const wood = new THREE.MeshStandardMaterial({ color: '#3B2416', roughness: .8 });
    const winMat2 = new THREE.MeshBasicMaterial({ color: '#FFB866' });
    const doorGlow = new THREE.MeshBasicMaterial({ color: '#FFB067', transparent: true, opacity: .6 });
    const SIGNS = ['居酒屋', 'やきとり', 'ラーメン', '酒', 'おでん', '寿司', '串カツ', '定食', 'お好み焼', 'うどん'];
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const z = 2 - i * 3.6, wx = side * 2.5 * W, inward = -side;
      const h = 4.4 + Math.random() * 2.6;
      const b = new THREE.Mesh(new THREE.BoxGeometry(2, h, 3.5), i % 2 ? wallMat : wall2); b.position.set(wx + side * 1, h / 2, z); scene.add(b);
      // 1층 처마 (길 쪽으로 튀어나온 기와 지붕) + 2층 처마
      for (const [y, d] of [[2.75, .8], [h - .2, .5]]) {
        const eave = new THREE.Mesh(new THREE.BoxGeometry(d, .1, 3.6), tile);
        eave.position.set(wx + inward * d / 2, y, z); eave.rotation.z = inward * -.32; scene.add(eave);
        const fascia = new THREE.Mesh(new THREE.BoxGeometry(.06, .14, 3.6), wood);
        fascia.position.set(wx + inward * d, y - .12, z); scene.add(fascia);
      }
      // 2층 창 (나무 격자 느낌으로 두 칸)
      for (let k = 0; k < 2; k++) {
        if (Math.random() < .3) continue;
        const w = new THREE.Mesh(new THREE.BoxGeometry(.04, .55, .7), winMat2);
        w.position.set(wx + inward * .02, 3.5 + (k ? .0 : 0), z - .7 + k * 1.4); scene.add(w);
      }
      // 돌출 간판 (벽에서 길 쪽으로 튀어나온 세로 간판, 양면 글씨)
      const sign = SIGNS[(i * 2 + (side > 0 ? 1 : 0)) % SIGNS.length];
      if (i % 2 === 0) {
        const t = textBanner(sign, '#F4EBD8', '#1A1A1A', true, .45 / 1.5);
        const face = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
        const board = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.5, .1), [wood, wood, wood, wood, face, face]);
        board.position.set(wx + inward * .55, 3.9, z + 1.2); board.rotation.y = 0; scene.add(board);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(.6, .04, .04), wood); arm.position.set(wx + inward * .3, 4.7, z + 1.2); scene.add(arm);
      }
      // 노렌: 세 갈래 천이 따로 흔들림
      const nt = textBanner(sign, i % 2 ? '#1B2A55' : '#3A1410', '#F5EFE6', false, 1.4 / .8);
      for (let k = 0; k < 3; k++) {
        const tx = nt.clone(); tx.needsUpdate = true; tx.repeat.set(1 / 3, 1); tx.offset.set(k / 3, 0);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.4 / 3 - .02, .8), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, side: THREE.DoubleSide }));
        strip.geometry.translate(0, -.4, 0);   // 위쪽 끝을 축으로 흔들리게
        const pivot = new THREE.Group();
        pivot.position.set(wx + inward * .06, 2.55, z - 1.4 / 3 + k * 1.4 / 3);
        pivot.rotation.y = facing(side);
        pivot.add(strip); scene.add(pivot);
        swayers.push({ o: strip, ph: Math.random() * 6.28, amp: .12 + Math.random() * .08 });
      }
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.6, 6), wood); rod.rotation.x = Math.PI / 2; rod.position.set(wx + inward * .06, 2.56, z); scene.add(rod);
      const door = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.7, 1.3), doorGlow);
      door.position.set(wx + inward * .01, .85, z); scene.add(door);
      const l = makeLantern(lanternPaper(sign, 'red', i * 7 + (side > 0 ? 3 : 1)), .6);
      l.children[0].rotation.y = side < 0 ? -Math.PI * .75 : Math.PI * .75;
      l.position.set(wx + inward * .55, 2.15, z - 1.15); scene.add(l); street.push(l);
    }
    const tangle = new THREE.LineBasicMaterial({ color: '#2E2A3E' });   // 머리 위 전선
    for (let i = 0; i < 12; i++) {
      const z = 1 - i * 2.6, y = 5.5 + Math.random() * 1.5;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2.5 * W, y, z), new THREE.Vector3(0, y - .6, z + (Math.random() - .5)), new THREE.Vector3(2.5 * W, y + Math.random() * .4, z + (Math.random() - .5) * 2));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), tangle));
    }
  }


  // 로그인 후보 A: 엔무스비(縁結び) 신사 — 에마(소원 나무판) 걸이, 묶인 오미쿠지, 붉은 실
  if (SCENE === 'ema') {
    SKY_EVERY = 6000;
    scene.fog.density = .06;
    const wood = new THREE.MeshStandardMaterial({ color: '#6B4426', roughness: .7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1A1414', roughness: .5, metalness: .3 });
    const WISH = ['縁', '願', '結', '祈', '恋', '幸', '福', '絆', '夢', '叶'];
    function emaTex(ch, seed) {
      const r = rnd(seed);
      return canvasTex(256, 200, (g, w, h) => {
        g.fillStyle = '#E3C58F'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,80,40,${.08 + r() * .1})`; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 6, w * .6, y - 6, w, y + r() * 4); g.stroke(); }
        g.fillStyle = '#B3261A'; g.beginPath(); g.arc(w * .22, h * .3, 16, 0, 6.28); g.fill();
        g.fillStyle = '#1A1210'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 96px "Zen Old Mincho", serif'; g.fillText(ch, w * .58, h * .56);
        g.font = '700 22px "Zen Old Mincho", serif'; g.fillText('令和八年', w * .2, h * .78);
      });
    }
    // 오각형(집 모양) 나무판
    const shape = new THREE.Shape();
    shape.moveTo(-.3, -.2); shape.lineTo(.3, -.2); shape.lineTo(.3, .1); shape.lineTo(0, .24); shape.lineTo(-.3, .1); shape.lineTo(-.3, -.2);
    const emaGeo = new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false });
    emaGeo.computeBoundingBox();
    { // UV 를 앞면 기준으로 다시 펴기
      const pos = emaGeo.attributes.position, uv = emaGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + .3) / .6, (pos.getY(i) + .2) / .44);
    }
    const threadMat = new THREE.LineBasicMaterial({ color: '#E0302A' });
    for (const [row, y] of [[0, 2.35], [1, 1.55], [2, .8]]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(9, .1, .1), wood); beam.position.set(0, y + .3, -4); scene.add(beam);
      for (let i = 0; i < 16; i++) {
        const x = -4.2 + i * .56 + (Math.random() - .5) * .12;
        const mat = new THREE.MeshStandardMaterial({ map: emaTex(WISH[(i + row * 5) % WISH.length], i * 13 + row), roughness: .8 });
        const plate = new THREE.Mesh(emaGeo, [mat, wood]);
        plate.geometry.translate && 0;
        const pivot = new THREE.Group(); pivot.position.set(x, y + .3, -4 + (i % 2) * .06);
        plate.position.set(0, -.34, 0); plate.rotation.y = (Math.random() - .5) * .25;
        pivot.add(plate);
        const pts = [new THREE.Vector3(0, 0, .01), new THREE.Vector3(0, -.12, .01)];
        pivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), threadMat));
        scene.add(pivot);
        swayers.push({ o: pivot, ph: Math.random() * 6.28, amp: .05 + Math.random() * .05, axis: 'z' });
      }
    }
    for (const x of [-4.6, 4.6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 3.2, .14), wood); post.position.set(x, 1.6, -4); scene.add(post); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10, .12, 1.1), roofMat); roof.position.set(0, 3.0, -4); roof.rotation.x = -.15; scene.add(roof);
    // 뒤쪽: 오미쿠지를 묶은 줄과 신사 건물, 등불
    const paper = new THREE.MeshStandardMaterial({ color: '#F4EFE4', emissive: '#FFF1D8', emissiveIntensity: .25 });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 40; i++) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(.05, .14, .03), paper);
      k.position.set(-5 + i * .25 + Math.random() * .1, 1.1 + r * .35, -8.5); k.rotation.z = (Math.random() - .5) * .6; scene.add(k);
    }
    const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 2), new THREE.MeshStandardMaterial({ color: '#2A0F0C', roughness: .8 })); hall.position.set(0, 2, -12); scene.add(hall);
    const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(8, 2, 4, 1), roofMat); hallRoof.position.set(0, 5, -12); hallRoof.rotation.y = Math.PI / 4; hallRoof.scale.z = .3; scene.add(hallRoof);
    for (const x of [-3, -1, 1, 3]) { const l = makeLantern(PAPERS[(x + 4) % PAPERS.length], .5); l.position.set(x, 3.2, -10.8); scene.add(l); street.push(l); }
    for (const z of [-2, -9]) { const pl = new THREE.PointLight('#FFB070', 8, 12, 1.6); pl.position.set(0, 2.6, z); scene.add(pl); }
  }

  // 로그인 후보 B: 금붕어 뜨기(金魚すくい) — 위에서 내려다본 빛나는 수조
  const fishes = [], ripples = [];
  let waterTex = null;
  if (SCENE === 'goldfish') {
    SKY_EVERY = 1e9; SCROLL_DEPTH = 0;
    scene.fog.density = 0; ground.visible = false;
    scene.background = new THREE.Color('#05070F');
    waterTex = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * .7);
      gr.addColorStop(0, '#16507F'); gr.addColorStop(1, '#061630'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(190,235,255,.10)'; g.lineWidth = 3;
      for (let i = 0; i < 70; i++) { g.beginPath(); const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 50; g.ellipse(x, y, r, r * .6, Math.random() * 3, 0, Math.PI * 1.3); g.stroke(); }
    });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
    const PW = portrait ? 5.6 : 9, PH = portrait ? 9.6 : 6;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: waterTex }));
    water.rotation.x = -Math.PI / 2; scene.add(water);
    const rimMat = new THREE.MeshStandardMaterial({ color: '#E8462E', roughness: .4, emissive: '#5A1208', emissiveIntensity: .5 });
    for (const [w2, d2, x, z] of [[PW + .5, .25, 0, -PH / 2 - .12], [PW + .5, .25, 0, PH / 2 + .12], [.25, PH, -PW / 2 - .12, 0], [.25, PH, PW / 2 + .12, 0]]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w2, .3, d2), rimMat); rim.position.set(x, .1, z); scene.add(rim);
    }
    const COL = ['#FF5A1F', '#FF7A2A', '#F2F2F2', '#E8222A', '#1A1A1A', '#FF9A3C'];
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group(), c = COL[i % COL.length];
      const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .18, roughness: .4 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 10), m); body.scale.set(1, .55, .6); g.add(body);
      const tailGeo = new THREE.PlaneGeometry(.26, .22); tailGeo.translate(-.13, 0, 0);
      const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .3, transparent: true, opacity: .8, side: THREE.DoubleSide }));
      tail.rotation.x = Math.PI / 2; tail.position.x = -.14; g.add(tail);
      if (i % 4 === 2) { const spot = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#E8222A' })); spot.position.set(.03, .06, 0); g.add(spot); }
      g.position.y = .08; scene.add(g);
      fishes.push({ g, tail, cx: (Math.random() - .5) * PW * .6, cz: (Math.random() - .5) * PH * .6, r: .6 + Math.random() * 1.4, sp: (.25 + Math.random() * .4) * (Math.random() < .5 ? 1 : -1), ph: Math.random() * 6.28, s: .8 + Math.random() * .6 });
      g.scale.setScalar(fishes[fishes.length - 1].s * 1.6);
    }
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: '#CFF2FF', transparent: true, opacity: 0, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; scene.add(ring);
      ripples.push({ m: ring, t: Math.random() * 3, PW, PH });
    }
    // 수조 위에 비치는 등불 빛
    for (const [x, z] of [[-1.5, -3], [1.6, 2.5], [0, -0.5]]) {
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB070', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
      h.position.set(x, .05, z); h.scale.setScalar(2.4); scene.add(h);
    }
    const poiTex = canvasTex(128, 128, (g) => { g.fillStyle = '#F2F2F2'; g.beginPath(); g.arc(64, 64, 58, 0, 6.28); g.fill(); g.strokeStyle = '#E8462E'; g.lineWidth = 10; g.stroke(); });
    const poi = new THREE.Mesh(new THREE.CircleGeometry(.45, 32), new THREE.MeshBasicMaterial({ map: poiTex, transparent: true }));
    poi.rotation.x = -Math.PI / 2; poi.position.set(PW / 2 - .7, .2, PH / 2 - .9); scene.add(poi);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.9, .04, .12), new THREE.MeshStandardMaterial({ color: '#E8462E' })); handle.position.set(PW / 2 - .1, .2, PH / 2 - .5); handle.rotation.y = -.6; scene.add(handle);
  }

  // 로그인 후보 C: 보름달과 언덕 위 신사
  const clouds = [];
  if (SCENE === 'moon') {
    SKY_EVERY = 1e9;
    const moonTex = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w * .45, h * .42, 20, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#FFF8E6'); gr.addColorStop(.8, '#F2DDAE'); gr.addColorStop(1, 'rgba(242,221,174,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 6.28); g.fill();
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(190,160,110,${.08 + Math.random() * .12})`; g.beginPath(); g.arc(80 + Math.random() * 350, 80 + Math.random() * 350, 8 + Math.random() * 40, 0, 6.28); g.fill(); }
    });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: '#CFC3A6', fog: false }));
    moon.position.set(portrait ? 2.5 : 7, portrait ? 17 : 13, -60); moon.scale.setScalar(portrait ? 9 : 11); scene.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFE2A8', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.copy(moon.position); halo.scale.setScalar(portrait ? 22 : 26); halo.material.opacity = .3; scene.add(halo);
    function ridge(z, height, color, seed) {
      const r = rnd(seed), sh = new THREE.Shape(); sh.moveTo(-60, -5);
      for (let x = -60; x <= 60; x += 2) sh.lineTo(x, height + Math.sin(x * .08 + seed) * height * .35 + r() * height * .25);
      sh.lineTo(60, -5); sh.lineTo(-60, -5);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, fog: false })); m.position.z = z; scene.add(m);
    }
    ridge(-50, 6, '#141634', 3); ridge(-35, 4, '#0E0F26', 7); ridge(-22, 2.6, '#090A1A', 11);
    // 언덕 위 도리이 실루엣
    const sil = new THREE.MeshBasicMaterial({ color: '#05050C' });
    const tg = new THREE.Group();
    for (const x of [-.9, .9]) { const p2 = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.2, .16), sil); p2.position.set(x, 1.1, 0); tg.add(p2); }
    const k1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, .16, .2), sil); k1.position.y = 2.25; tg.add(k1);
    const k2 = new THREE.Mesh(new THREE.BoxGeometry(2.3, .1, .16), sil); k2.position.y = 1.85; tg.add(k2);
    tg.position.set(portrait ? -.6 : -3, 3.6, -21.5); scene.add(tg);
    const cloudTex = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 14; i++) { const gr = g.createRadialGradient(40 + Math.random() * 176, 64 + (Math.random() - .5) * 30, 0, 128, 64, 70); gr.addColorStop(0, 'rgba(90,95,130,.25)'); gr.addColorStop(1, 'rgba(90,95,130,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .55, depthWrite: false, fog: false, toneMapped: false }));
      c.position.set((Math.random() - .5) * 60, 10 + Math.random() * 10, -45 + Math.random() * 10); c.scale.set(22, 9, 1); scene.add(c);
      clouds.push({ s: c, v: .004 + Math.random() * .006 });
    }
  }

  // 로그인: 강 위 등롱 띄우기(灯籠流し) — 잔잔한 물, 떠내려가는 등롱, 하늘로 오르는 풍등
  const drifters = [];
  if (SCENE === 'river') {
    SKY_EVERY = 5200; DRIFT = 2;
    ground.material = new THREE.MeshStandardMaterial({ color: '#04060F', roughness: .12, metalness: .85 });
    const boxGeo = new THREE.BoxGeometry(.42, .36, .42);
    for (let i = 0; i < 26; i++) {
      const tex = PAPERS[(i * 3) % PAPERS.length];
      const mat = paperMaterial(tex, i % 3 ? '#FFC07A' : '#FF8A50'); mat.emissiveIntensity = 1.4;
      const m = new THREE.Mesh(boxGeo, mat);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB067', transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(1.3); m.add(halo);
      const refl = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FF9A5A', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
      refl.scale.set(.6, 1.6, 1); refl.position.y = -.55; m.add(refl);
      m.position.set((Math.random() - .5) * 8 * W, .15, 7 - Math.random() * 30);
      m.userData = { sp: .004 + Math.random() * .006, ph: Math.random() * 6.28 };
      scene.add(m); drifters.push(m);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(9, .35, 8, 40, Math.PI), new THREE.MeshBasicMaterial({ color: '#0A0B16' }));
    bridge.position.set(0, -4.5, -32); scene.add(bridge);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(22, .3, .8), new THREE.MeshBasicMaterial({ color: '#0A0B16' }));
    deck.position.set(0, 4.2, -32); scene.add(deck);
    for (let i = 0; i < 9; i++) { const l = makeLantern(PAPERS[i % PAPERS.length], .35); l.position.set(-8 + i * 2, 3.7, -31.6); scene.add(l); street.push(l); }
  }

  // a few real lights that follow the action
  const lights = [0, 1, 2].map(() => { const p = new THREE.PointLight('#FF7A45', 0, 14, 1.6); scene.add(p); return p; });

  // hero lantern with 祭
  let hero = null;
  function buildHero() {
    if (hero) scene.remove(hero);
    hero = makeLantern(lanternPaper('祭'), 1.8, true);
    hero.visible = false;
    scene.add(hero);
  }
  buildHero();
  if (document.fonts) document.fonts.ready.then(buildHero);  // redraw kanji once the font arrives

  // embers
  const EMBERS = 260;
  const ePos = new Float32Array(EMBERS * 3), eVel = new Float32Array(EMBERS);
  for (let i = 0; i < EMBERS; i++) {
    ePos[i * 3] = (Math.random() - .5) * 10; ePos[i * 3 + 1] = Math.random() * 8; ePos[i * 3 + 2] = 4 - Math.random() * 36;
    eVel[i] = .004 + Math.random() * .012;
  }
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const eMat = new THREE.PointsMaterial({ map: GLOW, color: '#FF9A5A', size: .16, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(eGeo, eMat));
  let emberBoost = 1;

  // stars
  const sPos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) { sPos[i * 3] = (Math.random() - .5) * 120; sPos[i * 3 + 1] = 15 + Math.random() * 40; sPos[i * 3 + 2] = -60 - Math.random() * 40; }
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#F5EFE6', size: .25, transparent: true, opacity: .7, fog: false }));
  scene.add(stars);

  // fireworks
  const shells = [];
  const FW_COLORS = ['#FFD27A', '#FF6A3D', '#FF9DBB', '#9FD8FF', '#FFFFFF', '#C9A2FF'];
  function firework(origin, n = 260, color, speed = .16) {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const s = speed * (.7 + Math.random() * .5);
      vel[i * 3] = r * Math.cos(th) * s; vel[i * 3 + 1] = u * s; vel[i * 3 + 2] = r * Math.sin(th) * s;
      pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: GLOW, color: color || FW_COLORS[(Math.random() * FW_COLORS.length) | 0], size: .5, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    const light = new THREE.PointLight(mat.color, 6, 30, 1.5); light.position.copy(origin); scene.add(light);
    shells.push({ pts, vel, life: 1, light, age: 0 });
  }

  // fireworks that write a word in the sky
  function glyphPoints(text, maxPts, width) {
    const H = 160, Wc = Math.ceil(H * .9 * [...text].length);
    const c = document.createElement('canvas'); c.width = Wc; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 140px "Zen Old Mincho", "Noto Serif JP", serif';
    g.fillText(text, Wc / 2, H / 2 + 6);
    const d = g.getImageData(0, 0, Wc, H).data, pts = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < Wc; x += 2) if (d[(y * Wc + x) * 4 + 3] > 140) pts.push([x / Wc - .5, -(y / H - .5) * H / Wc]);
    for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    return pts.slice(0, maxPts).map(([x, y]) => [x * width, y * width]);
  }
  function glyphFirework(origin, text, color, width = 7, hold = 2.8) {
    const pts = glyphPoints(text, 1400, width), n = pts.length;
    camera.updateMatrixWorld();
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), tgt = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
      const u = Math.random() * 2 - 1, th = Math.random() * 6.283, r = Math.sqrt(1 - u * u), sp = .25 + Math.random() * .2;
      vel[i * 3] = r * Math.cos(th) * sp; vel[i * 3 + 1] = u * sp; vel[i * 3 + 2] = r * Math.sin(th) * sp * .3;
      const R = camRight, U = camUp, x = pts[i][0], y = pts[i][1];
      tgt[i * 3] = origin.x + R.x * x + U.x * y; tgt[i * 3 + 1] = origin.y + R.y * x + U.y * y; tgt[i * 3 + 2] = origin.z + R.z * x + U.z * y;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: GLOW, color, size: .32, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const ptsObj = new THREE.Points(geo, mat); scene.add(ptsObj);
    const light = new THREE.PointLight(color, 4, 30, 1.5); light.position.copy(origin); scene.add(light);
    shells.push({ pts: ptsObj, vel, target: tgt, hold, life: 1, light, age: 0 });
  }

  // the red thread of fate
  let thread = null, threadGlow = null;
  function clearThread() {
    for (const m of [thread, threadGlow]) if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    thread = threadGlow = null;
    clearFate();
  }
  function makeThread(from, to) {
    clearThread();
    const mid1 = new THREE.Vector3(from.x + (Math.random() - .5) * 3, 1.2, from.z + (to.z - from.z) * .3);
    const mid2 = new THREE.Vector3(to.x * .3 + (Math.random() - .5) * 2.5, 2.4, from.z + (to.z - from.z) * .65);
    const pts = [from, mid1, mid2];
    // wrap around the lantern twice
    for (let k = 0; k <= 16; k++) {
      const a = k / 16 * Math.PI * 4, r = .62;
      pts.push(new THREE.Vector3(to.x + Math.cos(a) * r, to.y - .55 + k * .07, to.z + Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const SEG = 400, RAD = 8;
    thread = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, .028, RAD, false), new THREE.MeshBasicMaterial({ color: '#FF2E3A' }));
    threadGlow = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, .11, RAD, false), new THREE.MeshBasicMaterial({ color: '#FF3B3B', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (const m of [thread, threadGlow]) { m.geometry.setDrawRange(0, 0); scene.add(m); }
    return { set(p) { const n = Math.floor(SEG * p) * RAD * 6; thread.geometry.setDrawRange(0, n); threadGlow.geometry.setDrawRange(0, n); } };
  }

  // 縁の糸: 등불 사이를 뛰는 실 (홉 단위로 그리는 범위를 조절)
  let fateObj = null;
  function clearFate() {
    if (!fateObj) return;
    for (const m of fateObj.meshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    fateObj = null;
  }
  function makeFateThread(hops, knotAt) {
    clearFate();
    const PER = 28, dense = [];
    for (let i = 0; i < hops.length - 1; i++) {
      const A = hops[i], B = hops[i + 1];
      const lift = .9 + A.distanceTo(B) * .12;
      const M = A.clone().lerp(B, .5); M.y += lift; M.x += (Math.random() - .5) * .8;
      for (let k = 0; k < PER; k++) {
        const u = k / PER, iu = 1 - u;
        dense.push(new THREE.Vector3(
          iu * iu * A.x + 2 * iu * u * M.x + u * u * B.x,
          iu * iu * A.y + 2 * iu * u * M.y + u * u * B.y,
          iu * iu * A.z + 2 * iu * u * M.z + u * u * B.z));
      }
    }
    const last = hops[hops.length - 1];
    dense.push(last.clone());
    // 매듭: 고른 등불을 두 바퀴 감음
    const COILN = 40, coil = 1.2;
    for (let k = 1; k <= COILN; k++) {
      const a = Math.PI / 2 + k / COILN * Math.PI * 4, rr = .6;
      dense.push(new THREE.Vector3(knotAt.x + Math.cos(a) * rr, knotAt.y - .5 + k / COILN * .7, knotAt.z + Math.sin(a) * rr));
    }
    const hopsN = hops.length - 1, total = hopsN + coil, nD = dense.length - 1;
    const sToIdx = (s) => s <= hopsN ? s * PER : hopsN * PER + (s - hopsN) / coil * COILN;
    const curve = new (class extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) { const f = t * nD, i = Math.min(nD - 1, Math.floor(f)); return out.copy(dense[i]).lerp(dense[i + 1], f - i); }
      getPointAt(u, out) { return this.getPoint(u, out); }
    })();
    const SEG = nD * 2, RAD = 6;
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, .022, RAD, false), new THREE.MeshBasicMaterial({ color: '#FF2E3A', transparent: true }));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, .06, RAD, false), new THREE.MeshBasicMaterial({ color: '#FF4A3A', transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false }));
    const bead = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB08A', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    bead.scale.setScalar(.9);
    for (const m of [core, glow, bead]) scene.add(m);
    core.geometry.setDrawRange(0, 0); glow.geometry.setDrawRange(0, 0);
    const head = new THREE.Vector3();
    fateObj = {
      meshes: [core, glow, bead], coil, head,
      show(s0, s1) {
        const i0 = Math.floor(sToIdx(s0) / nD * SEG), i1 = Math.ceil(sToIdx(s1) / nD * SEG);
        for (const m of [core, glow]) m.geometry.setDrawRange(i0 * RAD * 6, Math.max(0, i1 - i0) * RAD * 6);
        curve.getPoint(Math.min(1, sToIdx(s1) / nD), head); bead.position.copy(head);
        if (Math.random() < .5) emberAt(head);
      },
      flash() {
        glow.material.opacity = 1; bead.scale.setScalar(2.2);
        gsap.to(glow.material, { opacity: .26, duration: .6 });
        gsap.to(bead.scale, { x: .6, y: .6, duration: .6 });
      },
      fade(d = .6) { gsap.to([core.material, glow.material, bead.material], { opacity: 0, duration: d }); },
    };
    return fateObj;
  }

  // ───────── loop ─────────
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    composer.setSize(r.width, r.height);
    bloom.resolution.set(r.width / 2, r.height / 2);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < .7 ? 62 : 50;
    camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  let shown = false;
  let t = 0, idleCam = true, scrollTarget = 0, scrollEase = 0;
  const tmp = new THREE.Vector3();
  function frame() {
    const dt = Math.min(clock.getDelta(), .05); t += dt;

    for (const l of street) {
      const u = l.userData;
      l.rotation.z = Math.sin(t * 1.3 + u.phase) * .06;
      const flick = .85 + .15 * Math.sin(t * 9 + u.phase * 3);
      u.mat.emissiveIntensity = .04 + u.lit * 1.7 * flick;
      u.glow.material.opacity = Math.min(1, u.lit) * .32 * flick;
    }
    if (waterTex) { waterTex.offset.x = Math.sin(t * .05) * .05; waterTex.offset.y = t * .006; }
    for (const f of fishes) {
      const a = t * f.sp + f.ph;
      const x = f.cx + Math.cos(a) * f.r, z = f.cz + Math.sin(a * 1.3) * f.r * .7;
      const dx = x - f.g.position.x, dz = z - f.g.position.z;
      if (dx || dz) f.g.rotation.y = Math.atan2(-dz, dx);
      f.g.position.x = x; f.g.position.z = z;
      f.tail.rotation.z = Math.sin(t * 9 + f.ph) * .5;
    }
    for (const r of ripples) {
      r.t += dt;
      const k = (r.t % 3.2) / 3.2;
      if (k < dt / 3.2 * 1.5) r.m.position.set((Math.random() - .5) * r.PW * .8, .02, (Math.random() - .5) * r.PH * .8);
      r.m.scale.setScalar(.1 + k * 1.4); r.m.material.opacity = (1 - k) * .45;
    }
    for (const c of clouds) { c.s.position.x += c.v; if (c.s.position.x > 34) c.s.position.x = -34; }
    for (const d of drifters) {
      d.position.z += d.userData.sp; d.position.y = .15 + Math.sin(t * 1.4 + d.userData.ph) * .04;
      d.rotation.y += .002;
      if (d.position.z > 9) d.position.z = -26;
    }
    for (const f of floaters) {
      if (!f.visible) continue;
      const u = f.userData, fl = .85 + .15 * Math.sin(t * 7 + u.phase);
      u.mat.emissiveIntensity = .04 + u.lit * 1.6 * fl;
      u.glow.material.opacity = Math.min(1, u.lit) * .35 * fl;
    }
    if (hero && hero.visible) {
      const u = hero.userData;
      u.mat.emissiveIntensity = .05 + u.lit * 2.6;
      u.glow.material.opacity = u.lit * .6;
      u.core.intensity = u.lit * 6;
    }

    for (let i = 0; i < EMBERS; i++) {
      ePos[i * 3 + 1] += eVel[i] * emberBoost;
      ePos[i * 3] += Math.sin(t * 2 + i) * .003;
      if (ePos[i * 3 + 1] > 9) { ePos[i * 3 + 1] = 0; }
    }
    eGeo.attributes.position.needsUpdate = true;
    stars.material.opacity = .55 + .2 * Math.sin(t * 1.7);

    for (let s = shells.length - 1; s >= 0; s--) {
      const sh = shells[s], p = sh.pts.geometry.attributes.position.array, v = sh.vel;
      sh.age += dt;
      if (sh.target) {
        const tg = sh.target, a = sh.age;
        for (let i = 0; i < v.length; i += 3) {
          if (a < .35) { p[i] += v[i]; p[i + 1] += v[i + 1]; p[i + 2] += v[i + 2]; v[i] *= .9; v[i + 1] *= .9; v[i + 2] *= .9; }
          else if (a < sh.hold) { p[i] += (tg[i] - p[i]) * .085; p[i + 1] += (tg[i + 1] - p[i + 1]) * .085; p[i + 2] += (tg[i + 2] - p[i + 2]) * .085; v[i] = (Math.random() - .5) * .01; v[i + 1] = 0; v[i + 2] = 0; }
          else { v[i + 1] -= .0016; p[i] += v[i]; p[i + 1] += v[i + 1]; }
        }
        sh.life = a < sh.hold ? 1 : Math.max(0, 1 - (a - sh.hold) / 1.6);
        sh.pts.material.opacity = sh.life * (a > .6 && a < sh.hold ? (.75 + .25 * Math.sin(a * 30 + Math.random())) : 1);
        sh.light.intensity = a < sh.hold ? 4 : 0;
      } else {
        for (let i = 0; i < v.length; i += 3) {
          v[i] *= .965; v[i + 1] = v[i + 1] * .965 - .0022; v[i + 2] *= .965;
          p[i] += v[i]; p[i + 1] += v[i + 1]; p[i + 2] += v[i + 2];
        }
        sh.life -= dt * .55;
        sh.pts.material.opacity = Math.max(0, sh.life) * (Math.random() < .1 ? .5 : 1);
        sh.light.intensity = Math.max(0, sh.life - .5) * 12;
      }
      sh.pts.geometry.attributes.position.needsUpdate = true;
      if (sh.life <= 0) { scene.remove(sh.pts); scene.remove(sh.light); sh.pts.geometry.dispose(); sh.pts.material.dispose(); shells.splice(s, 1); }
    }

    if (threadGlow && !gsap.isTweening(threadGlow.material)) threadGlow.material.opacity = Math.min(threadGlow.material.opacity, .25 + .15 * Math.sin(t * 8)) || .25 + .15 * Math.sin(t * 8);

    if (idleCam) {
      scrollEase += (scrollTarget - scrollEase) * .08;
      const sway = calm ? 0 : 1;
      const drift = DRIFT && !calm ? (Math.sin(t * .09 - Math.PI / 2) * .5 + .5) * DRIFT : 0;
      const dz = scrollEase * SCROLL_DEPTH + drift;
      const street1 = SCENE === 'street';
      camera.position.x = CAM_HOME.x + Math.sin(t * .25) * .35 * sway;
      camera.position.y = CAM_HOME.y + Math.sin(t * .4) * .08 * sway + (street1 ? scrollEase * .6 : 0);
      camera.position.z = CAM_HOME.z - dz;
      look.z = LOOK_HOME.z - dz;
      look.y = LOOK_HOME.y - (street1 ? scrollEase * 1.2 : 0);
    }
    for (const w of swayers) w.o.rotation[w.axis || 'x'] = Math.sin(t * 1.6 + w.ph) * w.amp * (calm ? .3 : 1);
    camera.lookAt(look);
    composer.render();
    if (!shown) { shown = true; canvas.classList.add('ready'); }
    if (alive) raf = requestAnimationFrame(frame);
  }
  let alive = true, raf = requestAnimationFrame(frame);


  // ───────── 연출 ─────────
  let tl = null, chosen = null, chosenHome = null, run = null;
  const RING = street.slice(0, 12);

  function emberAt(p) {
    for (let k = 0; k < 2; k++) {
      const i = (Math.random() * EMBERS) | 0;
      ePos[i * 3] = p.x + (Math.random() - .5) * .6; ePos[i * 3 + 1] = p.y - .6; ePos[i * 3 + 2] = p.z + (Math.random() - .5) * .6;
    }
  }

  let skyTimer = null;
  function startSky(every = 1700) {
    stopSky();
    skyTimer = setInterval(() => {
      if (document.hidden) return;
      const base = chosenHome || new THREE.Vector3(0, 0, -20);
      firework(new THREE.Vector3(base.x + (Math.random() - .5) * 14, 9 + Math.random() * 5, base.z - 8 - Math.random() * 10), 220, null, .13);
    }, every);
  }
  function stopSky() { if (skyTimer) clearInterval(skyTimer); skyTimer = null; }

  function restoreChosen() {
    if (chosen && chosenHome) { gsap.killTweensOf([chosen.position, chosen.scale]); chosen.position.copy(chosenHome); chosen.scale.setScalar(.9); chosen.visible = true; }
  }

  /** 대기 화면: 거리 등불 켜짐, 카메라 천천히 흔들림, 가끔 불꽃 */
  function idle() {
    if (tl) { tl.kill(); tl = null; }
    run = null;
    restoreChosen(); clearThread(); chosenHome = null;
    gsap.to(camera.position, { x: CAM_HOME.x, y: CAM_HOME.y + scrollEase * .6, z: CAM_HOME.z - scrollEase * 9, duration: 1.2, ease: 'power2.inOut', onComplete: () => { idleCam = true; } });
    gsap.to(look, { x: LOOK_HOME.x, y: LOOK_HOME.y, z: LOOK_HOME.z, duration: 1.2, ease: 'power2.inOut' });
    street.forEach((l, i) => gsap.to(l.userData, { lit: 1, duration: .6, delay: i * .02 }));
    lights.forEach((l) => gsap.to(l, { intensity: 0, duration: .6 }));
    startSky(SKY_EVERY);
  }

  /** 하늘에 불꽃 글자 (처음 들어왔을 때 '寄り道' 등) */
  function introGlyph(text = '寄り道') {
    glyphFirework(new THREE.Vector3(...P.introGlyph), text, new THREE.Color('#FFD27A'), P.introW, 3.4);
  }

  /**
   * 뽑기 연출 시작.
   * @param {{ onBurst: () => void, onSkippable?: (on:boolean) => void }} cb
   */
  function play(cb = {}) {
    if (tl) tl.kill();
    stopSky();
    shells.forEach((sh) => { if (sh.target) sh.hold = Math.min(sh.hold, sh.age); });
    restoreChosen(); clearThread();
    idleCam = false;
    run = { cb, released: false, burst: false, waiting: false };
    const me = run;

    chosen = RING[(Math.random() * RING.length) | 0];
    chosenHome = chosen.position.clone();
    const order = [...RING].sort(() => Math.random() - .5);
    const STEPS = order.length + 8;
    const seq = Array.from({ length: STEPS }, (_, i) => order[i % order.length]);
    seq[STEPS - 1] = chosen;

    tl = gsap.timeline();
    tl.timeScale(1.7);
    buzz(15);
    cb.onSkippable && cb.onSkippable(true);
    tl.to(camera.position, { x: P.rouletteCam[0], y: P.rouletteCam[1], z: P.rouletteCam[2], duration: calm ? 1.6 : 1, ease: 'power2.inOut' }, 0)
      .to(look, { x: P.rouletteLook[0], y: P.rouletteLook[1], z: P.rouletteLook[2], duration: 1, ease: 'power2.inOut' }, 0)
      .to(street.map((l) => l.userData), { lit: .18, duration: .6 }, .1);

    // 1) 縁の糸: 붉은 실 끝이 등불 사이를 뛰어다니다 점점 느려지며 하나를 고름 (= 우연)
    const hopPts = [new THREE.Vector3(0, .3, camera.position.z - 3)];
    for (const l of seq) hopPts.push(l.position.clone().add(new THREE.Vector3(0, -.1, .75)));
    const fate = makeFateThread(hopPts, chosenHome);
    const H = seq.length, C = fate.coil;
    const r = { s: 0 }; let prevHop = -1;
    const follow = new THREE.Vector3();
    const TAIL = 1.6;   // 보이는 실 꼬리 길이 (홉 단위)
    tl.to(r, { s: H, duration: 3.4, ease: 'power4.out', onUpdate: () => {
      fate.show(Math.max(0, r.s - TAIL), r.s);
      const hop = Math.floor(r.s + .02);
      if (hop !== prevHop && hop >= 1) {
        const l = seq[hop - 1];
        if (prevHop >= 1) gsap.to(seq[prevHop - 1].userData, { lit: .18, duration: .35 });
        l.userData.lit = 1.8;
        lights[0].position.copy(l.position); lights[0].intensity = 7;
        buzz(4);
      }
      prevHop = hop;
      if (!calm) {   // 카메라가 실 끝을 살짝 따라감 (멀미 안 나게 35%만)
        follow.set(...P.rouletteLook).lerp(fate.head, .45);
        look.lerp(follow, .18);
      }
    } }, .7);

    // 2) 실이 그 등불을 두 번 감고, 툭 당김 (= 인연)
    const tAt = .7 + 3.4;
    tl.to(r, { s: H + C, duration: .55, ease: 'power2.inOut', onUpdate: () => fate.show(Math.max(0, H - .9), r.s) }, tAt)
      .call(() => buzz([10, 40, 10]), null, tAt)
      .to(look, { x: () => chosenHome.x * .6, y: () => chosenHome.y, z: () => chosenHome.z, duration: calm ? 1.6 : 1.1, ease: 'power2.inOut' }, tAt);
    if (!calm) tl.to(camera.position, { x: () => chosenHome.x * .35, y: 2.6, z: () => chosenHome.z + 7, duration: 1.4, ease: 'power2.inOut' }, tAt + .1);
    // 당김: 등불이 실 쪽으로 끌려왔다가 제자리
    const tug = tAt + .6;
    tl.to(chosen.position, { z: () => chosenHome.z + .9, y: () => chosenHome.y - .15, duration: .16, ease: 'power2.out' }, tug)
      .to(chosen.position, { z: () => chosenHome.z, y: () => chosenHome.y, duration: .7, ease: 'elastic.out(1, .45)' }, tug + .16)
      .call(() => { fate.flash(); buzz(25); }, null, tug);

    // 3) 매듭: 등불이 맥박 치며 밝아짐
    const knot = tug + .35;
    tl.call(() => { gsap.to(chosen.userData, { lit: 1.9, duration: .3 }); lights[1].position.copy(chosenHome); lights[1].intensity = 6; buzz(30); }, null, knot)
      .to(chosen.scale, { x: 1.12, y: 1.12, z: 1.12, duration: .18, yoyo: true, repeat: 3, ease: 'sine.inOut' }, knot)
      .to(street.map((l) => l.userData), { lit: .5, duration: .8 }, knot + .2);

    // API 응답을 아직 못 받았으면 여기서 대기 (등불이 천천히 숨 쉬며 기다림)
    const gate = knot + .85;
    tl.call(() => {
      if (me.released) return;
      me.waiting = true;
      tl.pause();
      gsap.to(chosen.scale, { x: 1.06, y: 1.06, z: 1.06, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, null, gate);

    // 4) 풍등처럼 떠오름 — 여기서부터는 원래 속도
    const lift = gate + .05;
    tl.call(() => { if (tl) gsap.to(tl, { timeScale: 1, duration: .5, ease: 'power1.out' }); }, null, lift - .3);
    tl.to(chosen.position, { y: 12, duration: 1.6, ease: 'power2.in', onUpdate: () => { lights[1].position.copy(chosen.position); emberAt(chosen.position); } }, lift)
      .call(() => { if (fateObj) fateObj.fade(.6); }, null, lift + .9)
      .to(look, { y: P.liftLook, duration: calm ? 2.2 : 1.7, ease: 'power2.inOut' }, lift);
    if (!calm) tl.to(camera.position, { y: 3.4, duration: 1.7, ease: 'power2.inOut' }, lift);

    // 5) 터지면서 불꽃이 '縁' 글자를 씀 → 결과
    const boom = lift + 1.6;
    tl.call(() => {
      const o = chosen.position.clone(); chosen.visible = false; clearThread();
      glyphFirework(new THREE.Vector3(look.x, o.y, o.z), '縁', new THREE.Color('#FF5A4A'), P.glyphW, 2.1);
      firework(o, 260, '#FFD27A', .2);
      buzz([40, 30, 90]);
      cb.onSkippable && cb.onSkippable(false);
      cb.flash && cb.flash();
    }, null, boom)
      .call(() => firework(new THREE.Vector3(chosenHome.x - 7, 9, chosenHome.z - 8), 280, '#9FD8FF'), null, boom + .5)
      .call(() => firework(new THREE.Vector3(chosenHome.x + 7, 10, chosenHome.z - 10), 280, '#FF9DBB'), null, boom + .8)
      .call(() => firework(new THREE.Vector3(chosenHome.x, 15, chosenHome.z - 14), 340, '#F2C14E'), null, boom + 1.15)
      .to(look, { y: P.finalLook, duration: 1.2, ease: 'power2.out' }, boom + 1.4)
      .call(() => burst(me), null, boom + 2.2)   // 글자가 흩어지기 시작할 때 결과가 스르륵
      .call(() => { tl = null; startSky(); }, null, boom + 2.3);
  }

  function burst(me) {
    if (!me || me.burst || run !== me) return;
    me.burst = true;
    me.cb.onBurst && me.cb.onBurst();
  }

  /** API 응답(가게 결과)이 준비되면 호출 → 등불이 떠올라 터짐 */
  function release() {
    if (!run || run.released) return;
    run.released = true;
    if (run.waiting && tl) {
      run.waiting = false;
      gsap.killTweensOf(chosen.scale);
      chosen.scale.setScalar(.9);
      tl.resume();
    }
  }

  /** 건너뛰기: 바로 결과 장면 (release 전이면 결과를 기다렸다가 처리하도록 호출부에서 순서 보장) */
  function skip() {
    if (!run || run.burst || !chosenHome) return;
    const me = run;
    if (tl) { tl.kill(); tl = null; }
    gsap.killTweensOf([camera.position, look, chosen.position, chosen.scale]);
    clearThread();
    chosen.visible = false;
    street.forEach((l) => { gsap.killTweensOf(l.userData); l.userData.lit = .5; });
    lights.forEach((l) => { gsap.killTweensOf(l); l.intensity = 0; });
    shells.forEach((sh) => { if (sh.target) sh.hold = Math.min(sh.hold, sh.age); });
    if (!calm) camera.position.set(chosenHome.x * .35, 3.4, chosenHome.z + 7);
    look.set(chosenHome.x * .6, P.finalLook, chosenHome.z);
    camera.lookAt(look);
    const o = new THREE.Vector3(look.x, portrait ? 12 : 11.5, chosenHome.z);
    glyphFirework(o, '縁', new THREE.Color('#FF5A4A'), P.glyphW, 1.1);
    firework(o, 200, '#FFD27A', .18);
    me.cb.onSkippable && me.cb.onSkippable(false);
    me.cb.flash && me.cb.flash();
    setTimeout(() => burst(me), 1100);
    startSky();
  }

  /** API 실패 등: 연출을 접고 대기 화면으로 */
  function abort() {
    if (run && run.cb.onSkippable) run.cb.onSkippable(false);
    idle();
  }

  // 대기 중 배경 생동감: 먼 거리에서 풍등이 천천히 떠오름
  const floaters = [];
  for (let i = 0; i < 7; i++) {
    const f = makeLantern(PAPERS[(i * 3) % PAPERS.length], .55);
    f.visible = false; scene.add(f); floaters.push(f);
  }
  let floatTimer = null;
  function launchFloater() {
    if (document.hidden) return;
    const f = floaters.find((x) => !x.visible);
    if (!f) return;
    const x0 = (Math.random() - .5) * 8, z0 = -14 - Math.random() * 22;
    f.position.set(x0, 2 + Math.random(), z0); f.visible = true; f.userData.lit = 0;
    gsap.to(f.userData, { lit: 1.2, duration: 1.5 });
    gsap.to(f.position, { y: 22 + Math.random() * 6, x: x0 + (Math.random() - .5) * 6, duration: 14 + Math.random() * 6, ease: 'none',
      onComplete: () => { f.visible = false; } });
    gsap.to(f.rotation, { z: (Math.random() - .5) * .4, duration: 3, yoyo: true, repeat: 5, ease: 'sine.inOut' });
  }
  function ambient(on = true) {
    if (floatTimer) clearInterval(floatTimer);
    floatTimer = null;
    if (on) { launchFloater(); floatTimer = setInterval(launchFloater, 2200); }
  }

  /** 홈 등에서 스크롤 진행도(0~1)를 넘기면 카메라가 거리 안으로 걸어 들어감 */
  function setScroll(p) { if (calm) return; scrollTarget = Math.max(0, Math.min(1, p)); }

  function destroy() {
    alive = false; cancelAnimationFrame(raf); stopSky();
    if (tl) tl.kill();
    renderer.dispose();
  }

  // 시작 상태: 등불이 하나씩 켜진 대기 화면
  street.forEach((l, i) => gsap.to(l.userData, { lit: 1, duration: .6, delay: .3 + i * .05 }));
  startSky(SKY_EVERY);
  if (SCENE === 'river' || SCENE === 'moon') ambient(true);

  return { play, release, skip, abort, idle, introGlyph, setScroll, ambient, destroy };
}
