// 縁 · 오늘의 우연 — 3D 축제 거리 뽑기 연출 (Three.js + GSAP)
// 사용법은 파일 맨 아래 createHanabiStage 주석 참고.
// 의존성: import map 의 'three', 'three/addons/' + 전역 window.gsap
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const gsap = window.gsap;
// 자동 해상도: 프레임이 2초 동안 절반 넘게 45fps 아래면 해상도를 한 단계(.25) 내림 (최소 1). 올리진 않음(왔다 갔다 끊김 방지)
// 페이지 들어온 직후 3초(셰이더·텍스처 준비 구간)와 한 번에 0.2초 넘게 멈춘 프레임은 세지 않음. ?pr=1.5 처럼 고정 가능
const PERF = (() => {
  const fixed = parseFloat(new URLSearchParams(location.search).get('pr'));
  const pr = fixed > 0 ? fixed : Math.min(devicePixelRatio || 1, 2);
  return { pr, min: fixed > 0 ? pr : Math.min(pr, 1), warm: 3, t: 0, n: 0, slow: 0 };
})();
function adaptPR(raw) {
  if (PERF.pr <= PERF.min || document.hidden) return false;
  if (PERF.warm > 0) { PERF.warm -= Math.min(raw, .1); return false; }
  if (raw > .2) return false;
  PERF.t += raw; PERF.n++; if (raw > 1 / 45) PERF.slow++;
  if (PERF.t < 2) return false;
  const drop = PERF.slow / PERF.n > .5;
  PERF.t = PERF.n = PERF.slow = 0;
  if (!drop) return false;
  PERF.pr = Math.max(PERF.min, Math.round((PERF.pr - .25) * 100) / 100);
  PERF.warm = 1.5;   // 바꾼 직후 프레임은 다시 세지 않음
  return true;
}
const DEBUG_3D = /[?&]debug3d=1/.test(location.search);
const PAPER_CACHE = new Map();   // 등불 종이 그림 (canvas) — 무대끼리 공유
const fontReady = () => { try { return document.fonts.check('900 40px "Zen Old Mincho"'); } catch { return true; } };

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
  // shared: 페이지를 옮겨도 같은 canvas·렌더러를 계속 씀 (router.js). WebGL을 새로 만들지 않아서 전환이 빠름
  if (opts.shared && sharedRenderer && sharedCanvas === canvas) renderer = sharedRenderer;
  else {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // 그림자는 처음부터 켜둠 (나중에 켜면 모든 무대의 셰이더를 다시 준비해야 해서 끊김)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 셰이더 오류 검사 끄기: 켜두면 셰이더마다 컴파일이 끝날 때까지 메인 스레드가 멈춤(첫 진입·전환 버벅임의 주원인).
    // 컴파일은 GPU 쪽에서 따로 진행됨. 셰이더를 고칠 때만 주소에 ?debug3d=1
    renderer.debug.checkShaderErrors = DEBUG_3D;
    if (opts.shared) { sharedRenderer = renderer; sharedCanvas = canvas; }
  }
  let PR = PERF.pr;   // 모든 무대 같은 해상도 (공유 렌더러). 프레임이 계속 느리면 PERF.pr이 내려감 → resize()에서 맞춤
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
  if (SCENE === 'yatai') { P.camHome = portrait ? [0, 1.75, 9] : [0, 1.7, 8]; P.lookHome = portrait ? [0, 1.5, -10] : [0, 2.6, -10]; }
  if (SCENE === 'pond') { P.camHome = portrait ? [0, 2.3, 7.5] : [0, 2.2, 7]; P.lookHome = portrait ? [0, .4, -9] : [0, .7, -10]; P.introGlyph = portrait ? [0, 8.2, -22] : [0, 9, -24]; P.introW = portrait ? 6 : 8; P.rouletteCam = portrait ? [0, 2.6, 8] : [0, 2.5, 7.5]; P.rouletteLook = portrait ? [0, .5, -8] : [0, .7, -8]; }
  if (SCENE === 'sando') { P.camHome = portrait ? [0, 2.3, 2.5] : [0, 2, 7]; P.lookHome = portrait ? [0, 4.6, -20] : [0, 5.2, -20]; P.introGlyph = [0, 13, -34]; }
  if (SCENE === 'yagura') { P.camHome = portrait ? [0, 3.6, 10.5] : [0, 2.6, 8]; P.lookHome = portrait ? [0, -.6, -8] : [0, 2.6, -8]; }
  if (SCENE === 'momiji') { P.camHome = portrait ? [0, 2.6, 9] : [0, 2.4, 9]; P.lookHome = portrait ? [0, 3.4, -20] : [0, 3.2, -20]; P.introGlyph = portrait ? [0, 11, -30] : [0, 12, -32]; P.introW = portrait ? 6 : 9; }
  if (SCENE === 'alley') { P.lookHome = portrait ? [0, 1.2, -10] : [0, 3.4, -10]; }
  const CAM_HOME = new THREE.Vector3(...P.camHome);
  const LOOK_HOME = new THREE.Vector3(...P.lookHome);
  camera.position.copy(CAM_HOME);
  const look = LOOK_HOME.clone();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(PR);
  composer.addPass(new RenderPass(scene, camera));
  // 피사계 심도: 초점 밖 등불이 동그랗게 번지는 영화 같은 느낌 (홈·뽑기 거리)
  const bokeh = SCENE === 'street' ? new BokehPass(scene, camera, { focus: 13, aperture: .0009, maxblur: .006 }) : null;
  if (bokeh) composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .75, .5, .78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // 필름 질감: 그레인·비네팅·살짝 색 번짐·분홍/청록 색보정 (맛집 골목)
  const FILM = SCENE === 'momiji' || SCENE === 'alley' || SCENE === 'sando' || SCENE === 'street' || SCENE === 'pond';
  const film = FILM ? new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - .5; float r = dot(d, d);
        vec2 off = d * r * .012;
        vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        float l = dot(c, vec3(.299, .587, .114));
        c = mix(c, c * vec3(1.06, .96, 1.08), .6);                 // 살짝 분홍빛
        c += vec3(.02, .035, .055) * (1. - l);                       // 어두운 곳은 푸른 기
        c = c * .94 + .025;                                          // 필름처럼 검정을 살짝 띄움
        c *= 1. - r * 1.15;                                          // 비네팅
        c += (h(vUv * 900. + uTime) - .5) * .055;                    // 그레인
        gl_FragColor = vec4(c, 1.);
      }`,
  }) : null;
  if (film) composer.addPass(film);

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

  // 홈·뽑기 거리의 건물·벚꽃 등은 아래 '홈·뽑기: 축제 거리' 블록에서 만듦

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
    const ck = `${text}|${kind}|${seed}`;
    const cached = PAPER_CACHE.get(ck);
    if (cached) { const t = new THREE.CanvasTexture(cached); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
    const r = rnd(seed);
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    g.scale(.5, .5);
    const base = { white: ['#B9A88C', '#E6D6B8', '#EFE0C4'], pink: ['#B8486A', '#E2708E', '#EE8AA4'], gold: ['#A8701A', '#D9A23A', '#EDBB52'], vermil: ['#A82A14', '#D8401E', '#EC5428'] }[kind] || ['#B5341C', '#E9542F', '#F2643A'];
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
    // 붓글씨 글꼴이 아직 안 왔으면 저장하지 않음 (다음 무대에서 제 글꼴로 다시 그리게)
    if (!text || fontReady()) PAPER_CACHE.set(ck, c);
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
        totalEmissiveRadiance *= (through + hot) * mix(.45, 1., cap);
        #ifdef USE_INSTANCING_COLOR
        totalEmissiveRadiance *= vColor.rgb;
        #endif`);
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
  if (SCENE === 'street' || SCENE === 'enmusubi') for (let i = 0; i < ROWS; i++) {
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
  if (SCENE === 'street' || SCENE === 'enmusubi') for (let i = 0; i < ROWS; i++) {
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
  // 높이 그림 → 노멀맵 (나무결·돌 틈·기와 골이 빛을 받아 입체로 보이게)
  function normalTex(w, h, drawHeight, strength = 2.5, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); drawHeight(g, w, h);
    const src = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), o = out.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * strength, dy = (H(x, y - 1) - H(x, y + 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      o[i] = (dx / l * .5 + .5) * 255; o[i + 1] = (dy / l * .5 + .5) * 255; o[i + 2] = (1 / l * .5 + .5) * 255; o[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  }
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
  const crowd = [], steams = [], dancers = [], petals = [];
  let floatBob = false;
  const tickers = [];     // 무대별 매 프레임 갱신   // 뽑기 무대: 연등이 둥실둥실
  let petalsIM = null; const petalObj = new THREE.Object3D(); const clouds = [];
  const petalTex = canvasTex(32, 32, (g) => { g.fillStyle = '#FFC4DA'; g.beginPath(); g.moveTo(16, 2); g.bezierCurveTo(30, 8, 26, 26, 16, 30); g.bezierCurveTo(6, 26, 2, 8, 16, 2); g.fill(); g.fillStyle = '#F7A3C0'; g.beginPath(); g.moveTo(16, 2); g.lineTo(13, 8); g.lineTo(19, 8); g.fill(); });
  let petalTop = 7, petalW = 5;
  function spawnPetals(n, top, width, zFront, size = .12, color = '#FFB8D2', tex = petalTex, fallenColor = '#d8a0b4') {
    petalTop = top; petalW = width;
    const m = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, alphaTest: .3, side: THREE.DoubleSide });
    petalsIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(size, size), m, n); petalsIM.frustumCulled = false; scene.add(petalsIM);
    for (let k = 0; k < n; k++) petals.push({ x: (Math.random() - .5) * width, y: Math.random() * top, z: zFront - Math.random() * 30, v: .35 + Math.random() * .35, ph: Math.random() * 6.28, rx: Math.random() * 6, ry: Math.random() * 6, sp: 1 + Math.random() * 2 });
    const fallen = new THREE.InstancedMesh(new THREE.PlaneGeometry(.075, .075), new THREE.MeshBasicMaterial({ map: tex, color: fallenColor, transparent: true, alphaTest: .3 }), 200);
    const fo = new THREE.Object3D();
    for (let k = 0; k < 200; k++) { fo.position.set((Math.random() - .5) * width * .9, .016, zFront - 2 - Math.random() * 12); fo.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); fo.updateMatrix(); fallen.setMatrixAt(k, fo.matrix); }
    scene.add(fallen);
  }

  // 사람: 유카타 실루엣 (밝은 불빛 앞에서 검은 그림자로 읽히게)
  const SIL = new THREE.MeshBasicMaterial({ color: '#07060B' });
  const personGeo = new THREE.LatheGeometry([[0, 0], [.25, 0], [.23, .3], [.19, .62], [.165, .82], [.2, 1.02], [.235, 1.12], [.14, 1.2], [.06, 1.24], [0, 1.25]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
  const pHeadGeo = new THREE.SphereGeometry(.12, 14, 10), bunGeo = new THREE.SphereGeometry(.065, 10, 8);
  const sleeveGeo = new THREE.BoxGeometry(.06, .34, .2); sleeveGeo.translate(0, -.2, 0);
  const obiMats = ['#3A2414', '#3A1418', '#2A2238', '#14283A'].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const obiGeo = new THREE.CylinderGeometry(.172, .172, .1, 14);
  function makePerson(seed = 0, opts = {}) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(personGeo, SIL));
    const head = new THREE.Mesh(pHeadGeo, SIL); head.position.y = 1.36; g.add(head);
    if (seed % 2) { const bun = new THREE.Mesh(bunGeo, SIL); bun.position.set(0, 1.46, -.06); g.add(bun); }
    const obi = new THREE.Mesh(obiGeo, obiMats[seed % obiMats.length]); obi.position.y = .8; g.add(obi);
    const arms = [];
    for (const sd of [-1, 1]) {
      const ar = new THREE.Group(); ar.position.set(sd * .21, 1.1, 0);
      const sl = new THREE.Mesh(sleeveGeo, SIL); ar.add(sl); g.add(ar); arms.push(ar);
    }
    if (opts.umbrella) { const ub = new THREE.Mesh(new THREE.ConeGeometry(.52, .22, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#0B0A12', side: THREE.DoubleSide })); ub.position.y = 1.85; g.add(ub); }
    if (opts.fan) { const fan = new THREE.Mesh(new THREE.CircleGeometry(.11, 14), SIL); fan.position.set(.3, .95, .08); g.add(fan); }
    g.scale.setScalar(.9 + ((seed * 37) % 10) / 40);
    return { g, arms };
  }   // 야타이 거리: 걷는 사람들, 김
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
      if (i > 0) {
      const px = x + inward * 1.45, pz = z + 1.75;
      const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 3.4, 6), pole); pl2.position.set(px, 1.7, pz); scene.add(pl2);
      const flagGeo = new THREE.PlaneGeometry(.55, 2.1); flagGeo.translate(inward * .3, 0, 0);
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ map: textBanner(name, fbg, ffg, true, .55 / 2.1), toneMapped: false, side: THREE.DoubleSide }));
      const fp = new THREE.Group(); fp.position.set(px, 2.15, pz); fp.rotation.y = inward * .9; fp.add(flag); scene.add(fp);
      swayers.push({ o: flag, ph: Math.random() * 6.28, amp: .18, axis: 'y' });
      }
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
    // ── 3D 디테일: 처마 전구, 가리비 처마천, 김, 사람들, 길 끝 도리이 ──
    const bulbGeo = new THREE.SphereGeometry(.045, 8, 6);
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#FFD9A0', toneMapped: false });
    const bulbPos = [];
    const scallop = canvasTex(512, 96, (g, w, h) => {
      for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#F2EDE2' : '#C8301F'; g.fillRect(x, 0, 32, h - 26); }
      g.globalCompositeOperation = 'destination-out';
      for (let x = 0; x <= w; x += 64) { g.beginPath(); g.arc(x, h, 30, 0, Math.PI * 2); g.fill(); }
    });
    const scMat = new THREE.MeshStandardMaterial({ map: scallop, emissiveMap: scallop, emissive: new THREE.Color('#FFB070'), emissiveIntensity: .7, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .9 });
    const steamTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, 'rgba(255,240,225,.55)'); gr.addColorStop(1, 'rgba(255,240,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const HOT = new Set(['焼きそば', 'たこ焼き', 'やきとり', 'いか焼き', 'ベビーカステラ']);
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const z = 1 - i * 5, x = side * 3.0 * W, inward = -side;
      for (let k = 0; k <= 8; k++) bulbPos.push(new THREE.Vector3(x + inward * 1.16, 2.62, z - 1.7 + k * (3.4 / 8)));
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(3.7, .42), scMat);
      sc.position.set(x + inward * 1.19, 2.42, z); sc.rotation.y = inward * Math.PI / 2; scene.add(sc);
      const name = NAMES[(i * 2 + (side > 0 ? 1 : 0)) % NAMES.length];
      if (HOT.has(name)) for (let k = 0; k < 4; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
        scene.add(sp); steams.push({ s: sp, x: x + inward * .45, z: z + (Math.random() - .5) * 2, t: Math.random() * 3 });
      }
      // 가게 안 주인 실루엣
      const vend = new THREE.Group();
      const vb = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .55, 4, 10), new THREE.MeshStandardMaterial({ color: '#2B1A14', roughness: .9 }));
      vb.position.y = 1.05; const vh = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 10), vb.material); vh.position.y = 1.62;
      const band = new THREE.Mesh(new THREE.TorusGeometry(.15, .025, 6, 16), new THREE.MeshBasicMaterial({ color: '#F2EDE2' })); band.position.y = 1.66; band.rotation.x = Math.PI / 2;
      vend.add(vb, vh, band); vend.position.set(x - inward * .15, 0, z + (Math.random() - .5) * 1.4); scene.add(vend);
    }
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbPos.length);
    const m4 = new THREE.Matrix4(); bulbPos.forEach((v, k) => bulbs.setMatrixAt(k, m4.makeTranslation(v.x, v.y, v.z))); scene.add(bulbs);
    // 걷는 사람들 (유카타 색, 우치와)
    const YUKATA = ['#24305E', '#5B1E2D', '#2E3B2C', '#3B2A4E', '#1C2433', '#6A3A2A'];
    for (let k = 0; k < (portrait ? 18 : 26); k++) {
      const { g } = makePerson(k, { fan: k % 4 === 0 });
      const dir = Math.random() < .5 ? 1 : -1;
      g.position.set((Math.random() - .5) * 2.6 * W, 0, 3 - Math.random() * 34); g.rotation.y = dir > 0 ? 0 : Math.PI;
      scene.add(g); crowd.push({ g, dir, v: .35 + Math.random() * .35, ph: Math.random() * 6.28 });
    }
    // 길 끝 도리이
    const toriiMat = new THREE.MeshStandardMaterial({ color: '#C8321F', emissive: '#5A1006', emissiveIntensity: .6, roughness: .6 });
    const tor = new THREE.Group();
    for (const tx of [-2.2, 2.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, 5.2, 12), toriiMat); c.position.set(tx, 2.6, 0); tor.add(c); }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(6.2, .32, .45), new THREE.MeshStandardMaterial({ color: '#1A0D0A', roughness: .7 })); kasagi.position.y = 5.3; tor.add(kasagi);
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(5.6, .26, .38), toriiMat); shimaki.position.y = 5.0; tor.add(shimaki);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.2, .2, .26), toriiMat); nuki.position.y = 4.1; tor.add(nuki);
    tor.position.set(0, 0, -38); scene.add(tor);
  }

  // 뽑기: 배포 버전 그대로의 어두운 밤거리 (건물 실루엣 + 따뜻한 창문, 등불은 아래 공용 코드)
  if (SCENE === 'enmusubi') {
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

  // 홈: 달밤의 연못 — 물 위에 띄운 연등, 붉은 아치 다리, 벚꽃 나무, 석등, 바위 물가, 반딧불, 진짜 반사
  if (SCENE === 'pond') {
    renderer.toneMappingExposure = 1.2;
    DRIFT = 0; SCROLL_DEPTH = 3; SKY_EVERY = 6500;
    scene.background = canvasTex(4, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#040714'); gr.addColorStop(.45, '#0C1630'); gr.addColorStop(.7, '#1C2440'); gr.addColorStop(1, '#0A0E1A'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.FogExp2('#0D1428', .022);
    scene.add(new THREE.HemisphereLight('#5868A0', '#141008', .5));
    ground.visible = false;
    const MOONP = new THREE.Vector3(portrait ? 11 : 20, 19, -62);
    const moonL = new THREE.DirectionalLight('#9FB2E8', .55); moonL.position.copy(MOONP); scene.add(moonL);

    // 지형: 가운데는 연못(물 아래로), 바깥은 풀 언덕, 멀리 갈수록 높아짐
    const PA = portrait ? 7.5 : 11, PB = 12, PZ = -8;
    const pd = (x, z) => Math.hypot(x / PA, (z - PZ) / PB);
    const nz = (x, z) => Math.sin(x * .37) * Math.cos(z * .29) * .5 + Math.sin(x * .11 + z * .17) * .5 + Math.sin(x * 1.3 + z * .9) * .08;
    const th = (x, z) => { const d = pd(x, z); if (d < 1) return -.7; const s = Math.min(1, (d - 1) / .25); return s * s * (3 - 2 * s) * .55 + Math.max(0, d - 1.15) * (.9 + nz(x, z) * .6) + Math.max(0, -z - 26) * .25; };
    const tg = new THREE.PlaneGeometry(90, 90, 140, 140); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3), cA = new THREE.Color('#1A2416'), cB = new THREE.Color('#2C2418'), cC = new THREE.Color('#121A10'), tc = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i) - 20, y = th(x, z); tp.setY(i, y); tp.setZ(i, z);
      const d = pd(x, z); tc.copy(d < 1.12 ? cB : cA).lerp(cC, Math.min(1, Math.max(0, (d - 1.4)))); tc.offsetHSL(0, 0, nz(x * 3, z * 3) * .03);
      tcol.set([tc.r, tc.g, tc.b], i * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3)); tg.computeVertexNormals();
    const grassN = normalTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 4); } }, 2, 30, 30);
    scene.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, normalMap: grassN })));

    // 수면: 실제 반사 + 잔물결 반짝임
    const mirror = new Reflector(new THREE.PlaneGeometry(PA * 2.2, PB * 2.2), { textureWidth: Math.min(768, innerWidth * PR * .4) | 0, textureHeight: Math.min(768, innerHeight * PR * .4) | 0, color: '#3C465C', clipBias: .003 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, PZ); scene.add(mirror);
    const ripN = normalTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 40, v = Math.random() < .5 ? 60 : 200; g.strokeStyle = `rgba(${v},${v},${v},.35)`; g.lineWidth = 2 + Math.random() * 3; g.beginPath(); g.ellipse(x, y, r * 2.2, r * .5, 0, 0, 6.29); g.stroke(); } }, 1.6, 4, 6);
    const film = new THREE.Mesh(new THREE.PlaneGeometry(PA * 2.2, PB * 2.2), new THREE.MeshStandardMaterial({ color: '#0A1020', roughness: .45, metalness: .3, normalMap: ripN, transparent: true, opacity: .35 }));
    film.rotation.x = -Math.PI / 2; film.position.set(0, .01, PZ); scene.add(film);
    tickers.push((t) => ripN.offset.set(Math.sin(t * .05) * .04, t * .008));

    // 물가 바위 (울퉁불퉁한 돌을 인스턴싱)
    const rockG = new THREE.DodecahedronGeometry(1, 1); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(i * 12.9) * .5) * .25; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } rockG.computeVertexNormals(); }
    const stoneN = normalTex(256, 256, (g, w, h) => { for (let i = 0; i < 1400; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 3 + Math.random() * 6); } }, 3);
    const stoneM = new THREE.MeshStandardMaterial({ color: '#6A6C6E', roughness: .85, normalMap: stoneN });
    const NR = 70, rocks = new THREE.InstancedMesh(rockG, stoneM, NR), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < NR; i++) {
      const a = i / NR * 6.283 + Math.random() * .05, dd = 1 + Math.random() * .06, x = Math.cos(a) * PA * dd, z = PZ + Math.sin(a) * PB * dd, s = .3 + Math.random() * .45;
      rocks.setMatrixAt(i, m4.compose(v3.set(x, -.05 + Math.random() * .1, z), q.setFromEuler(e.set(Math.random(), Math.random() * 6, Math.random())), s3.set(s * (1 + Math.random() * .6), s * .6, s)));
      rocks.setColorAt(i, col.setScalar(.6 + Math.random() * .5));
    }
    scene.add(rocks);
    // 물가 풀
    const NG = portrait ? 260 : 420, grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, 1, 3).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: '#3A5A30', roughness: 1 }), NG);
    for (let i = 0; i < NG; i++) {
      let a = Math.random() * 6.283; if (Math.sin(a) > .45) a = -a; const dd = 1.06 + Math.random() * .3, x = Math.cos(a) * PA * dd, z = PZ + Math.sin(a) * PB * dd, h = .3 + Math.random() * .7;
      grass.setMatrixAt(i, m4.compose(v3.set(x, th(x, z) - .02, z), q.setFromEuler(e.set((Math.random() - .5) * .5, 0, (Math.random() - .5) * .5)), s3.set(1, h, 1)));
      grass.setColorAt(i, col.setHSL(.27 + Math.random() * .05, .35, .12 + Math.random() * .1));
    }
    scene.add(grass);
    // 연잎 + 몇 송이 연꽃
    const NP = 34, pads = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20, .35, 6.283 - .35).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2A4A2A', roughness: .6, side: THREE.DoubleSide }), NP);
    const lotusM = new THREE.MeshStandardMaterial({ color: '#F4B8CC', emissive: '#6A2A3A', emissiveIntensity: .4, roughness: .6 });
    for (let i = 0; i < NP; i++) {
      const a = Math.random() * 6.283, dd = .55 + Math.random() * .4, x = Math.cos(a) * PA * dd, z = PZ + Math.sin(a) * PB * dd, s = .25 + Math.random() * .35;
      pads.setMatrixAt(i, m4.compose(v3.set(x, .02, z), q.setFromEuler(e.set(0, Math.random() * 6, 0)), s3.set(s, 1, s)));
      pads.setColorAt(i, col.setHSL(.3, .35, .14 + Math.random() * .1));
      if (i % 6 === 0) { const fl = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8, 0, 6.283, 0, 1.3), lotusM); fl.position.set(x, .04, z); scene.add(fl); }
    }
    scene.add(pads);

    // 물에 띄운 연등: 작은 나무 뗏목 위 둥근 제등
    const woodM = new THREE.MeshStandardMaterial({ color: '#4A3020', roughness: .8 });
    const plankG = new THREE.BoxGeometry(1, .07, .18), stickG = new THREE.CylinderGeometry(.015, .015, 1, 5);
    const halo = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,160,90,.9)'); gr.addColorStop(.35, 'rgba(255,110,60,.3)'); gr.addColorStop(1, 'rgba(255,110,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const rs = rnd(21), spots = [], FRONT = PZ - 3.2;   // 다리(PZ-4.5) 앞쪽
    for (let n = 0; spots.length < 12 && n < 4000; n++) { const z = PZ + 8 - rs() * (8 - (FRONT - PZ)), x = (rs() - .5) * PA * 1.4; if (pd(x, z) < .84 && spots.every((p) => Math.hypot(p[0] - x, p[1] - z) > (n < 2500 ? 2.1 : 1.7))) spots.push([x, z]); }
    for (let n = 0, k = 0; k < 3 && n < 2000; n++) { const z = PZ - 6 - rs() * 4, x = (rs() - .5) * PA * 1.1; if (pd(x, z) < .8 && spots.slice(12).every((p) => Math.hypot(p[0] - x, p[1] - z) > 2)) { spots.push([x, z]); k++; } }
    // 등마다 다른 한 글자 (뜻이 다른 소원) + 색: 빨강·주홍·흰·분홍·금
    const POND_L = [['縁', 'red'], ['福', 'gold'], ['夢', 'white'], ['恋', 'pink'], ['旅', 'vermil'], ['願', 'red'], ['幸', 'white'], ['結', 'pink'], ['光', 'gold'], ['和', 'vermil'], ['寿', 'red'], ['花', 'white'], ['月', 'gold'], ['祭', 'red'], ['宝', 'vermil']];
    const halos = [];
    spots.forEach(([x, z], i) => {
      const raft = new THREE.Group();
      for (let k = -2; k <= 2; k++) { const pl = new THREE.Mesh(plankG, woodM); pl.position.set(0, .04, k * .19); raft.add(pl); }
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .1, 12), woodM); stand.position.y = .11; raft.add(stand);
      const lk = POND_L[i % POND_L.length], l = makeLantern(lanternPaper(lk[0], lk[1], i * 7 + 3), .62, false, lk[1] === 'white');
      l.children[0].rotation.y = Math.PI; l.children[4].visible = false; l.position.y = .16 + .66 * .62;
      raft.add(l);
      raft.position.set(x, 0, z); raft.rotation.y = (rs() - .5) * .8;
      l.userData.base = raft.children.filter((c) => c !== l);
      raft.userData = l.userData; raft.userData.bob = { y: 0, x, z, ph: rs() * 6.28, sp: .9, amp: .03, dx: .3 };
      scene.add(raft); street.push(raft);
      const hm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      hm.rotation.x = -Math.PI / 2; scene.add(hm); halos.push([raft, hm]);
    });
    floatBob = true;
    tickers.push(() => { for (const [l, hm] of halos) { hm.position.set(l.position.x, .03, l.position.z); hm.material.opacity = Math.min(1, l.userData.lit) * .6; } });

    // 붉은 아치 다리 (太鼓橋): 판자·난간·기둥·기보시까지
    const woodN = normalTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const v = 90 + Math.random() * 90 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (Math.random() - .5) * 10, w * .7, y + (Math.random() - .5) * 10, w, y); g.stroke(); } }, 2);
    const vermil = new THREE.MeshStandardMaterial({ color: '#C8371E', emissive: '#3A0A02', emissiveIntensity: .5, roughness: .5, normalMap: woodN });
    const deckM = new THREE.MeshStandardMaterial({ color: '#5A3A26', roughness: .7, normalMap: woodN });
    const goldM = new THREE.MeshStandardMaterial({ color: '#C9A24A', metalness: .8, roughness: .3 });
    const BZ = PZ - 4.5; P.bridgeZ = BZ; const half = PA * Math.sqrt(1 - ((BZ - PZ) / PB) ** 2) + .6, H = 1.5;
    const by = (x) => .25 + H * Math.cos(Math.min(1, Math.abs(x) / half) * Math.PI / 2);
    const bridge = new THREE.Group(); bridge.position.set(0, 0, BZ); scene.add(bridge);
    const NPL = Math.ceil(half * 2 / .24), planks = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .06, 1.9), deckM, NPL);
    for (let i = 0; i < NPL; i++) { const x = -half + (i + .5) * (half * 2 / NPL), sl = Math.atan2(by(x + .05) - by(x - .05), .1); planks.setMatrixAt(i, m4.compose(v3.set(x, by(x), 0), q.setFromEuler(e.set(0, 0, sl)), s3.set(1, 1, 1))); }
    bridge.add(planks);
    const seg = (x0, x1, z, yOff, hgt, th2) => { const xm = (x0 + x1) / 2, y0 = by(x0) + yOff, y1 = by(x1) + yOff, len = Math.hypot(x1 - x0, y1 - y0); const b = new THREE.Mesh(new THREE.BoxGeometry(len + .02, hgt, th2), vermil); b.position.set(xm, (y0 + y1) / 2, z); b.rotation.z = Math.atan2(y1 - y0, x1 - x0); bridge.add(b); };
    const NS = 18;
    for (const z of [-1, 1]) {
      for (let i = 0; i < NS; i++) { const x0 = -half + i * half * 2 / NS, x1 = x0 + half * 2 / NS; seg(x0, x1, z * .98, -.14, .26, .14); seg(x0, x1, z * .98, .78, .08, .1); seg(x0, x1, z * .98, .42, .05, .06); }
      for (let i = 0; i <= 10; i++) {
        const x = -half + .1 + i * (half * 2 - .2) / 10, p = new THREE.Mesh(new THREE.BoxGeometry(.09, .82, .09), vermil); p.position.set(x, by(x) + .4, z * .98); bridge.add(p);
        if (i === 0 || i === 10 || i === 5) { const gb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), goldM); gb.position.set(x, by(x) + .9, z * .98); bridge.add(gb); const gt = new THREE.Mesh(new THREE.ConeGeometry(.05, .14, 10), goldM); gt.position.set(x, by(x) + 1.02, z * .98); bridge.add(gt); }
        if (i === 2 || i === 8) { const hl = makeLantern(PAPERS[(i + (z > 0 ? 3 : 0)) % PAPERS.length], .3); hl.position.set(x, by(x) + .55, z * 1.12); bridge.add(hl); street.push(hl); }
      }
    }
    for (const x of [-half * .62, -half * .25, half * .25, half * .62]) for (const z of [-.85, .85]) { const hgt = by(x) + .7, leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, hgt, 10), vermil); leg.position.set(x, by(x) - hgt / 2 - .1, z); bridge.add(leg); }
    for (const x of [-half * .62, -half * .25, half * .25, half * .62]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, 1.8), vermil); cb.position.set(x, by(x) - .45, 0); bridge.add(cb); }
    const bl = new THREE.PointLight('#FF9050', 5, 7, 2); bl.position.set(0, by(0) + 1.2, 1.6); bridge.add(bl);

    // 석등 (춘일형): 받침·기둥·불집·지붕·보주
    const fireM = new THREE.MeshBasicMaterial({ color: '#FFB060', toneMapped: false });
    const toro = (x, z, s) => {
      const g = new THREE.Group(); g.position.set(x, th(x, z), z); g.scale.setScalar(s); scene.add(g);
      const L = (pts, y, seg = 6) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), stoneM); m.position.y = y; g.add(m); };
      L([[0, 0], [.42, 0], [.4, .1], [.26, .2], [0, .2]], 0);
      L([[0, 0], [.12, 0], [.1, .9], [0, .9]], .2, 12);
      L([[0, 0], [.32, 0], [.3, .12], [0, .12]], 1.1);
      const box = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .34, 6), stoneM); box.position.y = 1.4; g.add(box);
      const fire = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .22, 6), fireM); fire.position.y = 1.4; g.add(fire);
      L([[0, .45], [.1, .4], [.48, .08], [.56, 0], [.5, -.02], [0, -.02]], 1.6);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), stoneM); ball.position.y = 2.12; g.add(ball);
      const mo = new THREE.Mesh(new THREE.SphereGeometry(.38, 10, 6), new THREE.MeshStandardMaterial({ color: '#2E4228', roughness: 1 })); mo.scale.set(1, .22, 1); mo.position.y = 1.72; g.add(mo);
      const pl = new THREE.PointLight('#FFA050', 3, 5, 2); pl.position.y = 1.4; g.add(pl);
    };
    toro(-PA * .95 - .6, PZ + 7, .9); toro(PA * .9 + .7, PZ + 3, .8);

    // 벚꽃 나무: 휜 줄기·가지 + 꽃송이 덩어리
    const barkM = new THREE.MeshStandardMaterial({ color: '#2A1C16', roughness: .95, normalMap: woodN });
    const bloomM = new THREE.MeshStandardMaterial({ color: '#F2A8C4', emissive: '#5A1E34', emissiveIntensity: .35, roughness: .8 });
    const blossomG = new THREE.IcosahedronGeometry(1, 2);
    const sakura = (x, z, s, lean) => {
      const base = new THREE.Vector3(x, th(x, z) - .1, z), r = rnd(Math.abs(x * 13 + z) | 0), tips = [];
      const branch = (p0, dir, len, rad, depth) => {
        const p1 = p0.clone().add(dir.clone().multiplyScalar(len)), mid = p0.clone().lerp(p1, .5).add(new THREE.Vector3((r() - .5) * .4, (r() - .5) * .2, (r() - .5) * .4));
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 8, rad, 6), barkM));
        if (depth === 0) { tips.push(p1); return; }
        for (let k = 0; k < 2 + (r() < .5 ? 1 : 0); k++) { const d2 = dir.clone().add(new THREE.Vector3((r() - .5) * 1.6, r() * .3, (r() - .5) * 1.2)).normalize(); branch(p1, d2, len * .72, rad * .62, depth - 1); }
      };
      branch(base, new THREE.Vector3(lean, 1, 0).normalize(), 2.4 * s, .2 * s, 3);
      const bl2 = new THREE.InstancedMesh(blossomG, bloomM, tips.length * 5);
      let k = 0; for (const tp2 of tips) for (let j = 0; j < 5; j++) { const sz = (.35 + r() * .4) * s; bl2.setMatrixAt(k++, m4.compose(v3.set(tp2.x + (r() - .5) * 1.1 * s, tp2.y + (r() - .3) * .6 * s, tp2.z + (r() - .5) * 1.1 * s), q.identity(), s3.set(sz, sz * .8, sz))); bl2.setColorAt(k - 1, col.setHSL(.93 + r() * .04, .55, .72 + r() * .12)); }
      scene.add(bl2);
    };
    sakura(-PA - 1.8, PZ + 5, 1.1, .45); sakura(PA + 2.5, PZ - 6, .9, -.35);
    spawnPetals(portrait ? 240 : 360, 7, PA * 2.2, 6, .17);

    // 먼 산 능선 + 능선 위 나무 실루엣
    [['#0E1630', -48, 9, .7], ['#0A1024', -40, 6.5, 1.1]].forEach(([c, z, hgt, f], kk) => {
      const shp = new THREE.Shape(); shp.moveTo(-70, -2);
      for (let x = -70; x <= 70; x += 2) shp.lineTo(x, 2 + hgt * (.5 + .5 * Math.sin(x * .06 * f + kk * 2) * Math.cos(x * .025 + kk)));
      shp.lineTo(70, -2);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shp), new THREE.MeshBasicMaterial({ color: c })); m.position.z = z; scene.add(m);
    });
    // 달: 크레이터가 있는 구 + 번지는 달무리 + 구름
    const moonTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#F1ECDC'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,140,120,.45)'); gr.addColorStop(1, 'rgba(150,140,120,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 24), new THREE.MeshBasicMaterial({ map: moonTex, color: '#FFF6E0', fog: false, toneMapped: false })); moon.position.copy(MOONP); scene.add(moon);
    const mh = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#A8B8FF', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); mh.position.copy(MOONP); mh.scale.setScalar(11); mh.material.opacity = .28;
    // 물에 비친 달은 은은하게: 반사 그릴 때만 달무리를 끄고 달을 어둡게
    const mirB = mirror.onBeforeRender;
    mirror.onBeforeRender = function (...a) { mh.visible = false; moon.material.color.set('#4A4C58'); mirB.apply(this, a); mh.visible = true; moon.material.color.set('#FFF6E0'); }; scene.add(mh);
    const cloudT = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 22; i++) { const x = 60 + Math.random() * 136, y = 52 + Math.random() * 24, r = 12 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,120,160,.22)'); gr.addColorStop(1, 'rgba(110,120,160,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
    const clouds2 = [];
    for (let i = 0; i < 6; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, opacity: .7, depthWrite: false, fog: false })); c.position.set((Math.random() - .5) * 60, 12 + Math.random() * 10, -55 - Math.random() * 8); c.scale.set(22, 9, 1); scene.add(c); clouds2.push(c); }
    tickers.push((t, dt) => { for (const c of clouds2) { c.position.x += .006; if (c.position.x > 40) c.position.x = -40; } });
    const sp = []; for (let i = 0; i < 600; i++) sp.push((Math.random() - .5) * 160, 10 + Math.random() * 50, -70);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#C8D4FF', size: .16, fog: false, transparent: true, opacity: .75 })));
    // 반딧불
    const NF = portrait ? 30 : 50, fp = new Float32Array(NF * 3), fseed = [];
    for (let i = 0; i < NF; i++) fseed.push([(Math.random() - .5) * PA * 2.4, .3 + Math.random() * 2, PZ + (Math.random() - .5) * PB * 2, Math.random() * 6.28]);
    const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({ map: GLOW, color: '#D8FF8A', size: .22, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(flies);
    tickers.push((t) => { for (let i = 0; i < NF; i++) { const [x, y, z, ph] = fseed[i]; fp[i * 3] = x + Math.sin(t * .3 + ph) * .8; fp[i * 3 + 1] = y + Math.sin(t * .7 + ph * 2) * .25; fp[i * 3 + 2] = z + Math.cos(t * .25 + ph) * .6; } fgeo.attributes.position.needsUpdate = true; flies.material.opacity = .6 + .3 * Math.sin(t * 2); });
    // 물 위 낮은 안개
    const mistT = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(150,165,200,.45)'); gr.addColorStop(1, 'rgba(150,165,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    for (let i = 0; i < 8; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistT, transparent: true, opacity: .06, depthWrite: false })); m.position.set((Math.random() - .5) * PA * 1.6, .35, PZ + 3 - i * 1.8); m.scale.set(7, 1.2, 1); scene.add(m); }
  }

  // 홈·뽑기: 벚꽃 핀 교토풍 축제 거리 — 목조 2층 마치야, 격자문 불빛, 노렌, 처마, 벚꽃, 꽃잎, 젖은 돌바닥, 멀리 탑과 달
  if (SCENE === 'street') {
    renderer.toneMappingExposure = 1.25;
    // 하늘: 남색 → 지평선 보라빛
    scene.background = canvasTex(4, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060818'); gr.addColorStop(.55, '#141433'); gr.addColorStop(.8, '#2C1A3E'); gr.addColorStop(1, '#3A2040'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.FogExp2('#1A1430', .028);
    scene.add(new THREE.HemisphereLight('#6A6AA8', '#2A160C', .6));
    // 돌바닥: 판석 틈이 진 노멀맵 + 살짝 젖은 반사
    const paveN = normalTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); let y = 0; while (y < h) { const rh = 40 + Math.random() * 30; let x = -Math.random() * 40; while (x < w) { const rw = 50 + Math.random() * 60; g.fillStyle = `rgb(${200 + Math.random() * 55 | 0},0,0)`; g.fillRect(x + 4, y + 4, rw - 8, rh - 8); x += rw; } y += rh; } g.filter = 'blur(2px)'; g.drawImage(g.canvas, 0, 0); }, 1.6, 30, 40);
    ground.material = new THREE.MeshStandardMaterial({ color: '#34303A', roughness: .32, metalness: .45, normalMap: paveN, normalScale: new THREE.Vector2(.9, .9) });
    ground.receiveShadow = true;
    const grainN = normalTex(128, 256, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 128 + Math.sin(x * .9) * 40 + (Math.random() - .5) * 70; g.fillStyle = `rgb(${v | 0},0,0)`; g.fillRect(x, 0, 1, h); } }, 1.6, 2, 1);
    const plasterN = normalTex(128, 128, (g, w, h) => { for (let i = 0; i < 2600; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},0,0)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } g.filter = 'blur(1.5px)'; g.drawImage(g.canvas, 0, 0); }, 1.2, 2, 2);
    const wood = new THREE.MeshStandardMaterial({ color: '#4A2E1C', roughness: .7, normalMap: grainN });
    const woodD = new THREE.MeshStandardMaterial({ color: '#2A1A10', roughness: .7, normalMap: grainN });
    const plaster = new THREE.MeshStandardMaterial({ color: '#5A4C44', roughness: .95, normalMap: plasterN });
    const tileTex = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#34363E'; g.fillRect(0, 0, w, h); g.fillStyle = '#1A1B20'; for (let x = 0; x < w; x += 10) g.fillRect(x, 0, 3, h); });
    tileTex.wrapS = THREE.RepeatWrapping; tileTex.repeat.set(4, 1);
    const tileN = normalTex(128, 32, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 128 + Math.sin(x / 10 * Math.PI * 2) * 120; g.fillStyle = `rgb(${v | 0},0,0)`; g.fillRect(x, 0, 1, h); } }, 3, 4, 1);
    const tileM = new THREE.MeshStandardMaterial({ map: tileTex, normalMap: tileN, roughness: .45, metalness: .35 });
    // 달빛: 부드러운 그림자를 드리움
    const moonL = new THREE.DirectionalLight('#A8B8FF', 1.1);
    moonL.position.set(-9, 20, 4); moonL.target.position.set(0, 0, -16); scene.add(moonL, moonL.target);
    moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024); moonL.shadow.bias = -.0006; moonL.shadow.radius = 4;
    Object.assign(moonL.shadow.camera, { left: -16, right: 16, top: 26, bottom: -26, near: 2, far: 60 }); moonL.shadow.camera.updateProjectionMatrix();
    const glowM = new THREE.MeshBasicMaterial({ color: '#E88A45' });
    const winM = new THREE.MeshBasicMaterial({ color: '#E8A060' });
    const NOREN = [['#1F2A55', '#F4EFE6', 'そば'], ['#7A1E1A', '#F4EFE6', '甘味'], ['#2B2B2B', '#F2C14E', '酒'], ['#1F3A2E', '#F4EFE6', '茶'], ['#4A1E3A', '#F4EFE6', '飴'], ['#1F2A55', '#F4EFE6', '団子']];
    const latP = [], petalTrees = [];
    for (const side of [-1, 1]) for (let i = 0; i < 12; i++) {
      const z = 4 - i * 4, inner = side * P.bx, D = 3.2, h1 = 2.6, h2 = 2.2 + Math.random() * .6;
      if ((i === 3 && side < 0) || (i === 6 && side > 0) || (i === 9 && side < 0)) { petalTrees.push([inner + side * 1.2, z]); continue; }
      const g = new THREE.Group(); g.position.set(inner + side * D / 2, 0, z); scene.add(g);
      const f1 = new THREE.Mesh(new RoundedBoxGeometry(D, h1, 3.9, 2, .07), wood); f1.position.y = h1 / 2; g.add(f1);
      const f2 = new THREE.Mesh(new RoundedBoxGeometry(D - .2, h2, 3.9, 2, .07), plaster); f2.position.set(side * .1, h1 + h2 / 2, 0); g.add(f2);
      const fx = -side * (D / 2 + .01);   // 거리 쪽 벽면 (그룹 기준)
      // 1층: 불 켜진 가게 + 격자살
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.9), glowM); gp.position.set(fx, 1.05, 0); gp.rotation.y = -side * Math.PI / 2; g.add(gp);
      for (let k = 0; k < 8; k++) latP.push(new THREE.Vector3(g.position.x + fx - side * .05, 1.05, z - 1.5 + k * (3 / 7)));
      // 노렌
      const [nb, nf, nt] = NOREN[(i + (side > 0 ? 3 : 0)) % NOREN.length];
      const nr = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .75), new THREE.MeshStandardMaterial({ map: textBanner(nt, nb, nf, false, 1.3 / .75), roughness: .9, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: .08 }));
      nr.position.set(fx - side * .18, 1.78, (Math.random() - .5) * .8); nr.rotation.y = -side * Math.PI / 2; g.add(nr);
      swayers.push({ o: nr, ph: Math.random() * 6.28, amp: .05, axis: 'z' });
      // 1층 처마 (기와)
      const ev = new THREE.Mesh(new THREE.BoxGeometry(1.1, .1, 4.1), tileM); ev.position.set(fx - side * .45, h1 + .05, 0); ev.rotation.z = side * .32; g.add(ev);
      // 2층 창 (가로 살창)
      if (Math.random() < .75) {
        const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .55), winM); wn.position.set(fx + side * .09, h1 + h2 * .5, 0); wn.rotation.y = -side * Math.PI / 2; g.add(wn);
        for (let k = 0; k < 8; k++) latP.push(new THREE.Vector3(g.position.x + fx + side * .05, h1 + h2 * .5, z - .7 + k * .2));
      }
      // 지붕
      const rf = new THREE.Mesh(new THREE.BoxGeometry(D + .9, .14, 4.2), tileM); rf.position.set(-side * .3, h1 + h2 + .05, 0); rf.rotation.z = side * .38; g.add(rf);
      // 바닥에 비친 가게 불빛
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ map: GLOW, color: '#FFB070', transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(inner - side * 1.0, .02, z); scene.add(pool);
      g.traverse((o) => { if (o.isMesh && o.material !== glowM && o.material !== winM) { o.castShadow = true; o.receiveShadow = true; } });
    }
    // 등불 아래로 내려오는 은은한 빛기둥 + 바닥 빛 웅덩이
    const shaftTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,170,100,.55)'); gr.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const shaftM = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const shaftG = new THREE.CylinderGeometry(.25, 1.25, 3.1, 20, 1, true); shaftG.translate(0, -1.55, 0);
    for (const l of street) {
      const sh = new THREE.Mesh(shaftG, shaftM); sh.position.copy(l.position).add(new THREE.Vector3(0, -.35, 0)); scene.add(sh);
      const lp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: GLOW, color: '#FF9A55', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
      lp.rotation.x = -Math.PI / 2; lp.position.set(l.position.x * .9, .025, l.position.z); scene.add(lp);
      l.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    }
    const lat = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, 1, .045), woodD, latP.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3();
    latP.forEach((v, k) => { s4.set(1, v.y > 2 ? .55 : 1.9, 1); lat.setMatrixAt(k, m4.compose(v, q4, s4)); }); scene.add(lat);
    for (let k = 0; k < 5; k++) { const pl = new THREE.PointLight('#FFA866', 8, 11, 1.6); pl.position.set((k % 2 ? 1 : -1) * P.bx * .6, 2.2, 2 - k * 8); scene.add(pl); }
    // 벚꽃 나무 (분홍 꽃 덩어리 여러 개)
    const blossomM = new THREE.MeshStandardMaterial({ color: '#F29BBA', emissive: '#C2557E', emissiveIntensity: .18, roughness: .9 });
    const trunkM = new THREE.MeshStandardMaterial({ color: '#2A1A14', roughness: 1 });
    const blob = new THREE.IcosahedronGeometry(1, 3);
    const blobs = [], tr0 = [];
    for (const [x, z] of petalTrees.concat([[-(P.bx + 4), -52], [P.bx + 4, -48]])) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14, .26, 4.4, 8), trunkM); tr.position.set(x, 2.2, z); tr.rotation.z = (Math.random() - .5) * .2; scene.add(tr); tr0.push(tr);
      for (let k = 0; k < 30; k++) blobs.push([x + (Math.random() - .5) * 3.4, 4.4 + Math.random() * 2.2, z + (Math.random() - .5) * 3.2, .35 + Math.random() * .45]);
    }
    const bl = new THREE.InstancedMesh(blob, blossomM, blobs.length);
    blobs.forEach(([x, y, z, r], k) => bl.setMatrixAt(k, m4.compose(new THREE.Vector3(x, y, z), q4, new THREE.Vector3(r, r * .8, r))));
    scene.add(bl);
    // 멀리 5층탑 실루엣 + 달
    const pag = new THREE.Group(); pag.position.set(portrait ? 1.6 : 4, 0, -62); scene.add(pag);
    const pagM = new THREE.MeshStandardMaterial({ color: '#120E1C', roughness: 1 });
    for (let k = 0; k < 5; k++) {
      const w = 4.6 - k * .6, y = 3 + k * 3.2;
      const bd = new THREE.Mesh(new THREE.BoxGeometry(w * .55, 3, w * .55), pagM); bd.position.y = y - 1.5; pag.add(bd);
      const rr = new THREE.Mesh(new THREE.ConeGeometry(w * .82, .9, 4), pagM); rr.rotation.y = Math.PI / 4; rr.position.y = y + .1; pag.add(rr);
      const ln = new THREE.Mesh(new THREE.BoxGeometry(w * .56, .12, w * .56), new THREE.MeshBasicMaterial({ color: '#FF9A55' })); ln.position.y = y - 1.2; pag.add(ln);
    }
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 4, 6), pagM); sp.position.y = 18.5; pag.add(sp);
    const moonT = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,246,225,1)'); gr.addColorStop(.38, 'rgba(255,236,200,.95)'); gr.addColorStop(.42, 'rgba(255,220,170,.25)'); gr.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonT, color: '#D8CCB4', fog: false, transparent: true }));
    moon.position.set(portrait ? -3.5 : -9, portrait ? 17 : 13, -70); moon.scale.setScalar(9); scene.add(moon);
    // 꽃잎 + 오가는 사람
    spawnPetals(portrait ? 180 : 260, 7.5, P.bx * 2, 6);
    for (let k = 0; k < (portrait ? 9 : 14); k++) {
      const { g } = makePerson(k, { fan: k % 4 === 0 });
      const dir = Math.random() < .5 ? 1 : -1;
      g.position.set((Math.random() - .5) * P.bx * 1.2, 0, 2 - Math.random() * 34); g.rotation.y = dir > 0 ? 0 : Math.PI;
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(g); crowd.push({ g, dir, v: .25 + Math.random() * .25, ph: Math.random() * 6.28 });
    }
    bl.castShadow = true; tr0.forEach((t) => { t.castShadow = true; });
  }

  // 근처 축제: 산 위 신사로 오르는 축제 — 돌계단, 테라스, 겹지붕 본전, 제등 화환, 삼나무, 빛 내림, 안개, 꽃잎
  if (SCENE === 'sando') {
    SKY_EVERY = 5200; DRIFT = 2; SCROLL_DEPTH = 9;
    scene.fog = new THREE.FogExp2('#0A0E1C', .02);
    scene.add(new THREE.HemisphereLight('#5A6A9A', '#20140C', .55));
    const moon = new THREE.DirectionalLight('#9AB0E8', .55); moon.position.set(-10, 20, 6); scene.add(moon);
    const vermil = new THREE.MeshStandardMaterial({ color: '#D2391F', emissive: '#6A1406', emissiveIntensity: .5, roughness: .45 });
    const ink = new THREE.MeshStandardMaterial({ color: '#18161C', roughness: .5, metalness: .2 });
    const woodD = new THREE.MeshStandardMaterial({ color: '#4A2E1C', roughness: .75 });
    const woodR = new THREE.MeshStandardMaterial({ color: '#7A2A18', roughness: .6, emissive: '#3A0A04', emissiveIntensity: .4 });
    const stoneTex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#2A2826'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h, rw = 40 + Math.random() * 60, rh = 26 + Math.random() * 30, c = 70 + Math.random() * 40 | 0;
        g.fillStyle = `rgb(${c},${c - 4},${c - 8})`; g.beginPath(); g.ellipse(x, y, rw / 2, rh / 2, Math.random(), 0, 6.29); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.stroke(); }
    });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    const wallM = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .9 });
    const stepM = new THREE.MeshStandardMaterial({ color: '#5E5A55', roughness: .7, metalness: .15 });
    const paveM = new THREE.MeshStandardMaterial({ color: '#3A3836', roughness: .3, metalness: .5 });
    ground.material = paveM;
    // 지형: 1단 테라스(높이 4.5), 2단 테라스(높이 7.5), 가운데 돌계단
    const T1 = 4.5, T2 = 7.5, H1 = 2.2, H2 = 1.7;
    function terrace(xIn, xOut, y, z0, z1) {
      for (const sd of [-1, 1]) {
        const w = xOut - xIn, d = z0 - z1, tx = stoneTex.clone(); tx.needsUpdate = true; tx.repeat.set(w / 3, y / 3);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, y, d), [wallM, wallM, paveM, wallM, new THREE.MeshStandardMaterial({ map: tx, roughness: .9 }), wallM]);
        m.position.set(sd * (xIn + w / 2), y / 2, (z0 + z1) / 2); scene.add(m);
      }
    }
    terrace(H1, 30, T1, -6, -27); terrace(H2, 30, T2, -27, -60);
    const midT1 = new THREE.Mesh(new THREE.BoxGeometry(H1 * 2, T1, 12), paveM); midT1.position.set(0, T1 / 2, -21); scene.add(midT1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(H2 * 2, T2, 27), paveM); back.position.set(0, T2 / 2, -46.5); scene.add(back);
    function stairs(n, y0, z0, rise, run, half) {
      for (let k = 0; k < n; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(half * 2, rise * (k + 1) + y0, run), stepM); st.position.set(0, (rise * (k + 1) + y0) / 2, z0 - run * (k + .5)); scene.add(st); }
      for (const sd of [-1, 1]) {   // 돌 난간
        const len = Math.hypot(n * run, n * rise), ang = Math.atan2(n * rise, n * run);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.18, .16, len), stepM); rail.position.set(sd * (half + .1), y0 + n * rise / 2 + .75, z0 - n * run / 2); rail.rotation.x = ang; scene.add(rail);
        for (let k = 0; k <= n; k += 3) { const po = new THREE.Mesh(new THREE.BoxGeometry(.22, .9, .22), stepM); po.position.set(sd * (half + .1), y0 + k * rise + .45, z0 - k * run); scene.add(po); }
      }
    }
    stairs(18, 0, -6, T1 / 18, .5, H1); stairs(12, T1, -27, (T2 - T1) / 12, .5, H2);
    // 도리이 (1단 테라스 위, 계단 꼭대기)
    const kShape = new THREE.Shape(), KW = 3.9;
    kShape.moveTo(-KW, .45); for (let i = 0; i <= 20; i++) { const x = -KW + i / 20 * KW * 2; kShape.lineTo(x, .3 * (x / KW) ** 4); }
    kShape.lineTo(KW, .75); for (let i = 20; i >= 0; i--) { const x = -KW + i / 20 * KW * 2; kShape.lineTo(x, .3 * (x / KW) ** 4 + .42); }
    const kGeo = new THREE.ExtrudeGeometry(kShape, { depth: .66, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }); kGeo.translate(0, 0, -.33);
    const tg = new THREE.Group();
    for (const x of [-2.5, 2.5]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, 6.2, 20), vermil); pl.position.set(x, 3.1, 0); tg.add(pl); const bs = new THREE.Mesh(new THREE.CylinderGeometry(.4, .42, .6, 20), ink); bs.position.set(x, .3, 0); tg.add(bs); }
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(6.3, .32, .34), vermil); nuki.position.y = 4.8; tg.add(nuki);
    const shim = new THREE.Mesh(new THREE.BoxGeometry(7.2, .34, .5), vermil); shim.position.y = 6.15; tg.add(shim);
    const kas = new THREE.Mesh(kGeo, ink); kas.position.y = 6.33; tg.add(kas);
    const nawa = new THREE.Mesh(new THREE.TorusGeometry(2.2, .09, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: '#D8C08A', roughness: .9 })); nawa.rotation.z = Math.PI; nawa.scale.set(1.1, .22, 1); nawa.position.y = 4.65; tg.add(nawa);
    for (let k = 0; k < 7; k++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(.12, .3), new THREE.MeshBasicMaterial({ color: '#F4F0E6', side: THREE.DoubleSide })); sh.position.set(-1.8 + k * .6, 4.15 - Math.sin(k / 6 * Math.PI) * .45, .05); tg.add(sh); }
    tg.position.set(0, T1, -16.5); scene.add(tg);
    // 겹지붕 본전 (2단 테라스)
    const hall = new THREE.Group(); hall.position.set(0, T2, -40); scene.add(hall);
    const roofM = new THREE.MeshStandardMaterial({ color: '#2A2E36', roughness: .5, metalness: .35 });
    function roof(w, h, d, y) {
      const sh = new THREE.Shape(); sh.moveTo(-w, -.1); sh.quadraticCurveTo(-w * .55, h * .1, 0, h); sh.quadraticCurveTo(w * .55, h * .1, w, -.1); sh.lineTo(w * .97, -.42); sh.quadraticCurveTo(w * .5, -.15, 0, h - .45); sh.quadraticCurveTo(-w * .5, -.15, -w * .97, -.42); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
      const m = new THREE.Mesh(g, roofM); m.position.y = y; hall.add(m);
      const rg = new THREE.Mesh(new THREE.BoxGeometry(.4, .3, d + .2), ink); rg.position.y = y + h; hall.add(rg);
    }
    const veranda = new THREE.Mesh(new THREE.BoxGeometry(12, .45, 8), woodD); veranda.position.y = .5; hall.add(veranda);
    for (const x of [-5.6, 5.6]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.08, .7, 8), woodR); r.position.set(x, 1.05, 0); hall.add(r); }
    const rf = new THREE.Mesh(new THREE.BoxGeometry(11.2, .08, .08), woodR); rf.position.set(0, 1.35, 4); hall.add(rf);
    const body1 = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 6), woodR); body1.position.y = 2.3; hall.add(body1);
    const shoji = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#FFD49A'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4A2A14'; g.lineWidth = 3; for (let x = 0; x <= w; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.6), new THREE.MeshBasicMaterial({ map: shoji, toneMapped: false })); front.position.set(0, 2.2, 3.01); hall.add(front);
    for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, 3.3, 12), vermil); c.position.set(x, 2.35, 3.15); hall.add(c); }
    roof(7.4, 1.5, 8.2, 3.95);
    const body2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 4.4), woodR); body2.position.y = 5.9; hall.add(body2);
    const front2 = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.2), new THREE.MeshBasicMaterial({ map: shoji, toneMapped: false })); front2.position.set(0, 5.9, 2.21); hall.add(front2);
    roof(5.2, 1.9, 5.8, 6.85);
    const hl = new THREE.PointLight('#FFB070', 26, 22, 1.5); hl.position.set(0, 3, 7); hall.add(hl);
    // 처마 밑 등불 줄 (본전·테라스 가장자리)
    const bulbPts = [];
    for (let k = 0; k <= 26; k++) bulbPts.push([-6.8 + k * (13.6 / 26), T2 + 3.75, -35.8]);
    for (let k = 0; k <= 16; k++) bulbPts.push([-3.9 + k * (7.8 / 16), T2 + 6.6, -37.8]);
    // 제등: 인스턴스로 많이
    const lanGeo = new THREE.LatheGeometry([[0, -.16], [.1, -.15], [.15, -.08], [.16, 0], [.15, .08], [.1, .15], [0, .16]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const lanPts = { red: [], cream: [] };
    function garland(a, b, sag, n, phase = 0) {
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(.5); mid.y -= sag;
      const c = new THREE.QuadraticBezierCurve3(a, mid, b);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(24)), wireMat));
      for (let k = 1; k < n; k++) { const p = c.getPoint(k / n); p.y -= .2; ((k + phase) % 3 ? lanPts.red : lanPts.cream).push(p); }
    }
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // 계단 양옆을 따라 올라가는 화환
    for (const sd of [-1, 1]) {
      garland(V(sd * 2.7, 2.2, -4.5), V(sd * 2.7, T1 + 2.4, -15.5), 1.1, 16, sd > 0 ? 1 : 0);
      garland(V(sd * 2.2, T1 + 2.2, -26), V(sd * 2.2, T2 + 2.4, -33.5), .8, 10);
      garland(V(sd * 2.5, T1 + 6.3, -16.5), V(sd * 8, T1 + 2.2, -20), 1.0, 9, 2);   // 도리이에서 옆으로
      garland(V(sd * 2.5, T1 + 6.3, -16.5), V(sd * 6, 2.6, -8), 1.6, 12, 1);
      garland(V(sd * 2.7, 2.6, -4.5), V(sd * 7 * W + sd, 3.4, -5.5), .7, 9);   // 테라스 벽을 따라 옆으로
    }
    garland(V(-4.2, T1 + 2.6, -6.3), V(4.2, T1 + 2.6, -6.3), .9, 12, 1);   // 테라스 위를 가로지르는 줄
    for (const [key, col] of [['red', '#FF5A3A'], ['cream', '#FFE2B0']]) {
      const im = new THREE.InstancedMesh(lanGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .85, roughness: .8 }), lanPts[key].length);
      const mm = new THREE.Matrix4(); lanPts[key].forEach((v, k) => im.setMatrixAt(k, mm.makeTranslation(v.x, v.y, v.z))); scene.add(im);
    }
    const bIM = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFD9A0', toneMapped: false }), bulbPts.length);
    const bm = new THREE.Matrix4(); bulbPts.forEach(([x, y, z], k) => bIM.setMatrixAt(k, bm.makeTranslation(x, y, z))); scene.add(bIM);
    // 석등
    const latheBase = new THREE.LatheGeometry([[0, 0], [.34, 0], [.34, .12], [.2, .2], [.13, .3], [.13, .95], [.25, 1.05], [0, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const fire = new THREE.MeshBasicMaterial({ color: '#FFC27A', toneMapped: false });
    function ishidoro(x, y, z, s = 1) {
      const g = new THREE.Group(); g.add(new THREE.Mesh(latheBase, stepM));
      const bx = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .42, 6), stepM); bx.position.y = 1.28; g.add(bx);
      const wn = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .2, 6, 1, true), fire); wn.position.y = 1.3; g.add(wn);
      const rr = new THREE.Mesh(new THREE.ConeGeometry(.5, .36, 6), stepM); rr.position.y = 1.67; g.add(rr);
      const ha = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB067', transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); ha.position.y = 1.3; ha.scale.setScalar(1.6); g.add(ha);
      g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    }
    for (const sd of [-1, 1]) { ishidoro(sd * 3.2, 0, -4.8, 1.25); ishidoro(sd * 2.6, T1, -15.2); ishidoro(sd * 2.2, T2, -33.8); ishidoro(sd * 5.5, T1, -24); }
    // 광장 포장마차 (박공 텐트)
    const stripe = canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#F2EDE2' : '#C8301F'; g.fillRect(x, 0, 32, h); } });
    stripe.wrapS = THREE.RepeatWrapping; stripe.repeat.set(3, 1);
    const canvasM = new THREE.MeshStandardMaterial({ map: stripe, emissiveMap: stripe, emissive: new THREE.Color('#FFA060'), emissiveIntensity: .45, roughness: .9, side: THREE.DoubleSide });
    const inside = new THREE.MeshStandardMaterial({ color: '#2A160C', emissive: '#FF9A50', emissiveIntensity: 1.2, roughness: 1 });
    const STALLS = ['焼きそば', 'たこ焼き', '金魚すくい', 'りんご飴', 'かき氷', 'わたあめ'];
    let si = 0;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = sd * (5.2 * W + 1.4), z = 4 - i * 3.6, inward = -sd, g = new THREE.Group();
      const bk = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.2, 3), inside); bk.position.set(-inward * .6, 1.1, 0); g.add(bk);
      const ct = new THREE.Mesh(new THREE.BoxGeometry(.6, .95, 3), woodD); ct.position.set(inward * .45, .48, 0); g.add(ct);
      for (const s2 of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.95, .04, 3.3), canvasM); r.position.set(inward * (.075 + s2 * .42), 2.72, 0); r.rotation.z = s2 * -.42 * inward; g.add(r); }
      for (const dz of [-1.45, 1.45]) for (const dx of [-.6, .75]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.5, .07), woodD); po.position.set(inward * dx, 1.25, dz); g.add(po); }
      const t = textBanner(STALLS[si++ % STALLS.length], '#F4EBD8', '#B3261A', false, 2.6 / .42);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .42), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#FFE2B8'), emissiveIntensity: .5 })); sg.position.set(inward * .97, 2.35, 0); sg.rotation.y = inward * Math.PI / 2; g.add(sg);
      g.position.set(x, 0, z); scene.add(g);
      const pl = new THREE.PointLight('#FFA060', 5, 7, 1.7); pl.position.set(x + inward * 1.4, 2, z); scene.add(pl);
      const v = makePerson(si).g; v.position.set(x - inward * .1, 0, z); v.rotation.y = inward * Math.PI / 2; scene.add(v);
      for (let k = 0; k < 3; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFE8D0', transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); steams.push({ s: sp, x: x + inward * .4, z: z + (Math.random() - .5) * 2, t: Math.random() * 3, y0: 1.1 }); }
    }
    // 삼나무: 굵은 줄기 + 층층 잎
    const trunkM = new THREE.MeshStandardMaterial({ color: '#2A1C14', roughness: 1 }), leafM = new THREE.MeshStandardMaterial({ color: '#0E1A14', roughness: 1 });
    function cedar(x, y, z, h) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.25 * h / 14, .45 * h / 14, h, 10), trunkM); tr.position.set(x, y + h / 2, z); scene.add(tr);
      for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.4 - k * .45, h * .22, 9), leafM); c.position.set(x, y + h * (.55 + k * .13), z); scene.add(c); }
    }
    for (const sd of [-1, 1]) { cedar(sd * (7 * W + 2), 0, 3, 20); cedar(sd * (9 + Math.random() * 3), T1, -20, 22); cedar(sd * (12 + Math.random() * 4), T2, -44, 24); cedar(sd * (6 + Math.random() * 2), T2, -52, 22); }
    // 빛 내림 + 안개
    const rayTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(200,215,255,0)'); gr.addColorStop(.3, 'rgba(200,215,255,.5)'); gr.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const g2 = g.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g2; g.fillRect(0, 0, w, h); });
    for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + k * .6, 30), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); r.position.set(-6 + k * 2.6, 16, -42 + k * 2); r.rotation.z = -.42; scene.add(r); }
    const mistTex = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 10; i++) { const gr = g.createRadialGradient(30 + Math.random() * 196, 64, 0, 128, 64, 90); gr.addColorStop(0, 'rgba(170,180,210,.16)'); gr.addColorStop(1, 'rgba(170,180,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    for (let k = 0; k < 7; k++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: .55, depthWrite: false })); m.position.set((Math.random() - .5) * 20, (k % 3) * 3.5 + 2, -14 - k * 5); m.scale.set(16, 5, 1); scene.add(m); clouds.push({ s: m, v: .006 + Math.random() * .006 }); }
    // 꽃잎
    spawnPetals(portrait ? 150 : 220, 8, 12, 2);
    // 사람: 광장을 오가는 사람 + 계단을 오르는 사람
    for (let k = 0; k < (portrait ? 10 : 16); k++) {
      const { g } = makePerson(k, { fan: k % 4 === 0 });
      const dir = Math.random() < .5 ? 1 : -1;
      g.position.set((Math.random() - .5) * 6 * W, 0, -1 - Math.random() * 4.5); g.rotation.y = dir > 0 ? 0 : Math.PI;
      scene.add(g); crowd.push({ g, dir, v: .2 + Math.random() * .2, ph: Math.random() * 6.28, z0: -.5, z1: -5.5 });
    }
    for (let k = 0; k < 12; k++) {
      const n = 2 + Math.random() * 15 | 0, { g } = makePerson(k + 3);
      g.position.set((Math.random() - .5) * 3.2, (n + 1) * T1 / 18, -6 - .5 * (n + .5)); g.rotation.y = Math.PI; scene.add(g);
    }
    for (let k = 0; k < 6; k++) { const { g } = makePerson(k + 7); g.position.set((Math.random() - .5) * 4, T1, -17 - Math.random() * 8); g.rotation.y = Math.random() * 6; scene.add(g); }
    for (const [x, y, z] of [[0, 3, 0], [0, 4, -10], [0, T1 + 3, -20], [0, T2 + 3, -30]]) { const pl = new THREE.PointLight('#FF9A55', 9, 14, 1.6); pl.position.set(x, y, z); scene.add(pl); }
  }


  // 주변 놀거리: 紅葉ライトアップ — 밤 정원, 비치는 연못, 오층탑, 붉은 다리, 아래서 비춘 단풍, 떨어지는 잎
  if (SCENE === 'momiji') {
    SKY_EVERY = 1e9; DRIFT = 1.6; SCROLL_DEPTH = 8;
    const rm = rnd(17);
    scene.background = canvasTex(4, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#03040E'); gr.addColorStop(.5, '#0A1028'); gr.addColorStop(.78, '#1A1430'); gr.addColorStop(1, '#2A1622'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.FogExp2('#120E22', .024);
    scene.add(new THREE.HemisphereLight('#4A5490', '#2A120A', .45));
    const moonL = new THREE.DirectionalLight('#A8B8F0', .45); moonL.position.set(-12, 22, -20); scene.add(moonL);

    // 달 + 별
    const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFF1D0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    moonS.position.set(portrait ? -5.5 : -12, portrait ? 25 : 20, -62); moonS.scale.setScalar(portrait ? 8 : 10); moonS.material.opacity = .7; scene.add(moonS);
    const moonD = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40), new THREE.MeshBasicMaterial({ color: '#FFF4DC', fog: false, toneMapped: false }));
    moonD.position.copy(moonS.position).add(new THREE.Vector3(0, 0, .1)); scene.add(moonD);
    { const n = 700, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) sp.set([(rm() - .5) * 140, 8 + rm() * 50, -70 - rm() * 20], i * 3);
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#C8D4FF', size: .14, fog: false, transparent: true, opacity: .7 }))); }

    // 먼 산 능선
    for (const [z, hgt, col, sd] of [[-60, 9, '#120F2A', 3], [-48, 6, '#0C0A1E', 8]]) {
      const r2 = rnd(sd), sh = new THREE.Shape(); sh.moveTo(-70, -2);
      for (let x = -70; x <= 70; x += 2.5) sh.lineTo(x, hgt + Math.sin(x * .07 + sd) * hgt * .4 + r2() * hgt * .2);
      sh.lineTo(70, -2);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col })); m.position.z = z; scene.add(m);
    }

    // 땅: 이끼 + 자갈길
    const mossTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0E1610'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const v = 14 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v * .7 | 0},${v},${v * .6 | 0})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    mossTex.wrapS = mossTex.wrapT = THREE.RepeatWrapping; mossTex.repeat.set(8, 24);
    ground.material = new THREE.MeshStandardMaterial({ map: mossTex, roughness: .95 });

    // 연못 (실제 반사) — 카메라 앞에서 안쪽으로 길게
    const PZ = -13, PWd = 7.5 * W, PL = 13;
    const mirror = new Reflector(new THREE.CircleGeometry(1, 64), { textureWidth: Math.min(768, innerWidth * PR * .4) | 0, textureHeight: Math.min(768, innerHeight * PR * .4) | 0, color: '#4A4E66', clipBias: .003 });
    mirror.rotation.x = -Math.PI / 2; mirror.scale.set(PWd, PL, 1); mirror.position.set(0, .02, PZ); scene.add(mirror);
    const ripN = normalTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 36; g.strokeStyle = Math.random() < .5 ? '#5A5A5A' : '#A8A8A8'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.stroke(); } });
    ripN.wrapS = ripN.wrapT = THREE.RepeatWrapping;
    const film = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: '#0A0E1E', roughness: .4, metalness: .3, normalMap: ripN, transparent: true, opacity: .32 }));
    film.rotation.x = -Math.PI / 2; film.scale.set(PWd, PL, 1); film.position.set(0, .03, PZ); scene.add(film);
    tickers.push((t) => ripN.offset.set(Math.sin(t * .05) * .04, t * .01));
    // 물가 돌
    const rockM = new THREE.MeshStandardMaterial({ color: '#2E2C2A', roughness: .85, flatShading: true });
    const rockG = new THREE.DodecahedronGeometry(.5, 0);
    for (let k = 0; k < 46; k++) { const a = k / 46 * Math.PI * 2, rr = 1.02 + rm() * .06;
      const r3 = new THREE.Mesh(rockG, rockM); r3.position.set(Math.cos(a) * PWd * rr, .1, PZ + Math.sin(a) * PL * rr);
      r3.scale.set(.35 + rm() * .5, .25 + rm() * .3, .35 + rm() * .5); r3.rotation.set(rm() * 3, rm() * 3, 0); scene.add(r3); }

    // 붉은 아치 다리 (太鼓橋)
    const vermil = new THREE.MeshStandardMaterial({ color: '#D2391F', emissive: '#6A1406', emissiveIntensity: .55, roughness: .45 });
    const deckM = new THREE.MeshStandardMaterial({ color: '#4A2E1C', roughness: .7 });
    { const BZ = -9, span = PWd * 1.15, rise = 1.5, bridge = new THREE.Group(); bridge.position.z = BZ;
      const arc = (x) => rise * (1 - (x / span) ** 2);
      for (let k = 0; k <= 34; k++) { const x = -span + k * (span * 2 / 34), y = arc(x), nx = x + .1, sl = Math.atan2(arc(nx) - y, .1);
        const pl = new THREE.Mesh(new THREE.BoxGeometry(span * 2 / 34 + .04, .12, 2), deckM); pl.position.set(x, y + .1, 0); pl.rotation.z = sl; bridge.add(pl); }
      for (const sd of [-1, 1]) {
        const pts = []; for (let k = 0; k <= 30; k++) { const x = -span + k * (span * 2 / 30); pts.push(new THREE.Vector3(x, arc(x) + .95, sd * .95)); }
        bridge.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .06, 8), vermil));
        for (let k = 0; k <= 10; k++) { const x = -span + k * (span * 2 / 10); const po = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .95, 8), vermil); po.position.set(x, arc(x) + .55, sd * .95); bridge.add(po);
          if (k % 5 === 0) { const gb = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#C9A24A', metalness: .8, roughness: .3 })); gb.position.set(x, arc(x) + 1.1, sd * .95); bridge.add(gb); } }
        for (const x of [-span * .7, 0, span * .7]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, arc(x) + .2, 8), vermil); leg.position.set(x, (arc(x) + .2) / 2 - .1, sd * .8); bridge.add(leg); }
      }
      scene.add(bridge);
      for (let k = 0; k < 6; k++) { const x = -span * .8 + k * span * .32; const l = makeLantern(PAPERS[k % PAPERS.length], .32); l.position.set(x, arc(x) + 1.55, 1.05); bridge.add(l); street.push(l); }
      const bl = new THREE.PointLight('#FF8A50', 10, 12, 1.6); bl.position.set(0, 2.6, BZ + 1.5); scene.add(bl);
    }

    // 오층탑 (五重塔) — 뒤 언덕
    const roofM = new THREE.MeshStandardMaterial({ color: '#23262E', roughness: .55, metalness: .3 });
    const woodR = new THREE.MeshStandardMaterial({ color: '#8A2E18', roughness: .6, emissive: '#5A1406', emissiveIntensity: .7 });
    const shojiT = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#FFCB86'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4A2A14'; g.lineWidth = 2; for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    const shojiM = new THREE.MeshBasicMaterial({ map: shojiT, toneMapped: false });
    function eave(w, y, parent) {
      const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.quadraticCurveTo(-w * .5, -.05, 0, .55); sh.quadraticCurveTo(w * .5, -.05, w, 0); sh.lineTo(w * .96, -.28); sh.quadraticCurveTo(w * .4, -.18, 0, .25); sh.quadraticCurveTo(-w * .4, -.18, -w * .96, -.28); sh.lineTo(-w, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: w * 2, bevelEnabled: false }); geo.translate(0, 0, -w);
      for (const ry of [0, Math.PI / 2]) { const m = new THREE.Mesh(geo, roofM); m.position.y = y; m.rotation.y = ry; parent.add(m); }
    }
    const pagoda = new THREE.Group(); pagoda.position.set((portrait ? 2.4 : 5.5), 1.2, -29); pagoda.scale.setScalar(1.35); scene.add(pagoda);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 4.6), new THREE.MeshStandardMaterial({ color: '#3A3634', roughness: .9 })); base.position.y = -.6; pagoda.add(base);
    let yy = 0;
    for (let k = 0; k < 5; k++) {
      const bw = 3 - k * .38, bh = 1.55 - k * .08;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), woodR); body.position.y = yy + bh / 2; pagoda.add(body);
      for (const ry of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(bw * .55, bh * .55), shojiM); win.position.set(Math.sin(ry) * (bw / 2 + .01), yy + bh / 2, Math.cos(ry) * (bw / 2 + .01)); win.rotation.y = ry; pagoda.add(win); }
      eave(bw * .5 + 1.1 - k * .08, yy + bh + .05, pagoda);
      yy += bh + .5;
    }
    const sorin = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 3.2, 8), new THREE.MeshStandardMaterial({ color: '#C9A24A', metalness: .85, roughness: .3, emissive: '#3A2A08', emissiveIntensity: .4 })); sorin.position.y = yy + 1.4; pagoda.add(sorin);
    for (let k = 0; k < 9; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.2 - k * .008, .035, 6, 16), sorin.material); ring.rotation.x = Math.PI / 2; ring.position.y = yy + .4 + k * .26; pagoda.add(ring); }
    for (const [dx, dz] of [[-2.6, 2.6], [2.6, 2.6]]) { const up = new THREE.SpotLight('#FFB070', 140, 30, .55, .6, 1.3); up.position.set(pagoda.position.x + dx, .4, pagoda.position.z + dz + 2); up.target.position.set(pagoda.position.x, 6, pagoda.position.z); scene.add(up, up.target); }
    const ph = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FF9A50', transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
    ph.position.set(pagoda.position.x, 5.5, pagoda.position.z + 1); ph.scale.set(9, 13, 1); scene.add(ph);

    // 단풍나무: 줄기 + 인스턴스 잎뭉치 (빨강·주황·노랑), 아래서 라이트업
    const barkM = new THREE.MeshStandardMaterial({ color: '#2A1A12', roughness: 1 });
    const LEAF_COLS = ['#E8361E', '#F2541E', '#D2241A', '#FF7A1E', '#F5A623', '#B81E2A'].map(c => new THREE.Color(c));
    const clumpGeo = new THREE.IcosahedronGeometry(1, 1);
    const clumpM = new THREE.MeshStandardMaterial({ roughness: .9, emissive: '#3A0804', emissiveIntensity: .5, flatShading: true });
    const clumps = [];
    const trees = [];
    function maple(x, z, s) {
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      const h = 2.6 * s;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12 * s, .22 * s, h, 8), barkM); tr.position.y = h / 2; tr.rotation.z = (rm() - .5) * .2; g.add(tr);
      for (let b = 0; b < 4; b++) { const a = b / 4 * 6.28 + rm(); const p0 = new THREE.Vector3(0, h * .8, 0), p1 = new THREE.Vector3(Math.cos(a) * 1.4 * s, h * 1.15, Math.sin(a) * 1.4 * s);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, new THREE.Vector3(p1.x * .4, h * 1.05, p1.z * .4), p1), 6, .06 * s, 5), barkM)); }
      const n = 16 + (s * 6 | 0);
      for (let k = 0; k < n; k++) { const a = rm() * 6.28, rr = rm() * 1.7 * s, y = h * (1.05 + rm() * .45) - rr * .25;
        clumps.push({ p: new THREE.Vector3(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr * .8), s: (.38 + rm() * .35) * s, c: LEAF_COLS[k % LEAF_COLS.length], r: rm() * 6 }); }
      if (s >= 1.2) { const up = new THREE.PointLight('#FF7A3A', 9 * s, 8 * s, 1.5); up.position.set(x, .5, z + .8); scene.add(up); }   // 조명 수 아끼기: 큰 나무만
      trees.push(g);
    }
    const sideX = (portrait ? 4.6 : 7.2) * (W < 1 ? 1 : 1);
    for (const sd of [-1, 1]) {
      maple(sd * (sideX + .6), -2.5, 1.25); maple(sd * (sideX + 2.6), -8, 1.1); maple(sd * (sideX - .3), -15.5, 1.3);
      maple(sd * (sideX + 3.5), -21, 1.15); maple(sd * (sideX + 1), -26, 1.0);
    }
    for (const sd of [-1, 1]) maple(sd * (portrait ? 3.3 : 5.2), 3.5, .95);   // 화면 가장자리를 감싸는 앞쪽 가지
    maple(portrait ? -3.4 : -5.5, -34, 1.35); maple(portrait ? 1 : 1.5, -38, 1.1); maple(portrait ? 6.5 : 11, -30, 1.2);
    const leafIM = new THREE.InstancedMesh(clumpGeo, clumpM, clumps.length);
    const lo = new THREE.Object3D();
    clumps.forEach((c, k) => { lo.position.copy(c.p); lo.scale.set(c.s, c.s * .78, c.s); lo.rotation.set(c.r, c.r * .7, 0); lo.updateMatrix(); leafIM.setMatrixAt(k, lo.matrix); leafIM.setColorAt(k, c.c); });
    leafIM.instanceColor.needsUpdate = true; scene.add(leafIM);
    // 잎 카드: 뭉치 표면에 단풍잎을 촘촘히 붙여 실루엣을 잎사귀로 (인스턴스 1장 드로우)
    const leafCardTex = canvasTex(64, 64, (g) => {
      g.translate(32, 34); g.fillStyle = '#FFFFFF'; g.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .62, r = k === 2 ? 28 : (k % 2 ? 22 : 18);
        g.lineTo(Math.cos(a - .2) * r * .42, Math.sin(a - .2) * r * .42); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + .2) * r * .42, Math.sin(a + .2) * r * .42); }
      g.lineTo(0, 8); g.closePath(); g.fill();
    });
    const PER = portrait ? 34 : 48, cardIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(.34, .34),
      new THREE.MeshStandardMaterial({ map: leafCardTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .8, emissive: '#FF4A1A', emissiveIntensity: .35, emissiveMap: leafCardTex }), clumps.length * PER);
    const tmpC = new THREE.Color(), dir = new THREE.Vector3();
    let ci = 0;
    for (const c of clumps) for (let k = 0; k < PER; k++) {
      dir.set(rm() - .5, (rm() - .35), rm() - .5).normalize();
      lo.position.copy(c.p).addScaledVector(dir, c.s * (.85 + rm() * .35));
      lo.rotation.set(rm() * 6.28, rm() * 6.28, rm() * 6.28); const sc = .7 + rm() * .7; lo.scale.set(sc, sc, sc); lo.updateMatrix();
      cardIM.setMatrixAt(ci, lo.matrix); tmpC.copy(LEAF_COLS[(rm() * LEAF_COLS.length) | 0]).offsetHSL(0, 0, (rm() - .5) * .12); cardIM.setColorAt(ci, tmpC); ci++;
    }
    cardIM.instanceColor.needsUpdate = true; scene.add(cardIM);
    tickers.push((t) => { for (let k = 0; k < trees.length; k++) trees[k].rotation.z = Math.sin(t * .6 + k) * .006; });

    // 석등 (돌길을 따라)
    const stoneM = new THREE.MeshStandardMaterial({ color: '#5E5A55', roughness: .75, metalness: .1 });
    const latheBase = new THREE.LatheGeometry([[0, 0], [.34, 0], [.34, .12], [.2, .2], [.13, .3], [.13, .95], [.25, 1.05], [0, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const fire = new THREE.MeshBasicMaterial({ color: '#FFC27A', toneMapped: false });
    function toro(x, z, s = 1) {
      const g = new THREE.Group(); g.add(new THREE.Mesh(latheBase, stoneM));
      const bx = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .42, 6), stoneM); bx.position.y = 1.28; g.add(bx);
      const wn = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .2, 6, 1, true), fire); wn.position.y = 1.3; g.add(wn);
      const rr = new THREE.Mesh(new THREE.ConeGeometry(.5, .36, 6), stoneM); rr.position.y = 1.67; g.add(rr);
      const ha = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#FFB067', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); ha.position.y = 1.3; ha.scale.setScalar(1.7); g.add(ha);
      g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    }
    for (const sd of [-1, 1]) { toro(sd * (PWd + 1), -4, 1.2); toro(sd * (PWd + .6), -12, 1.1); toro(sd * (PWd * .8), -21, 1); }
    // 징검돌
    const stepG = new THREE.CylinderGeometry(.42, .46, .14, 10);
    const stepM2 = new THREE.MeshStandardMaterial({ color: '#2C2A28', roughness: .6, metalness: .15 });
    for (let k = 0; k < 6; k++) { const x = (k % 2 ? .45 : -.45) + (rm() - .5) * .3, z = 5.5 - k * 1.15;
      const st = new THREE.Mesh(stepG, stepM2); st.position.set(x, .05, z); st.scale.set(.9 + rm() * .25, 1, .75 + rm() * .2); st.rotation.y = rm() * 3; scene.add(st); }

    // 찻집 (오른쪽 앞, 장지문 불빛)
    { const tea = new THREE.Group(); tea.position.set(-(portrait ? 5.4 : 9), 0, -18); tea.rotation.y = .5; scene.add(tea);
      const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 3), new THREE.MeshStandardMaterial({ color: '#3A2416', roughness: .8 })); body.position.y = 1.1; tea.add(body);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), shojiM); fr.position.set(0, 1.05, 1.51); tea.add(fr);
      eave(2.8, 2.25, tea);
      const tl = new THREE.PointLight('#FFB070', 8, 9, 1.6); tl.position.set(0, 1.2, 2.4); tea.add(tl); }

    // 떨어지는 단풍잎
    const mapleTex = canvasTex(64, 64, (g) => {
      g.translate(32, 34); g.fillStyle = '#FF5A2A'; g.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .62, r = k === 2 ? 28 : (k % 2 ? 22 : 18);
        g.lineTo(Math.cos(a - .18) * r * .45, Math.sin(a - .18) * r * .45); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + .18) * r * .45, Math.sin(a + .18) * r * .45); }
      g.lineTo(0, 8); g.closePath(); g.fill(); g.strokeStyle = '#7A1A08'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 26); g.lineTo(0, -8); g.stroke();
    });
    spawnPetals(portrait ? 130 : 200, 9, 16, 4, .2, '#FF6A3A', mapleTex, '#A8301A');

    // 수면 위 안개 + 빛
    const mistT = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 10; i++) { const gr = g.createRadialGradient(30 + Math.random() * 196, 64, 0, 128, 64, 90); gr.addColorStop(0, 'rgba(140,120,180,.12)'); gr.addColorStop(1, 'rgba(140,120,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    for (let k = 0; k < 8; k++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistT, transparent: true, opacity: .22, depthWrite: false })); m.position.set((rm() - .5) * 14, .3 + (k % 3) * .3, -6 - k * 3.2); m.scale.set(12, 1.6, 1); scene.add(m); }
    for (const [x, y, z, c, i] of [[0, 3, 2, '#FF9A55', 6], [0, 4, -18, '#FF7A40', 9]]) { const pl = new THREE.PointLight(c, i, 16, 1.6); pl.position.set(x, y, z); scene.add(pl); }
  }

  // 근처 축제: 봉오도리 야구라(櫓) — 북 치는 망루, 방사형 등불 줄, 원을 그리며 춤추는 사람들
  if (SCENE === 'yagura') {
    SKY_EVERY = 2400; DRIFT = 0; SCROLL_DEPTH = 6;
    const YZ = -8;
    const wood = new THREE.MeshStandardMaterial({ color: '#6A4426', roughness: .7 });
    const kohaku = canvasTex(512, 64, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#F4EFE6' : '#D2301F'; g.fillRect(x, 0, 32, h); } });
    kohaku.wrapS = THREE.RepeatWrapping; kohaku.repeat.set(2, 1);
    const curtain = new THREE.MeshStandardMaterial({ map: kohaku, emissiveMap: kohaku, emissive: new THREE.Color('#FFB080'), emissiveIntensity: .35, roughness: .9, side: THREE.DoubleSide });
    const yg = new THREE.Group(); yg.position.set(0, 0, YZ); scene.add(yg);
    const S = 1.5;
    for (const [px, pz] of [[-S, -S], [S, -S], [-S, S], [S, S]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 4.6, .18), wood); post.position.set(px, 2.3, pz); yg.add(post); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + .5, .16, S * 2 + .5), wood); deck.position.y = 2.6; yg.add(deck);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(S * 1.42, S * 1.42, 2.5, 4, 1, true), curtain); skirt.rotation.y = Math.PI / 4; skirt.position.y = 1.3; yg.add(skirt);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(S * 1.55, S * 1.55, .55, 4, 1, true), curtain); rail.rotation.y = Math.PI / 4; rail.position.y = 3.0; yg.add(rail);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(S * 1.9, 1.0, 4), new THREE.MeshStandardMaterial({ color: '#2A1A12', roughness: .7 })); roof.rotation.y = Math.PI / 4; roof.position.y = 5.1; yg.add(roof);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .8, 24), [new THREE.MeshStandardMaterial({ color: '#7A2A18', roughness: .5 }), new THREE.MeshStandardMaterial({ color: '#EADBC0', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#EADBC0', roughness: .8 })]);
    drum.rotation.z = Math.PI / 2; drum.position.y = 3.35; yg.add(drum);
    // 북 치는 사람
    const drummer = new THREE.Group();
    const dm = SIL;
    const db = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .6, 4, 10), dm); db.position.y = .55; drummer.add(db);
    const dh = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), new THREE.MeshStandardMaterial({ color: '#0E0B10' })); dh.position.y = 1.15; drummer.add(dh);
    const hb = new THREE.Mesh(new THREE.TorusGeometry(.16, .03, 6, 16), new THREE.MeshBasicMaterial({ color: '#F2EDE2' })); hb.rotation.x = Math.PI / 2; hb.position.y = 1.2; drummer.add(hb);
    const armR = new THREE.Group(); armR.position.set(.25, .85, 0); const stick = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 6), wood); stick.position.y = .35; armR.add(stick); drummer.add(armR);
    drummer.position.set(-.95, 2.68, 0); drummer.rotation.y = Math.PI / 2; yg.add(drummer);
    swayers.push({ o: armR, ph: 0, amp: .9, axis: 'z' });
    // 망루 둘레 등불
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, l = makeLantern(PAPERS[k % PAPERS.length], .38);
      l.position.set(Math.cos(a) * S * 1.6, 2.35, YZ + Math.sin(a) * S * 1.6); scene.add(l); street.push(l);
    }
    // 꼭대기에서 방사형으로 뻗는 등불 줄
    const top = new THREE.Vector3(0, 6.6, YZ);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 8), wood); pole.position.set(0, 5.8, YZ); scene.add(pole);
    const N = 14;
    for (let k = 0; k < N; k++) {
      const a = k / N * Math.PI * 2 + .1, R = 15;
      const end = new THREE.Vector3(Math.cos(a) * R * W, 3.4, YZ + Math.sin(a) * R);
      const mid = top.clone().lerp(end, .5); mid.y -= 1.6;
      const curve = new THREE.QuadraticBezierCurve3(top, mid, end);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), wireMat));
      for (let j = 1; j <= 6; j++) {
        const l = makeLantern(PAPERS[(k + j) % PAPERS.length], .3);
        l.position.copy(curve.getPoint(j / 7)).add(new THREE.Vector3(0, -.32, 0)); scene.add(l); street.push(l);
      }
      const pst = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.4, 6), wood); pst.position.set(end.x, 1.7, end.z); scene.add(pst);
    }
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: GLOW, color: '#FF9A50', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, .03, YZ); scene.add(plaza);
    for (const z of [YZ + 4, YZ - 4]) { const pl = new THREE.PointLight('#FFB070', 9, 14, 1.6); pl.position.set(0, 3.2, z); scene.add(pl); }
    // 춤추는 원 (두 겹, 반대 방향)
    const YUK = ['#24305E', '#5B1E2D', '#2E4A3A', '#4A2E5E', '#E8E0D0', '#2B3F6B', '#7A2E2A'];
    for (const [R, n, wv] of [[4.2, 18, .16], [6.2, 24, -.12]]) for (let k = 0; k < n; k++) {
      const { g, arms } = makePerson(k + R * 10 | 0, { fan: k % 3 === 0 });
      scene.add(g);
      dancers.push({ g, arms, R, a: k / n * Math.PI * 2, w: wv, ph: k * .7 });
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
    const doorGlow = new THREE.MeshBasicMaterial({ color: '#FFB067' });
    const latticePos = [];
    ground.material = new THREE.MeshStandardMaterial({ color: '#15131C', roughness: .22, metalness: .55 });
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
        const face = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#FFE2B8'), emissiveIntensity: .55, roughness: .6 });
        const board = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.5, .1), [wood, wood, wood, wood, face, face]);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(.68, 1.58, .07), wood); frame.position.set(wx + inward * .55, 3.9, z + 1.2); scene.add(frame);
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
      const door = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.75, 1.5), doorGlow);
      door.position.set(wx + inward * .01, .9, z); scene.add(door);
      for (let k = 0; k < 7; k++) latticePos.push(new THREE.Vector3(wx + inward * .09, .9, z - .66 + k * .22));
      for (const dy of [0, 1.8]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(.14, .1, 1.7), wood); beam.position.set(wx + inward * .09, dy + .02, z); scene.add(beam); }
      // 바닥에 비친 가게 불빛
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshBasicMaterial({ map: GLOW, color: '#FFB070', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(wx + inward * .9, .02, z); scene.add(pool);
      // 판자벽 줄
      for (let k = 1; k < 6; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(.03, .025, 3.5), wood); pl.position.set(wx + inward * .005, 2.0 + k * .38, z); if (pl.position.y < h - .4) scene.add(pl); }
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
    for (let k = 0; k < 6; k++) { const pl = new THREE.PointLight('#FFA060', 7, 9, 1.6); pl.position.set((k % 2 ? 1 : -1) * 1.3 * W, 2.1, 1 - k * 5.4); scene.add(pl); }
    scene.add(new THREE.HemisphereLight('#4A4060', '#1A0E08', .35));
    // 젖은 바닥: 진짜 반사 + 물웅덩이 마스크
    const mirror = new Reflector(new THREE.PlaneGeometry(6 * W + 2, 70), { textureWidth: Math.min(1024, innerWidth * PR * .6) | 0, textureHeight: Math.min(1024, innerHeight * PR * .6) | 0, color: '#6a6874', clipBias: .003 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, .004, -25); scene.add(mirror); ground.visible = false;
    const wetTex = canvasTex(256, 1024, (g, w, h) => {
      g.fillStyle = 'rgba(14,12,20,.86)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 90; i++) { const x = w * (.2 + Math.random() * .6), y = Math.random() * h, rx = 20 + Math.random() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, rx * 2.2, 0, 0, 6.29); g.fill(); }
      g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(0,0,0,.35)';
      for (let i = 0; i < 1600; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    });
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(6 * W + 2, 70), new THREE.MeshBasicMaterial({ map: wetTex, transparent: true, depthWrite: false }));
    wet.rotation.x = -Math.PI / 2; wet.position.set(0, .008, -25); scene.add(wet);
    // 셔터 내린 가게, 벽 실외기
    const shutTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#5A5866'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 2); } });
    const shutM = new THREE.MeshStandardMaterial({ map: shutTex, roughness: .6, metalness: .5 });
    const acM = new THREE.MeshStandardMaterial({ color: '#C9C6BE', roughness: .6 });
    const fanTex = canvasTex(64, 64, (g) => { g.fillStyle = '#C9C6BE'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2A2A30'; g.beginPath(); g.arc(32, 32, 24, 0, 6.29); g.fill(); g.strokeStyle = '#8A8A90'; for (let a = 0; a < 6.28; a += .5) { g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); g.stroke(); } });
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const wx = side * 2.5 * W, inward = -side, z = 2 - i * 3.6;
      if ((i + (side > 0 ? 1 : 0)) % 3 === 2) { const sh = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.9, 1.2), shutM); sh.position.set(wx + inward * .03, .95, z + 1.25); scene.add(sh); }
      if ((i * 7 + side) % 4 === 1) { const ac = new THREE.Mesh(new THREE.BoxGeometry(.32, .5, .7), [acM, acM, acM, acM, acM, acM]); ac.material = ac.material.slice(); ac.material[inward > 0 ? 0 : 1] = new THREE.MeshStandardMaterial({ map: fanTex, roughness: .6 }); ac.position.set(wx + inward * .17, .25, z - 1.35); scene.add(ac); }
    }
    // 네온 세로 간판 (분홍·하늘)
    const NEON = [['スナック', '#FF6FB5'], ['カラオケ', '#7FD8FF'], ['喫茶', '#FF9AD2'], ['バー', '#9FE8FF'], ['焼肉', '#FF7AA8']];
    NEON.forEach(([txt, col], k) => {
      const side = k % 2 ? 1 : -1, wx = side * 2.5 * W, inward = -side, z = -1.2 - k * 5.3;
      const t = textBanner(txt, '#120A16', col, true, .42 / 1.6);
      const face = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
      const box = new THREE.Mesh(new THREE.BoxGeometry(.55, 2.0, .12), [face, face, face, face, face, face]);
      box.position.set(wx + inward * .42, 4.9 + (k % 3) * .3, z); box.rotation.y = inward * Math.PI / 2; scene.add(box);
      const glow = new THREE.PointLight(col, 3, 5, 2); glow.position.set(wx + inward * .8, 4.9, z); scene.add(glow);
    });
    spawnPetals(portrait ? 220 : 320, 7, 5 * W, 6);
    // 격자문(格子) 살
    const lat = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, 1.75, .035), wood, latticePos.length);
    const m4a = new THREE.Matrix4(); latticePos.forEach((v, k) => lat.setMatrixAt(k, m4a.makeTranslation(v.x, v.y, v.z))); scene.add(lat);
    // 자판기
    for (const [vx, vz] of [[-1, -4.6], [1, -15.4]]) {
      const side = vx, x = side * 2.5 * W - side * .45;
      const vm = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(.75, 1.85, .7), new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: .4 }));
      body.position.y = .93; vm.add(body);
      const panelTex = canvasTex(128, 256, (g) => {
        g.fillStyle = '#EAF6FF'; g.fillRect(0, 0, 128, 256);
        const C = ['#D9402B', '#2E6FD8', '#F2C14E', '#3BAA5C', '#8A3FD1', '#FF8A3C'];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.fillStyle = C[(r * 5 + c) % 6]; g.fillRect(10 + c * 22, 18 + r * 46, 14, 30); g.fillStyle = '#fff'; g.fillRect(12 + c * 22, 22 + r * 46, 10, 6); }
        g.fillStyle = '#1A1A1A'; g.fillRect(0, 200, 128, 56);
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.25), new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false }));
      panel.position.set(0, 1.12, .351); vm.add(panel);
      const vlight = new THREE.PointLight('#CFE8FF', 3, 4, 2); vlight.position.set(0, 1.2, .9); vm.add(vlight);
      vm.position.set(x, 0, vz); vm.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(vm);
    }
    // 맥주 상자 더미, 입간판
    const crateMat = [new THREE.MeshStandardMaterial({ color: '#B8261C', roughness: .6 }), new THREE.MeshStandardMaterial({ color: '#D9A21E', roughness: .6 })];
    for (const [cx, cz] of [[-1, -8.6], [1, -1.2], [-1, -19]]) {
      const x = cx * 2.5 * W - cx * .4;
      for (let k = 0; k < 5; k++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .32), crateMat[k % 2]);
        c.position.set(x + (k % 2) * cx * -.05, .14 + Math.floor(k / 2) * .29, cz + (k % 2 ? .35 : 0)); c.rotation.y = (Math.random() - .5) * .3; scene.add(c);
      }
    }
    const menuTex = textBanner('本日のおすすめ', '#1E2A22', '#F2EDE2', true, .5 / .9);
    for (const [mx, mz] of [[1, -6], [-1, -12.5]]) {
      const x = mx * 2.5 * W - mx * .7;
      const mb = new THREE.Group();
      for (const s2 of [-1, 1]) { const b2 = new THREE.Mesh(new THREE.BoxGeometry(.55, .95, .04), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: menuTex, roughness: .8 }), wood]); b2.position.set(0, .47, s2 * .14); b2.rotation.x = -s2 * .16; mb.add(b2); }
      mb.position.set(x, 0, mz); mb.rotation.y = mx < 0 ? .5 : -.5; scene.add(mb);
    }
    // 라멘집 김
    const stTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, 'rgba(255,240,225,.5)'); gr.addColorStop(1, 'rgba(255,240,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    for (let k = 0; k < 8; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: stTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); steams.push({ s: sp, x: (k % 2 ? 1 : -1) * 2.5 * W * .7, z: -3.6 * (1 + (k >> 1) * 2) + 1, t: Math.random() * 3, y0: 2.4 }); }
    // 지나가는 사람들
    const COATS = ['#2A2F45', '#3A2A2A', '#24332E', '#3B3346'];
    for (let k = 0; k < (portrait ? 7 : 10); k++) {
      const { g } = makePerson(k, { umbrella: k % 3 === 0 });
      const dir = Math.random() < .5 ? 1 : -1;
      g.position.set((Math.random() - .5) * 1.8 * W, 0, 3 - Math.random() * 30); g.rotation.y = dir > 0 ? 0 : Math.PI;
      scene.add(g); crowd.push({ g, dir, v: .3 + Math.random() * .3, ph: Math.random() * 6.28 });
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
  // clouds: 위에서 선언
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
    // 가운데서 터진 불꽃이 흩어지지 않고 바로 글자 획 자리로 피어남 (가운데 획부터 바깥 획 순서로)
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), tgt = new Float32Array(n * 3), del = new Float32Array(n);
    let maxD = .001;
    for (let i = 0; i < n; i++) maxD = Math.max(maxD, Math.hypot(pts[i][0], pts[i][1]));
    for (let i = 0; i < n; i++) {
      pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
      const R = camRight, U = camUp, x = pts[i][0], y = pts[i][1], d = Math.hypot(x, y) || .001;
      tgt[i * 3] = origin.x + R.x * x + U.x * y; tgt[i * 3 + 1] = origin.y + R.y * x + U.y * y; tgt[i * 3 + 2] = origin.z + R.z * x + U.z * y;
      // 바깥으로 살짝 부풀었다 자리 잡는 곡선 (터지는 느낌은 남기고 되돌아오는 느낌은 없앰)
      const bl = .25 + Math.random() * .35, bx = x / d * bl, by = y / d * bl;
      vel[i * 3] = R.x * bx + U.x * by; vel[i * 3 + 1] = R.y * bx + U.y * by; vel[i * 3 + 2] = R.z * bx + U.z * by + (Math.random() - .5) * .3;
      del[i] = d / maxD * .3 + Math.random() * .07;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: GLOW, color, size: .32, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const ptsObj = new THREE.Points(geo, mat); scene.add(ptsObj);
    const light = new THREE.PointLight(color, 4, 30, 1.5); light.position.copy(origin); scene.add(light);
    shells.push({ pts: ptsObj, vel, target: tgt, del, origin: origin.clone(), hold: hold + .3, life: 1, light, age: 0 });
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
  let lastW = 0, lastH = 0, alive = true, raf = 0;
  function resize() {
    if (!alive) return;   // 쉬고 있는 무대는 돌아올 때 맞춤 (공유 화면을 지우지 않게)
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const prChanged = PR !== PERF.pr;
    PR = PERF.pr;
    if (r.width === lastW && r.height === lastH && renderer.getPixelRatio() === PR && !prChanged) return;
    lastW = r.width; lastH = r.height;
    renderer.setPixelRatio(PR);
    renderer.setSize(r.width, r.height, false);
    if (prChanged) composer.setPixelRatio(PR);
    composer.setSize(r.width, r.height);
    bloom.resolution.set(r.width / 2, r.height / 2);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < .7 ? 62 : 50;
    camera.updateProjectionMatrix();
    try { composer.render(); } catch { /* noop */ }   // 크기를 바꾸면 화면이 지워지므로 바로 다시 그림 (깜빡임 방지)
  }
  resize(); if (!opts.shared) addEventListener('resize', resize);
  // 셰이더 미리 준비 → 첫 프레임 끊김 줄이기.
  // compileAsync: GPU가 셰이더를 병렬로 컴파일하는 동안 메인 스레드는 놀지 않음. 다 되면 그때부터 그림 (중간에 멈칫 없음)
  let compiled = false;
  const compileP = (async () => {
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch { /* noop */ }
    compiled = true;
  })();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  let shown = false;
  let t = 0, idleCam = true, scrollTarget = 0, scrollEase = 0;
  const camOff = { x: 0, y: 0, z: 0 };   // 페이지 들어오고 나갈 때 카메라가 앞으로 걸어가는 연출
  const tmp = new THREE.Vector3();
  function frame() {
    if (!compiled) { clock.getDelta(); if (alive) raf = requestAnimationFrame(frame); return; }   // 셰이더 준비 전엔 기다림
    const raw = clock.getDelta(), dt = Math.min(raw, .05); t += dt;
    if (adaptPR(raw)) resize();

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
        const tg = sh.target, a = sh.age, o = sh.origin;
        if (a >= sh.hold && !sh.fall) { sh.fall = true; for (let i = 0; i < v.length; i += 3) { v[i] = (Math.random() - .5) * .01; v[i + 1] = 0; v[i + 2] = 0; } }
        for (let i = 0, j = 0; i < v.length; i += 3, j++) {
          if (!sh.fall) {
            const u = Math.min(1, Math.max(0, (a - sh.del[j]) / .8)), e = 1 - (1 - u) ** 3, b = Math.sin(Math.PI * u) * (1 - u * .4);
            p[i] = o.x + (tg[i] - o.x) * e + v[i] * b;
            p[i + 1] = o.y + (tg[i + 1] - o.y) * e + v[i + 1] * b;
            p[i + 2] = o.z + (tg[i + 2] - o.z) * e + v[i + 2] * b;
          } else { v[i + 1] -= .0016; p[i] += v[i]; p[i + 1] += v[i + 1]; }
        }
        sh.life = a < sh.hold ? 1 : Math.max(0, 1 - (a - sh.hold) / 1.6);
        sh.pts.material.opacity = sh.life * (a > 1.2 && a < sh.hold ? (.8 + .2 * Math.sin(a * 24)) : 1);
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
      const street1 = SCENE === 'street' || SCENE === 'enmusubi';
      camera.position.x = CAM_HOME.x + Math.sin(t * .25) * .35 * sway;
      camera.position.y = CAM_HOME.y + Math.sin(t * .4) * .08 * sway + (street1 ? scrollEase * .6 : 0);
      camera.position.z = CAM_HOME.z - dz;
      look.z = LOOK_HOME.z - dz;
      look.y = LOOK_HOME.y - (street1 ? scrollEase * 1.2 : 0);
      camera.position.x += camOff.x; camera.position.y += camOff.y; camera.position.z += camOff.z; look.z += camOff.z * .6;
    }
    for (const c of crowd) {
      if (!calm) c.g.position.z += c.dir * c.v * dt;
      const z0 = c.z0 ?? 4, z1 = c.z1 ?? -32;
      if (c.g.position.z > z0) c.g.position.z = z1; else if (c.g.position.z < z1) c.g.position.z = z0;
      c.g.position.y = Math.abs(Math.sin(t * 4 * c.v + c.ph)) * .035;
      c.g.rotation.z = Math.sin(t * 4 * c.v + c.ph) * .03;
    }
    for (const st of steams) {
      st.t += dt; const u = (st.t % 2.6) / 2.6;
      st.s.position.set(st.x + Math.sin(st.t * 1.3) * .08, (st.y0 || 1.2) + u * 1.1, st.z);
      st.s.scale.setScalar(.35 + u * .7); st.s.material.opacity = Math.sin(u * Math.PI) * .45;
    }
    for (const d of dancers) {
      if (!calm) d.a += d.w * dt;
      const x = Math.cos(d.a) * d.R * W, z = -8 + Math.sin(d.a) * d.R;
      d.g.position.set(x, Math.abs(Math.sin(t * 2.2 + d.ph)) * .05, z);
      d.g.rotation.y = -d.a + (d.w > 0 ? 0 : Math.PI);
      const sw = Math.sin(t * 2.2 + d.ph);
      d.arms[0].rotation.z = -2.3 - sw * .45; d.arms[1].rotation.z = 2.3 - sw * .45;
    }
    if (petalsIM) {
      for (let k = 0; k < petals.length; k++) {
        const p = petals[k];
        p.y -= p.v * dt; p.x += Math.sin(t * .7 + p.ph) * .25 * dt + .08 * dt; p.z += Math.cos(t * .5 + p.ph) * .12 * dt;
        if (p.y < 0) { p.y = petalTop - .5 + Math.random(); p.x = (Math.random() - .5) * petalW; p.z = camera.position.z - 1 - Math.random() * 26; }
        petalObj.position.set(p.x, p.y, p.z); petalObj.rotation.set(p.rx + t * p.sp, p.ry + t * p.sp * .7, Math.sin(t + p.ph));
        petalObj.updateMatrix(); petalsIM.setMatrixAt(k, petalObj.matrix);
      }
      petalsIM.instanceMatrix.needsUpdate = true;
    }
    if (floatBob) for (const l of street) { const b = l.userData.bob; if (b && l !== chosen) { l.position.y = b.y + Math.sin(t * b.sp + b.ph) * (b.amp ?? .18); if (b.dx) { l.position.x = b.x + Math.sin(t * .07 + b.ph) * b.dx; l.position.z = b.z + Math.cos(t * .05 + b.ph) * b.dx * .6; } } }
    for (const f of tickers) f(t, dt);
    for (const w of swayers) w.o.rotation[w.axis || 'x'] = Math.sin(t * 1.6 + w.ph) * w.amp * (calm ? .3 : 1);
    camera.lookAt(look);
    if (film) film.uniforms.uTime.value = t % 100;
    if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(look) * .9;
    composer.render();
    if (!shown) { shown = true; canvas.classList.add('ready'); }
    if (alive) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);


  // ───────── 연출 ─────────
  let tl = null, chosen = null, chosenHome = null, run = null, chosenS = .9;
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
    if (chosen && chosenHome) { gsap.killTweensOf([chosen.position, chosen.scale]); chosen.position.copy(chosenHome); chosen.scale.setScalar(chosenS); chosen.visible = true; chosen.updateMatrixWorld(true); for (const m of chosen.userData.base || []) if (m.parent !== chosen) chosen.attach(m); }
  }

  /** 대기 화면: 거리 등불 켜짐, 카메라 천천히 흔들림, 가끔 불꽃 */
  function idle() {
    if (tl) { tl.kill(); tl = null; }
    gsap.killTweensOf([camera.position, look]);
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
    chosenHome = chosen.position.clone(); chosenS = chosen.scale.x;
    const order = [...RING].sort(() => Math.random() - .5);
    const STEPS = 11;
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
    const lo = SCENE === 'pond' ? new THREE.Vector3(0, .6, .5) : new THREE.Vector3(0, -.1, .75);
    for (const l of seq) hopPts.push(l.position.clone().add(lo));
    const fate = makeFateThread(hopPts, SCENE === 'pond' ? chosenHome.clone().add(new THREE.Vector3(0, .8, 0)) : chosenHome);
    const H = seq.length, C = fate.coil;
    const r = { s: 0 }; let prevHop = -1;
    const follow = new THREE.Vector3();
    const TAIL = 1.6;   // 보이는 실 꼬리 길이 (홉 단위)
    const RUN = 6.8;
    tl.to(r, { s: H, duration: RUN, ease: 'power2.out', onUpdate: () => {
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
      {   // 카메라가 실 끝을 살짝 따라감 (동작 줄이기여도 뽑기 연출은 유지)
        follow.set(...P.rouletteLook).lerp(fate.head, .45);
        look.lerp(follow, .18);
      }
    } }, .7);

    // 2) 실이 그 등불을 두 번 감고, 툭 당김 (= 인연)
    const tAt = .7 + RUN, PF = SCENE === 'pond';
    tl.to(r, { s: H + C, duration: .8, ease: 'power2.inOut', onUpdate: () => fate.show(Math.max(0, H - .9), r.s) }, tAt)
      .call(() => buzz([10, 40, 10]), null, tAt)
      .call(() => {
        // 타임라인이 결과를 기다리며 멈춰도 카메라는 끝까지 다가가도록 따로 움직임
        // 연못: 고른 등 바로 앞까지 → 화면 정중앙 (다리 너머면 다리 위로 넘어가 내려다봄)
        const behind = PF && chosenHome.z < P.bridgeZ + 1;
        gsap.to(look, { x: chosenHome.x * (PF ? 1 : .6), y: chosenHome.y + (PF ? .55 : 0), z: chosenHome.z, duration: calm ? 1.6 : 1.1, ease: 'power2.inOut' });
        gsap.to(camera.position, { x: chosenHome.x * (PF ? 1 : .35), y: PF ? (behind ? 3.2 : 2.1) : 2.6, z: chosenHome.z + (PF ? (behind ? 3.8 : 3) : 7), duration: 1.4, delay: .1, ease: 'power2.inOut' });
      }, null, tAt);
    // 당김: 등불이 실 쪽으로 끌려왔다가 제자리
    const tug = tAt + .85;
    tl.to(chosen.position, { z: () => chosenHome.z + .9, y: () => chosenHome.y - .15, duration: .16, ease: 'power2.out' }, tug)
      .to(chosen.position, { z: () => chosenHome.z, y: () => chosenHome.y, duration: .7, ease: 'elastic.out(1, .45)' }, tug + .16)
      .call(() => { fate.flash(); buzz(25); }, null, tug);

    // 3) 매듭: 등불이 맥박 치며 밝아짐
    const knot = tug + .35;
    tl.call(() => { gsap.to(chosen.userData, { lit: 1.9, duration: .3 }); lights[1].position.copy(chosenHome); lights[1].intensity = 6; buzz(30); }, null, knot)
      .to(chosen.scale, { x: () => chosenS * 1.24, y: () => chosenS * 1.24, z: () => chosenS * 1.24, duration: .18, yoyo: true, repeat: 3, ease: 'sine.inOut' }, knot)
      .to(street.map((l) => l.userData), { lit: .5, duration: .8 }, knot + .2);

    // API 응답을 아직 못 받았으면 여기서 대기 (등불이 천천히 숨 쉬며 기다림)
    const gate = knot + .85;
    tl.call(() => {
      if (me.released) return;
      me.waiting = true;
      tl.pause();
      gsap.to(chosen.scale, { x: chosenS * 1.18, y: chosenS * 1.18, z: chosenS * 1.18, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, null, gate);

    // 4) 풍등처럼 떠오름 — 여기서부터는 원래 속도
    const lift = gate + .05;
    tl.call(() => { if (tl) gsap.to(tl, { timeScale: 1, duration: .5, ease: 'power1.out' }); }, null, lift - .3);
    if (SCENE === 'pond') {
      tl.call(() => { for (const m of chosen.userData.base || []) scene.attach(m); }, null, lift)
        .to(chosen.position, { x: 0, duration: 1.4, ease: 'power2.inOut' }, lift)
        .to(chosen.scale, { x: () => chosenS * 1.4, y: () => chosenS * 1.4, z: () => chosenS * 1.4, duration: 1.2, ease: 'power1.inOut' }, lift)
        .to(look, { x: 0, duration: 1.5, ease: 'power2.inOut' }, lift)
        .to(camera.position, { x: 0, z: () => chosenHome.z + 8, duration: 1.6, ease: 'power2.inOut' }, lift);
    }
    tl.to(chosen.position, { y: 12, duration: 1.6, ease: 'power2.in', onUpdate: () => { lights[1].position.copy(chosen.position); emberAt(chosen.position); } }, lift)
      .call(() => { if (fateObj) fateObj.fade(.6); }, null, lift + .9)
      .to(look, { y: P.liftLook, duration: calm ? 2.2 : 1.7, ease: 'power2.inOut' }, lift);
    tl.to(camera.position, { y: 3.4, duration: 1.7, ease: 'power2.inOut' }, lift);

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
      if (SCENE !== 'pond') gsap.to(chosen.scale, { x: chosenS, y: chosenS, z: chosenS, duration: .25, ease: 'sine.out' });
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
    const cx = SCENE === 'pond' ? 0 : 1;
    if (SCENE === 'pond') for (const m of chosen.userData.base || []) scene.attach(m);
    camera.position.set(chosenHome.x * .35 * cx, 3.4, chosenHome.z + 7);
    look.set(chosenHome.x * .6 * cx, P.finalLook, chosenHome.z);
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
    alive = false; cancelAnimationFrame(raf); stopSky(); ambient(false);
    if (tl) tl.kill();
    if (!opts.shared) { renderer.dispose(); return; }
    // 공유 렌더러는 남기고 이 무대의 자원만 정리
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m)) if (v && v.isTexture) v.dispose(); m.dispose?.(); }
    });
    composer.dispose?.();
  }
  // 다른 페이지로 갈 때 잠깐 멈춤 / 돌아오면 이어서
  let ambientWas = false;
  function pause() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf); stopSky();
    ambientWas = !!floatTimer; ambient(false);
  }
  // 나갈 때: 카메라가 무대 안쪽으로 한 걸음 / 들어올 때: 조금 뒤에서 걸어 들어오며 자리 잡음
  function leave() { gsap.killTweensOf(camOff); return gsap.to(camOff, { z: -2.4, y: -.1, duration: .34, ease: 'power2.in' }); }
  function enter() { gsap.killTweensOf(camOff); Object.assign(camOff, { x: 0, y: .5, z: calm ? 1.2 : 3.4 }); gsap.to(camOff, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power3.out' }); }
  // 미리 만든 무대의 후처리 셰이더·텍스처를 한 번 준비. 화면에는 1px만 그리게 잘라서 지금 보이는 무대 위로 다른 장면이 번쩍이지 않게
  function warm() {
    return compileP.then(() => {
      try { renderer.setScissor(0, 0, 1, 1); renderer.setScissorTest(true); composer.render(); }
      catch { /* noop */ }
      finally { renderer.setScissorTest(false); }
    });
  }
  function resume(quiet = false) {
    if (alive) return;
    if (tl) idle();
    if (!quiet) enter();
    shown = false; alive = true; clock.getDelta(); PERF.warm = Math.max(PERF.warm, 2); resize();   // 크기가 바뀐 경우에만 다시 잡음
    startSky(SKY_EVERY); if (ambientWas) ambient(true);
    raf = requestAnimationFrame(frame);
  }

  // 시작 상태: 등불이 하나씩 켜진 대기 화면
  street.forEach((l, i) => gsap.to(l.userData, { lit: 1, duration: .6, delay: .3 + i * .05 }));
  startSky(SKY_EVERY);
  if (SCENE === 'river' || SCENE === 'moon') ambient(true);

  if (opts.enter) enter();
  return { play, release, skip, abort, idle, introGlyph, setScroll, ambient, destroy, pause, resume, resize, leave, enter, warm };
}

// ───────── 무대 보관함: 페이지를 오가도 무대를 다시 만들지 않음 ─────────
let sharedRenderer = null, sharedCanvas = null;
const stageCache = new Map();   // key → { stage, canvas, visited }
let currentStage = null;
const MAX_STAGES = 6;
const stageKey = (o) => [o.scene || 'street', o.calm ? 1 : 0, o.lite ? 1 : 0].join('|');
function trim(keep) { for (const [k, e] of stageCache) { if (stageCache.size <= MAX_STAGES) break; if (e !== keep && e !== currentStage) { e.stage.destroy(); stageCache.delete(k); } } }
/** 페이지마다 무대를 받아감. 미리 만들어둔 게 있으면 바로 이어서 재생, 없으면 새로 만듦 */
export function acquireStage(canvas, opts = {}) {
  const key = stageKey(opts);
  if (currentStage && currentStage.key !== key) currentStage.stage.pause();
  let entry = stageCache.get(key);
  if (entry && entry.canvas === canvas) {
    stageCache.delete(key); stageCache.set(key, entry);
    if (currentStage !== entry) entry.stage.resume(); else entry.stage.enter();
  } else {
    canvas.classList.remove('ready');
    entry = { key, canvas, stage: createHanabiStage(canvas, { ...opts, shared: true, enter: true }), visited: false };
    stageCache.set(key, entry); trim(entry);
  }
  entry.stage.firstVisit = !entry.visited; entry.visited = true;
  entry.stage.reused = !entry.stage.firstVisit;
  currentStage = entry;
  if (!warmStarted) { warmStarted = true; window.__yoriWarm = prewarm(canvas, opts.calm); }
  return entry.stage;
}
/** 지금 무대가 '나가는' 연출 (router.js가 페이지 옮기기 직전에 부름) */
export function leaveStage() { return currentStage?.stage.leave(); }
/** 오미쿠지처럼 화면을 덮는 연출 동안 배경 무대를 잠깐 멈춤 (60fps 유지) / 끝나면 그 자리에서 이어서 */
export function holdStages(on) { if (!currentStage) return; if (on) currentStage.stage.pause(); else currentStage.stage.resume(true); }
/** 3D가 없는 페이지로 갈 때 */
export function pauseStages() { if (currentStage) { currentStage.stage.pause(); currentStage = null; } }
// 처음 들어올 때 다른 페이지 무대도 미리 만들어 둠 → 어느 페이지로 가도 끊기지 않음
let warmStarted = false;
function prewarm(canvas, calm) {
  const list = [{ scene: 'street' }, { scene: 'pond' }, { scene: 'sando', lite: true }, { scene: 'alley', lite: true }, { scene: 'shrine', lite: true }, { scene: 'momiji', lite: true }];
  const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 60)));
  return list.reduce((p, o) => p.then(async () => {
    await idle();
    const opts = { ...o, calm }, key = stageKey(opts);
    if (stageCache.has(key)) return;
    try {
      const st = createHanabiStage(canvas, { ...opts, shared: true });
      st.pause();
      stageCache.set(key, { key, canvas, stage: st, visited: false });
      await st.warm();
    } catch (e) { console.warn('미리 만들기 실패', e); }
  }), Promise.resolve());
}
(window.__spaAddPersistent || ((t, ...a) => t.addEventListener(...a)))(window, 'resize', () => currentStage?.stage.resize());
