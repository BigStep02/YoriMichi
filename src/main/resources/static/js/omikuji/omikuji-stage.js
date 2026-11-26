// 옻칠 오미쿠지 통 — 주변 맛집·축제·놀거리 뽑기 패널 3D 연출 (Three.js + GSAP)
// 대기: 패널 안 작은 통이 숨 쉬듯 흔들리고 금가루가 떠오름. 마우스·폰 기울기를 따라 살짝 기울며 옻칠·금박 반사가 바뀜
// 뽑기: 통이 화면 가운데로 떠오름 → 묵직하게 두 번 흔들림 → (응답 기다리는 동안 덜그럭) → 윗구멍이 카메라를 향해 기울고
//       → 막대가 툭 빠져나와 눈앞까지 다가옴 → 번호가 번쩍 → 결과
// 동작 줄이기: 패널 안에서 막대가 천천히 올라오며 빛남 (이동·흔들림·회전·줌 없음)
// 사용: const omk = mountOmikuji(slotEl, { kind: 'food'|'fest'|'spot', calm, onTap });  await omk.ready;  await omk.draw(task, { label })
//   label(result) → { title, sub } : 번쩍인 뒤 펼쳐지는 와시 두루마리에 쓸 글 (없으면 번호만)
// 겉면: 금 마키에 무늬(도리이·おみくじ 액자·마엽·청해파·벚꽃), 주변에 벚꽃잎이 흩날림 (동작 줄이기에선 꽃잎 없음) — omikuji-deco.js
// 성능: WebGL 렌더러·장면은 한 번만 만들고 페이지를 옮기면 canvas만 새 패널로 옮겨 씀 (전환마다 GPU 컨텍스트·셰이더를 새로 만들지 않음)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { holdStages } from '../hanabi/hanabi-stage.js';
import { makeDeco, makePetals } from './omikuji-deco.js';

export function webglOk() {
  try { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); g?.getExtension('WEBGL_lose_context')?.loseContext(); return !!g; } catch { return false; }
}

// 색은 세 가지만: 숯검정(INK) · 샴페인 골드(GOLD) · 주사 레드(SHU, 막대 끝·인장 한 점)
const INK = '#09090B', GOLD = '#D4AF37', SHU = '#A8281C';
const KINDS = {   // 종류는 색이 아니라 금장 인장 속 한자로만 구분
  food: { glyph: '食', glow: GOLD },
  fest: { glyph: '祭', glow: GOLD },
  spot: { glyph: '遊', glow: GOLD },
};
const SERIF = '"Zen Old Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';
const NUMS = '〇一二三四五六七八九';
const kanjiNum = (n) => { const t = Math.floor(n / 10), o = n % 10; return (t ? (t > 1 ? NUMS[t] : '') + '十' : '') + (o ? NUMS[o] : ''); };

const R = .62, H = 1.7, SEG = 6, T0 = Math.PI / 6;      // 6각 통 (T0: 평평한 면이 정면을 보게)
const APO = R * Math.cos(Math.PI / 6);                  // 정면 면까지 거리
const SL = 1.55, SW = .085, ST = .03;                   // 막대 길이·폭·두께
const STICK_HOME = H / 2 - .05 - SL / 2;                // 통 안에 숨은 위치
const NUM_Y = SL / 2 - .34;                             // 막대 위 '第○番' 글씨 가운데 (막대 기준, 위 여백 넉넉히)
const CAM_PANEL = 4.4, CAM_FULL = 9, FOV = 30;
const TAN = Math.tan(FOV / 2 * Math.PI / 180);

// 마지막 색 보정: 가장자리를 어둡게(비네트) + 아주 옅은 필름 그레인 → 화면이 '렌즈로 찍은' 느낌
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0 }, uGrain: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uGrain, uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = (vUv - .5) * vec2(1., 1.25);
      c.rgb *= mix(1., smoothstep(.9, .18, length(d)), uVig);
      c.rgb += (h(vUv * 917. + uTime) - .5) * uGrain;
      gl_FragColor = c;
    }`,
};

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.redraw = (fn = draw) => { g.clearRect(0, 0, w, h); fn(g, w, h); t.needsUpdate = true; };
  return t;
}

// 스튜디오 환경광 (제품 촬영 세팅): 검은 방 + 좌우 긴 스트립 소프트박스 + 위쪽 큰 소프트박스 + 아주 약한 바닥 반사
// 색은 중성 흰색만 → 금속·옻칠에 '길고 부드러운 하이라이트'가 맺히고, 금색은 재질 자체에서만 나옴
function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: '#020203', side: THREE.BackSide })));
  // 그라데이션 소프트박스: 면에 '위는 밝고 아래로 사라지는' 긴 하이라이트가 맺히게
  const grad = (vertical) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = vertical ? g.createLinearGradient(0, 0, 0, 64) : g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(.18, '#5a5a5a'); gr.addColorStop(.5, '#0c0c0c'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const texV = grad(true);
  // 가로로 가운데가 밝고 양끝이 어두워지는 큰 소프트박스 → 평평한 면에 '넓게 차오르다 사라지는' 고급 광택
  const texH = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#000'); gr.addColorStop(.35, '#3a3a3a'); gr.addColorStop(.5, '#fff'); gr.addColorStop(.65, '#3a3a3a'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 128, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const card = (k, pos, size, map) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF').multiplyScalar(k), map: map || null, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, pos[1] * .3, 0); s.add(m);
  };
  const ring = (k, deg, y, w, hgt, map = texH, d = 6) => { const a = deg * Math.PI / 180; card(k, [Math.sin(a) * d, y, Math.cos(a) * d], [w, hgt], map); };
  // 각도: 카메라 방향(+z)에서 잰 가로 각도. 평평한 면은 좁은 방향만 반사하므로 아주 넓은 그라데이션 패널로
  // (제품 촬영의 대형 소프트박스처럼) → 통이 어느 각도로 돌아도 면 위에 광택이 차올랐다 사라짐
  card(3.4, [0, 2.6, 6.5], [7, 4], texV);            // 카메라 뒤 위 → 정면 면: 위에서 아래로 사라지는 광택
  ring(6.5, -46, 1, 2.6, 8);                          // 왼쪽 앞 대형 패널 (가운데가 가장 밝음)
  ring(3.6, 52, .6, 2.2, 8);                          // 오른쪽 앞 (절반 세기, 비대칭)
  ring(10, -128, .9, 3, 8);                        // 왼쪽 뒤 → 실루엣 림
  ring(5, 128, .4, 2.4, 8);                        // 오른쪽 뒤
  card(18, [0, 6, .5], [4, 4], texV);              // 위 → 뚜껑 윗면·추출구 링
  card(10, [0, 5, -4], [7, 3], texV);              // 뒤 위 → 위에서 내려다볼 때 뚜껑 윗면이 검게 죽지 않게
  card(1.5, [0, -4, 4], [8, 1.2]);                 // 바닥 앞 반사판
  const rt = pm.fromScene(s, .02);
  pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  texV.dispose(); texH.dispose();
  return rt;
}

// ── 정밀 형상: 모서리를 둥글린 육각 단면을 위아래 프로필(베벨)로 쓸어 올린 몸체 ──
// outline: 꼭짓점이 0°·60°…에 있어 평평한 면이 정면(+z)을 봄. 모서리마다 cr 반지름 호, 면은 완전한 평면
function roundedHexOutline(rv, cr, seg = 6) {
  const pts = [], k = cr / Math.sin(Math.PI / 3);
  for (let c = 0; c < 6; c++) {
    const th = c * Math.PI / 3, cx = Math.cos(th) * (rv - k), cz = Math.sin(th) * (rv - k);
    for (let i = 0; i <= seg; i++) {
      const ph = th - Math.PI / 6 + (i / seg) * Math.PI / 3;
      pts.push({ x: cx + Math.cos(ph) * cr, z: cz + Math.sin(ph) * cr, nx: Math.cos(ph), nz: Math.sin(ph) });
    }
  }
  return pts;
}
/** profile: 아래→위 [{ o: 바깥으로 민 거리(음수=안쪽), y, nr: 옆 방향 법선, ny: 위 방향 법선 }], taper: 위로 갈수록 좁아지는 비율 */
function sweepHex({ rv, cr, profile, taper = 0, h = 1, capTop = true, capBottom = true }) {
  const outline = roundedHexOutline(rv, cr), M = outline.length;
  const pos = [], nor = [], uv = [], idx = [];
  profile.forEach((p, r) => {
    const sc = 1 - taper * (p.y / h);
    for (let i = 0; i < M; i++) {
      const q = outline[i];
      pos.push((q.x + q.nx * p.o) * sc, p.y, (q.z + q.nz * p.o) * sc);
      const n = new THREE.Vector3(q.nx * p.nr, p.ny, q.nz * p.nr).normalize();
      nor.push(n.x, n.y, n.z); uv.push(i / (M - 1), p.y / h);
    }
    if (r) for (let i = 0; i < M - 1; i++) { const a = (r - 1) * M + i, b = r * M + i; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  });
  const cap = (r, up) => {
    const p = profile[r], c = pos.length / 3;
    pos.push(0, p.y, 0); nor.push(0, up ? 1 : -1, 0); uv.push(.5, .5);
    const sc = 1 - taper * (p.y / h);
    for (let i = 0; i < M; i++) { const q = outline[i]; pos.push((q.x + q.nx * p.o) * sc, p.y, (q.z + q.nz * p.o) * sc); nor.push(0, up ? 1 : -1, 0); uv.push(.5 + q.x * .5, .5 + q.z * .5); }
    for (let i = 0; i < M - 1; i++) up ? idx.push(c, c + 2 + i, c + 1 + i) : idx.push(c, c + 1 + i, c + 2 + i);
  };
  if (capTop) cap(profile.length - 1, true);
  if (capBottom) cap(0, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
/** 둥근 베벨 프로필: 높이 h, 아래·위 모서리 반지름 bb·bt */
function bevelProfile(h, bb, bt, n = 5) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; out.push({ o: -bb + bb * Math.cos(a), y: bb + bb * Math.sin(a), nr: Math.cos(a), ny: Math.sin(a) }); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; out.push({ o: -bt + bt * Math.cos(a), y: h - bt + bt * Math.sin(a), nr: Math.cos(a), ny: Math.sin(a) }); }
  return out;
}
// 높이맵(흰 바탕, 검은 글자=파인 곳) → 노멀맵 (소벨). 금속 면에 새긴 음각이 빛을 받아 실제 깊이처럼 보임
function heightToNormal(src, strength = 3) {
  const w = src.width, h = src.height, sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), out = g.createImageData(w, h), d = out.data;
  const H = (x, y) => sd[((Math.min(h - 1, Math.max(0, y)) * w) + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
    const nx = -dx * strength, ny = dy * strength, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * w + x) * 4;
    d[i] = (nx / l * .5 + .5) * 255; d[i + 1] = (ny / l * .5 + .5) * 255; d[i + 2] = (nz / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return c;
}

let inst = null;
/** 패널 칸(slot)에 통을 붙임. 이미 만든 통이 있으면 그대로 옮겨 씀 */
export function mountOmikuji(slot, opts = {}) {
  if (!inst || !inst.alive || inst.calm !== !!opts.calm) { inst?.destroy(); inst = build(!!opts.calm); }
  inst.attach(slot, opts);
  return inst;
}

function build(calm) {
  const gsap = window.gsap;
  let slot = null, onTap = null;
  let K = KINDS.food;
  const buzz = (p) => { if (calm) return; try { navigator.vibrate?.(p); } catch { /* noop */ } };

  // ── DOM: 패널 칸 안 canvas + 뽑을 때 쓰는 전체 화면 막 ──
  let canvas = document.createElement('canvas');
  canvas.className = 'omk-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const layer = document.createElement('div');
  layer.className = 'omk-layer';
  layer.innerHTML = '<div class="omk-back"></div><div class="omk-type" aria-hidden="true"><span class="omk-kicker"></span><b class="omk-title"></b><i class="omk-rule"></i><span class="omk-sub"></span></div><div class="omk-flash"></div><button type="button" class="omk-skip" hidden>건너뛰기 ›</button>';
  const back = layer.firstElementChild, flash = layer.querySelector('.omk-flash');
  // 건너뛰기: 결과가 오면 연출을 생략하고 바로 결과로 (응답 전이면 응답이 오는 즉시)
  const skipEl = layer.querySelector('.omk-skip');
  let skipped = false, curTl = null;
  skipEl.addEventListener('click', (e) => { e.stopPropagation(); skipped = true; skipEl.hidden = true; curTl?.timeScale(8); });
  const typeEl = layer.querySelector('.omk-type');   // 결과 이름: 막대 아래 정적 속에 떠오르는 글 (3D 위 HTML → 글자가 선명)

  // 아이폰 홈 화면 앱에서 처음 받은 WebGL이 잃어버린 상태로 와서 실패하는 경우 → 새 canvas·가벼운 설정으로 재시도
  let renderer;
  for (const o of [{ antialias: true, powerPreference: 'high-performance' }, { antialias: true }, { antialias: false }]) {
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, ...o }); break; }
    catch (e) {
      if (!o.antialias) throw e;
      console.warn('오미쿠지 WebGL 다시 시도', e?.message);
      const fresh = canvas.cloneNode(false); canvas = fresh;
    }
  }
  const PR = Math.min(devicePixelRatio || 1, 1.75);   // 전체 화면 + 빛 번짐이라 2배까지는 안 올림 (폰 60fps)
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;   // 무늬가 잘 보이게 살짝 밝게
  renderer.debug.checkShaderErrors = /[?&]debug3d=1/.test(location.search);   // 켜두면 셰이더 컴파일 동안 메인 스레드가 멈춤

  const scene = new THREE.Scene();
  const envRT = makeEnv(renderer);
  scene.environment = envRT.texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 50);

  // 빛: 중성 흰색 키라이트 하나 + 아주 약한 보조광. 금색으로 물들이는 조명은 쓰지 않음 (금색은 재질에서만)
  scene.add(new THREE.HemisphereLight('#3A3A40', '#000000', .6));
  const key = new THREE.DirectionalLight('#FFF8EE', 1.6); key.position.set(-2.4, 4, 3); scene.add(key);
  const SPOT0 = 0;   // 예전 스포트라이트 자리 (동작 줄이기 버전이 밝기를 살짝 올리는 데만 씀)
  const spot = new THREE.SpotLight('#FFF4E2', SPOT0, 12, .32, .9, 1.4); spot.position.set(0, 5, 2.4); scene.add(spot);

  // ── 통 ──
  const holder = new THREE.Group();    // 패널 ↔ 화면 가운데 이동·크기
  const par = new THREE.Group();       // 시선 따라 기울기·회전
  const tilt = new THREE.Group();      // 흔들기·기울이기
  holder.add(par); par.add(tilt); scene.add(holder);
  spot.target = holder;

  // 재질: 깊은 흑옻칠(유광 클리어코트) · 브러시드 골드 · 무광 흑철 베이스 · 이음 홈
  const lacquerTex = canvasTex(4, 4, (g) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 4, 4); });   // (예전 텍스처 자리, 정리용)
  // 옻칠: 아래층은 빛을 거의 먹는 깊은 검정(퍼진 광택 X), 위 클리어코트만 거울처럼 → 검은 면 위에 하이라이트가 칼같이 맺힘
  const lacquer = new THREE.MeshPhysicalMaterial({ color: '#040405', roughness: .7, metalness: 0, specularIntensity: .15, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1 });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#C9A35B', metalness: 1, roughness: .3, anisotropy: .7, envMapIntensity: .7 });
  const iron = new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: .85, roughness: .5, envMapIntensity: .2 });
  const voidM = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 1 });

  // 치수 (전체 높이 H, 바닥 -H/2)
  const RV = R / Math.cos(Math.PI / 6) * .96, CR = .045;     // 외접 반지름(꼭짓점) · 모서리 둥글기
  const Y0 = -H / 2, BASE_H = .075, GAP = .007, LID_H = .23;
  const BODY_H = H - BASE_H - LID_H - GAP * 2;
  // 베이스: 몸통보다 안쪽으로 들인 흑철 받침 → 몸통 아래 그림자 선이 생겨 통이 살짝 떠 보임 (고급 제품의 '플로팅' 디테일)
  const baseG = sweepHex({ rv: RV * .9, cr: CR, h: BASE_H, profile: bevelProfile(BASE_H, .006, .006) });
  const base = new THREE.Mesh(baseG, iron); base.position.y = Y0; tilt.add(base);
  // 몸통: 흑옻칠, 위로 아주 살짝 좁아짐
  const bodyG = sweepHex({ rv: RV, cr: CR, h: BODY_H, taper: .025, profile: bevelProfile(BODY_H, .018, .008) });
  const bodyM = new THREE.Mesh(bodyG, lacquer); bodyM.position.y = Y0 + BASE_H + GAP; tilt.add(bodyM);
  // 이음 홈 (부품 사이의 검은 틈 → 실제로 조립된 물건처럼)
  for (const y of [Y0 + BASE_H + GAP + BODY_H]) {   // 몸통-뚜껑 사이 (베이스 쪽은 들여 놓아서 그림자가 대신함)
    const gr = new THREE.Mesh(sweepHex({ rv: RV * .955, cr: CR, h: GAP, profile: [{ o: 0, y: 0, nr: 1, ny: 0 }, { o: 0, y: GAP, nr: 1, ny: 0 }], capTop: false, capBottom: false }), voidM);
    gr.position.y = y; tilt.add(gr);
  }
  // 뚜껑: 위 모서리를 더 둥글게
  const lidRV = RV * (1 - .025) * 1.0;   // 몸통 윗단(테이퍼 끝)과 같은 크기 → 이음 홈만 보임
  const lidG = sweepHex({ rv: lidRV, cr: CR, h: LID_H, profile: bevelProfile(LID_H, .008, .04, 8) });
  const lid = new THREE.Mesh(lidG, lacquer); lid.position.y = H / 2 - LID_H; tilt.add(lid);
  // 몸통 위쪽의 얇은 금 인레이 링 (면에서 아주 살짝만 올라옴)
  const inlayY = BODY_H - .07;
  const inlay = new THREE.Mesh(sweepHex({ rv: RV * (1 - .025 * inlayY / BODY_H) + .0025, cr: CR, h: .008, profile: [{ o: 0, y: 0, nr: .4, ny: -.9 }, { o: 0, y: 0, nr: 1, ny: 0 }, { o: 0, y: .008, nr: 1, ny: 0 }, { o: 0, y: .008, nr: .4, ny: .9 }], capTop: false, capBottom: false }), gold);
  inlay.position.y = Y0 + BASE_H + GAP + inlayY; tilt.add(inlay);

  // 추출구: 뚜껑 윗면 가운데, 모따기한 금속 링 → 깊은 구멍. 바깥에 아주 가는 동심원 한 줄
  const topY = H / 2;
  const aperRing = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.165, 0), new THREE.Vector2(.158, .004), new THREE.Vector2(.13, -.006), new THREE.Vector2(.104, -.03), new THREE.Vector2(.1, -.034)], 96), gold);
  aperRing.position.y = topY + .0005; tilt.add(aperRing);
  const aperWell = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .16, 48, 1, true), voidM);
  aperWell.position.y = topY - .034 - .08; tilt.add(aperWell);
  const aperFloor = new THREE.Mesh(new THREE.CircleGeometry(.1, 48).rotateX(-Math.PI / 2), voidM);
  aperFloor.position.y = topY - .19; tilt.add(aperFloor);
  const fineRing = new THREE.Mesh(new THREE.RingGeometry(.232, .236, 128).rotateX(-Math.PI / 2), gold);
  fineRing.position.y = topY + .0008; tilt.add(fineRing);
  // 뚜껑 윗면을 추출구 자리만큼 비워 두면 구멍이 진짜로 뚫려 보임 → 윗면 위에 검은 원판을 얹지 않고, 링이 윗면과 맞닿게 함
  // (윗면 캡은 그대로 두고, 구멍 안쪽은 voidM 원통이 위에서 보이는 깊이를 만듦)
  const aperCover = new THREE.Mesh(new THREE.CircleGeometry(.1, 48).rotateX(-Math.PI / 2), voidM);
  aperCover.position.y = topY + .0004; tilt.add(aperCover);

  // 메달리온: 정면에 박힌 두께 있는 브러시드 골드 원판 + 음각 한자 (노멀맵)
  const MED_R = .135, MED_T = .014;
  const medRim = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, -.004), new THREE.Vector2(MED_R + .004, -.004), new THREE.Vector2(MED_R + .006, .004), new THREE.Vector2(MED_R, MED_T), new THREE.Vector2(MED_R - .006, MED_T + .002)], 96).rotateX(Math.PI / 2), gold);
  const drawGlyph = (g, w, h) => {   // 높이맵: 흰 바탕 = 금속면, 검정 = 파인 곳 (한자 + 안쪽 가는 원)
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
    g.save(); g.filter = 'blur(1.2px)';
    g.strokeStyle = '#000000'; g.lineWidth = w * .008; g.beginPath(); g.arc(w / 2, h / 2, w * .43, 0, 6.29); g.stroke();
    g.fillStyle = '#000000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${w * .5}px ${SERIF}`; g.fillText(K.glyph, w / 2, h * .53);
    g.restore();
  };
  const glyphTex = canvasTex(512, 512, drawGlyph, false);   // 높이맵 원본 (노멀·거칠기 계산용)
  const medNormal = new THREE.CanvasTexture(heightToNormal(glyphTex.image, 2.4));
  const medRough = canvasTex(512, 512, (g, w, h) => { g.drawImage(glyphTex.image, 0, 0); g.globalCompositeOperation = 'difference'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(70,70,70,1)'; g.globalCompositeOperation = 'lighten'; g.fillRect(0, 0, w, h); }, false);
  const medFace = new THREE.MeshPhysicalMaterial({ color: '#CDA85E', metalness: 1, roughness: 1, roughnessMap: medRough, normalMap: medNormal, normalScale: new THREE.Vector2(1, 1), envMapIntensity: .7 });
  const remakeEmblem = () => {
    glyphTex.redraw(drawGlyph);
    medNormal.image = heightToNormal(glyphTex.image, 2.4); medNormal.needsUpdate = true;
    medRough.redraw();
  };
  const glyph = new THREE.Group();
  const medFaceM = new THREE.Mesh(new THREE.CircleGeometry(MED_R - .004, 96), medFace); medFaceM.position.z = MED_T + .0015;
  glyph.add(medRim, medFaceM);
  const MED_Y = BODY_H * .30;   // 위쪽은 「おみくじ」 액자, 아래쪽 청해파 사이
  glyph.position.set(0, Y0 + BASE_H + GAP + MED_Y, RV * Math.cos(Math.PI / 6) * (1 - .025 * MED_Y / BODY_H) - .006);   // 면에 살짝 파묻힌 인레이
  tilt.add(glyph);
  // 주사 레드 한 점: 베이스 정면의 아주 작은 인장
  const sealM = new THREE.MeshStandardMaterial({ color: SHU, roughness: .55 });
  const seal = new THREE.Mesh(new THREE.BoxGeometry(.022, .022, .004), sealM);
  seal.position.set(0, Y0 + BASE_H + GAP + .06, RV * Math.cos(Math.PI / 6) - .0005); tilt.add(seal);   // 몸통 아래쪽 정면에 아주 작게

  // 무늬·꽃잎은 장식일 뿐 → 만들다 오류가 나도 통·뽑기는 그대로 동작하게 따로 감쌈
  let deco = null;
  try {
    // ── 금 마키에 무늬: 면마다 얇은 금박 판을 옻칠 바로 위에 얹음 (무늬 모양 = alphaMap, 도드라짐 = normalMap) ──
    const FLAT = (RV - CR / Math.sin(Math.PI / 3)) * .94, APO_B = RV * Math.cos(Math.PI / 6);   // 면의 평평한 폭(모서리 둥근 곳 제외) · 면까지 거리
    const DY0 = .028, DY1 = BODY_H - .022, DECO_W = 440, PPU = DECO_W / FLAT;                    // 몸통 베벨 안쪽 높이 · 무늬 1단위당 px
    deco = makeDeco({
      W: DECO_W, H: Math.round((DY1 - DY0) * PPU), serif: SERIF,
      med: { f: (DY1 - MED_Y) / (DY1 - DY0), r: MED_R * PPU },
      seal: { f: (DY1 - .06) / (DY1 - DY0), r: .011 * PPU },
      lidPx: 512 / 1.3, lidR: lidRV - .05, aperR: .25,
    });
    const decoMat = (s) => new THREE.MeshPhysicalMaterial({
      color: '#D2AE62', metalness: .9, roughness: .4, anisotropy: .5, envMapIntensity: 1,
      emissive: '#8A6A2E', emissiveIntensity: .38,   // 어느 각도에서도 금박 무늬가 은은하게 보이게 (빛이 안 닿는 면도 검게 죽지 않음)
      alphaMap: s.mask, normalMap: s.normal, normalScale: new THREE.Vector2(.9, .9),
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const frontMat = decoMat(deco.front), sideMat = decoMat(deco.side), lidMat = decoMat(deco.lid);
    // 면 하나를 덮는 사각형 (몸통처럼 위로 살짝 좁아짐). flip: 옆면 무늬를 좌우 뒤집어 번갈아 씀
    const faceQuad = (phi, flip) => {
      const nx = Math.cos(phi), nz = Math.sin(phi), tx = Math.sin(phi), tz = -Math.cos(phi), pos = [], uv = [];
      for (const [y, v] of [[DY0, 0], [DY1, 1]]) {
        const sc = 1 - .025 * y / BODY_H, a = APO_B * sc + .0012, hw = FLAT / 2 * sc;
        for (const s of [-1, 1]) { pos.push(nx * a + tx * hw * s, y, nz * a + tz * hw * s); uv.push(flip ? (1 - s) / 2 : (s + 1) / 2, v); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex([0, 1, 2, 2, 1, 3]); g.computeVertexNormals();
      return g;
    };
    for (let k = 0; k < 6; k++) {   // k=1 이 정면(+z)
      const m = new THREE.Mesh(faceQuad(Math.PI / 6 + k * Math.PI / 3, k !== 1 && k % 2 === 0), k === 1 ? frontMat : sideMat);
      m.position.y = Y0 + BASE_H + GAP; tilt.add(m);
    }
    const lidDeco = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), lidMat);
    lidDeco.position.y = topY + .0003; tilt.add(lidDeco);
    // 금 띠: 몸통 아래 + 뚜껑 위·아래 (위쪽 몸통 띠는 위의 inlay)
    const bandProfile = [{ o: 0, y: 0, nr: .4, ny: -.9 }, { o: 0, y: 0, nr: 1, ny: 0 }, { o: 0, y: .008, nr: 1, ny: 0 }, { o: 0, y: .008, nr: .4, ny: .9 }];
    const band = (rv, y) => { const b = new THREE.Mesh(sweepHex({ rv, cr: CR, h: .008, profile: bandProfile, capTop: false, capBottom: false }), gold); b.position.y = y; tilt.add(b); };
    band(RV * (1 - .025 * .045 / BODY_H) + .0025, Y0 + BASE_H + GAP + .045);
    band(lidRV + .0025, H / 2 - LID_H + .028);
    band(lidRV + .0025, H / 2 - LID_H + .17);

  } catch (e) { console.warn('오미쿠지 무늬를 그리지 못했어요 (무늬 없이 계속)', e); deco = null; }

  // ── 흩날리는 벚꽃잎 (통을 따라 움직이되 흔들림·기울기와는 따로) ──
  let petals = null;
  try { if (!calm) { petals = makePetals(40); holder.add(petals.mesh); } }
  catch (e) { console.warn('벚꽃잎을 만들지 못했어요', e); petals = null; }
  let pAcc = 0;

  // ── 막대: 히노키색 나무, 끝은 붉은 칠, 앞면에 '第○番' 먹글씨 ──
  let num = 1;
  const drawStick = (ink) => (g, w, h) => {
    if (ink) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
    else {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#DCCFB2'); gr.addColorStop(.5, '#EEE5D0'); gr.addColorStop(1, '#D8CBAE');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 24; i++) { g.strokeStyle = `rgba(90,70,40,${.03 + Math.random() * .04})`; g.lineWidth = 1; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - .5) * 4, h); g.stroke(); }
      g.fillStyle = SHU; g.fillRect(0, 0, w, h * .035);
    }
    // 작고 단정하게: 끝에서 넉넉히 띄운 자리에 세로로
    const chars = ['第', ...kanjiNum(num), '番'];
    g.fillStyle = ink ? '#FFFFFF' : '#1C1A17'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fs = w * .44, step = fs * 1.18, mid = h * (.34 / SL * 1);   // NUM_Y와 같은 자리에 가운데 맞춤
    g.font = `600 ${fs}px ${SERIF}`;
    chars.forEach((c, i) => g.fillText(c, w / 2, mid + (i - (chars.length - 1) / 2) * step));
  };
  const stickTex = canvasTex(128, 2304, drawStick(false));
  const stickGlow = canvasTex(128, 2304, drawStick(true));
  const wood = new THREE.MeshStandardMaterial({ color: '#E4D9C0', roughness: .75, transparent: true });
  const tipM = new THREE.MeshStandardMaterial({ color: SHU, roughness: .6, transparent: true });
  const faceM = new THREE.MeshStandardMaterial({ map: stickTex, roughness: .65, emissive: new THREE.Color(K.glow), emissiveMap: stickGlow, emissiveIntensity: 0, transparent: true });
  const stickMats = [wood, wood, tipM, wood, faceM, wood];
  const stick = new THREE.Mesh(new THREE.BoxGeometry(SW, SL, ST), stickMats);
  stick.position.y = STICK_HOME; tilt.add(stick);

  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,240,210,.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: K.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glowSpr.position.set(0, NUM_Y, .05); glowSpr.scale.setScalar(.01); stick.add(glowSpr);

  // ── 번호 위를 한 번 지나가는 빛 (막대 표면을 훑는 짧은 하이라이트) ──
  const strokeLight = new THREE.PointLight('#FFF6E8', 0, 2.4, 1.6);
  scene.add(strokeLight);

  let wLabel = null;   // draw(task, { label })로 받은 글 → 결과 타이포그래피

  // ── 추출구 안쪽 빛: 열릴 때 은은하게 새어 나옴 ──
  const aperGlowMat = new THREE.MeshBasicMaterial({ color: '#F1E4C4', transparent: true, opacity: 0, depthWrite: false });
  const aperGlow = new THREE.Mesh(new THREE.CircleGeometry(.098, 48).rotateX(-Math.PI / 2), aperGlowMat);
  aperGlow.position.y = H / 2 - .06; tilt.add(aperGlow);
  const aperHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#F1E4C4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  aperHalo.position.y = H / 2 + .05; aperHalo.scale.set(.5, .28, 1); tilt.add(aperHalo);

  // ── 전체 화면 무대 (뽑을 때만 켜짐) ──
  const FLOOR_Y = -.72;
  const BG = new THREE.Color(INK);
  const stageObjs = [];
  // 반사 바닥: 흑단 옻칠 바닥에 통이 비침. 밝기(color)로 서서히 드러냄
  const floor = new Reflector(new THREE.PlaneGeometry(16, 16), { textureWidth: 512, textureHeight: 512, color: 0x000000, clipBias: .003 });
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; scene.add(floor); stageObjs.push(floor);
  const radial = (stops) => canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  // 바닥 가장자리를 숯검정으로 덮어 반사가 통 아래에만 고이게
  const fadeTex = radial([[0, 'rgba(9,9,11,0)'], [.28, 'rgba(9,9,11,.15)'], [.7, 'rgba(9,9,11,1)'], [1, 'rgba(9,9,11,1)']]);
  const floorFade = new THREE.Mesh(new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
  floorFade.position.y = FLOOR_Y + .002; scene.add(floorFade); stageObjs.push(floorFade);
  // 접지 그림자
  const shadowTex = radial([[0, 'rgba(0,0,0,.85)'], [.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
  contact.position.y = FLOOR_Y + .004; scene.add(contact); stageObjs.push(contact);
  // 후처리
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, .55, .84);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  // 무대 밝기들: 한 객체로 모아 GSAP으로 움직이고, 매 프레임 실제 값에 반영
  const fx = { bloom: 0, vig: 0, grain: 0, floor: 0, glow: 0 };
  let post = false;
  const setStage = (on) => { for (const o of stageObjs) o.visible = on; };
  setStage(false);
  const camOff = new THREE.Vector3(), lookOff = new THREE.Vector3();
  const tmpV = new THREE.Vector3();

  // ── 화면 모드 ──
  let full = false;
  let sizeKey = '';
  function resize() {
    const host = full ? layer : slot;
    if (!host) return;
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    const k = `${w}x${h}x${full}`;
    if (k === sizeKey) return;   // 같은 크기면 버퍼를 새로 만들지 않음
    sizeKey = k; since = 1;      // 크기를 바꾸면 화면이 지워지므로 다음 프레임에 바로 다시 그림
    renderer.setSize(w, h, false);
    if (full) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.set(0, full ? 0 : .08, full ? CAM_FULL : CAM_PANEL);
    camera.lookAt(0, full ? 0 : .08, 0);
    camera.updateProjectionMatrix();
  }
  // 패널 칸에 보이던 그 자리·크기를 전체 화면 좌표로 옮긴 값 (통이 패널에서 그대로 떠오르는 것처럼)
  function slotPose() {
    const r = slot.getBoundingClientRect(), W = innerWidth, Hh = innerHeight;
    const vis = 2 * CAM_FULL * TAN, frac = H / (2 * CAM_PANEL * TAN);
    const pv = 2 * CAM_PANEL * TAN;   // 패널 카메라가 보는 세로 폭 (카메라가 .08 위를 봐서 통이 그만큼 아래에 보임)
    return { x: ((r.left + r.width / 2) / W - .5) * vis * (W / Hh), y: -((r.top + r.height / 2) / Hh - .5) * vis - (.08 / pv) * (r.height / Hh) * vis, s: frac * r.height / Hh * vis / H };
  }
  function goFull() {
    const p = slotPose();
    document.body.appendChild(layer);
    full = true; layer.insertBefore(canvas, typeEl); resize();
    holder.position.set(p.x, p.y, 0); holder.scale.setScalar(p.s);
    slot.classList.add('omk-out');
  }
  function goPanel() {
    full = false; slot.appendChild(canvas); layer.remove(); resize();
    holder.position.set(0, 0, 0); holder.scale.setScalar(1);
    slot.classList.remove('omk-out');
  }

  // ── 시선 따라 기울기 (대기 중) ──
  const parT = { x: 0, y: 0 }, parC = { x: 0, y: 0 };
  let busy = null;
  const onPointer = (e) => { if (busy) return; parT.y = (e.clientX / innerWidth - .5) * .34; parT.x = (e.clientY / innerHeight - .5) * .22; };
  const onTilt = (e) => { if (busy || e.gamma == null) return; parT.y = Math.max(-1, Math.min(1, e.gamma / 30)) * .17; parT.x = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * .11; };
  // iOS Safari는 기울기 값을 받으려면 권한 팝업(requestPermission)이 필요함 → 뽑기 순간에 팝업이 뜨지 않게 iOS에선 쓰지 않고 손가락·마우스 위치만 씀
  const tiltNeedsPermission = typeof window.DeviceOrientationEvent?.requestPermission === 'function';
  let listenAC = null;   // attach마다 새로 만들고 이전 것은 abort → 리스너가 쌓이지 않음

  // ── 그리기 ──
  let visible = true, alive = true, raf = 0, t = 0, since = 0;
  const spin = { v: 0 };
  const ro = new ResizeObserver(() => { if (!full) resize(); });   // 칸이 보이게 되거나 크기가 바뀌면 맞춤
  const clock = new THREE.Clock();
  function frame() {
    if (!alive) return;
    // 패널이 사라짐(다른 페이지로 이동) → 그리기만 멈추고 렌더러는 남겨 둠 (다음 페이지에서 바로 다시 씀)
    if (!slot || !slot.isConnected) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    if (!full && slot.clientWidth && `${slot.clientWidth}x${slot.clientHeight}x${full}` !== sizeKey) resize();   // 관찰자 알림이 늦어도 칸 크기에 맞춤
    const dt = Math.min(clock.getDelta(), .05);
    // 패널이 화면 밖이면 대기 그리기 멈춤 (뽑는 중·전체 화면일 땐 항상 그림)
    if (!busy && !full) { const r = slot.getBoundingClientRect(); visible = r.width > 0 && r.bottom > -80 && r.top < innerHeight + 80; }
    if (document.hidden || (!visible && !busy && !full)) return;
    t += dt; since += dt; pAcc += dt;
    if (!busy && since < 1 / 31) return;   // 대기 중엔 30fps면 충분 (배경 무대와 GPU를 나눠 씀)
    since = 0;
    if (petals) { try { petals.step(pAcc); } catch { petals.mesh.visible = false; petals = null; } }
    pAcc = 0;
    parC.x += (parT.x - parC.x) * .07; parC.y += (parT.y - parC.y) * .07;
    par.rotation.set(parC.x + (calm ? 0 : Math.sin(t * .9) * .025), parC.y + spin.v + (calm ? 0 : Math.sin(t * .6) * .08), 0);
    if (!busy) tilt.position.y = calm ? 0 : Math.sin(t * 1.4) * .025;
    if (!post) { aperGlowMat.opacity = fx.glow; aperHalo.material.opacity = .32 * fx.glow; }
    if (full) {
      camera.position.set(camOff.x, camOff.y, CAM_FULL + camOff.z);
      camera.lookAt(lookOff.x, lookOff.y, 0);
    }
    if (post) {
      bloomPass.strength = fx.bloom;
      grade.uniforms.uVig.value = fx.vig; grade.uniforms.uGrain.value = fx.grain; grade.uniforms.uTime.value = t % 10;
      floor.material.uniforms.color.value.setScalar(.1 * fx.floor);
      contact.material.opacity = .9 * fx.floor;
      contact.position.x = holder.position.x; contact.position.z = holder.position.z;
      aperGlowMat.opacity = fx.glow; aperHalo.material.opacity = .32 * fx.glow;
      scene.background = BG;
      composer.render(dt);
      scene.background = null;
    } else {
      renderer.render(scene, camera);
    }
  }
  // 뽑기 결과가 나온 뒤에도 마무리 연출(통이 패널로 돌아감) 동안은 화면을 덮고 있음
  // → 그동안이나 막 돌아온 직후(0.5초)의 탭은 새 뽑기로 치지 않음 (실수로 한 번 더 뽑히던 문제)
  let tapReadyAt = 0;
  const canTap = () => !busy && !outroP && !full && performance.now() >= tapReadyAt;
  const onCanvasClick = () => { if (canTap()) onTap?.(); };
  canvas.addEventListener('click', onCanvasClick);

  // 폰트가 늦게 오면 한자를 다시 그림
  document.fonts?.load(`700 80px ${SERIF}`).then(() => { remakeEmblem(); try { deco?.redrawFront(); } catch { /* noop */ } stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true)); }).catch(() => {});

  // 셰이더를 기다리는 동안 메인 스레드를 막지 않고 미리 준비 → 준비되면 ready
  const ready = (async () => {
    setStage(true);   // 전체 화면 무대 셰이더도 미리 준비 (첫 뽑기 때 멈칫 없게)
    const limit = new Promise((r) => setTimeout(r, 2500));   // 아이폰 홈 화면 앱에서 준비 완료 신호가 안 올 때 대비
    try { if (renderer.compileAsync) await Promise.race([renderer.compileAsync(scene, camera), limit]); else renderer.compile(scene, camera); } catch { /* noop */ }
    setStage(false);
  })();

  /** 칸이 화면에 보이게 된 직후 호출: 크기 맞추고 바로 그리기 시작 */
  function show() {
    visible = true; since = 1; resize();
    clock.getDelta();
    if (!raf && alive) raf = requestAnimationFrame(frame);
  }

  /** 새 페이지의 패널 칸으로 옮겨 붙이기 */
  function attach(el, o = {}) {
    if (slot && slot !== el) { ro.unobserve(slot); slot.classList.remove('omk-out'); }
    slot = el; onTap = o.onTap || null;
    slot.appendChild(canvas);
    listenAC?.abort();
    listenAC = new AbortController();
    const signal = listenAC.signal;
    slot.addEventListener('click', (e) => { if (e.target === slot && canTap()) onTap?.(); }, { signal });
    ro.observe(slot);
    full = false; layer.remove();
    resize();
    addEventListener('resize', resize, { signal });
    if (!calm) {
      addEventListener('pointermove', onPointer, { passive: true, signal });
      if (!tiltNeedsPermission) addEventListener('deviceorientation', onTilt, { passive: true, signal });
    }
    setKind(o.kind || 'food', true);
    clock.getDelta();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const play = (tl) => new Promise((ok) => { tl.eventCallback('onComplete', ok); });

  function resetStick() {
    gsap.killTweensOf([stick.position, stick.rotation, faceM, glowSpr.scale, glowSpr.material]);
    tilt.add(stick);
    stick.position.set(0, STICK_HOME, 0); stick.rotation.set(0, 0, 0); stick.scale.setScalar(1);
    for (const m of new Set(stickMats)) m.opacity = 1;
    faceM.emissiveIntensity = 0; glowSpr.material.opacity = 0; glowSpr.scale.setScalar(.01);
  }

  function resetFx() {
    gsap.killTweensOf([strokeLight, strokeLight.position, fx, camOff, lookOff, flash, holder.position, holder.scale, holder.rotation, aperCover.scale, aperCover.rotation, typeEl]);
    strokeLight.intensity = 0;
    Object.assign(fx, { bloom: 0, vig: 0, grain: 0, floor: 0, glow: 0 });
    camOff.set(0, 0, 0); lookOff.set(0, 0, 0);
    holder.rotation.set(0, 0, 0);
    aperCover.scale.setScalar(1); aperCover.rotation.set(0, 0, 0);
    typeEl.style.opacity = '0'; typeEl.style.transform = '';
    postOff();
    flash.style.opacity = '0';
  }

  /** 뽑기: task(Promise를 돌려주는 함수)를 실행하면서 연출. 번호가 번쩍하는 순간 task 결과로 resolve (실패면 reject) */
  let outroP = null;   // 마무리(통이 패널로 돌아감) 진행 중 → 다음 뽑기는 끝날 때까지 기다림 (화면 전환이 겹치지 않게)
  function draw(task, o = {}) {
    if (busy) return busy;
    busy = (async () => {
      if (outroP) await outroP;
      return calm ? calmRun(task) : fullRun(task, o.label);
    })().finally(() => { busy = null; });
    return busy;
  }

  async function calmRun(task) {
    num = 1 + (Math.random() * 99 | 0); stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true));
    const job = Promise.resolve().then(task);
    const up = gsap.timeline();
    up.to(stick.position, { y: H / 2 + .35 - SL / 2, duration: .7, ease: 'sine.out' }, 0)
      .to(faceM, { emissiveIntensity: 1.2, duration: .7 }, 0)
      .to(fx, { glow: .8, duration: .7 }, 0);
    try {
      const [r] = await Promise.all([job, play(up)]);
      return r;
    } finally {
      gsap.timeline().to(stick.position, { y: STICK_HOME, duration: .6, ease: 'sine.inOut', delay: .4 }, 0)
        .to(faceM, { emissiveIntensity: 0, duration: .6, delay: .4 }, 0)
        .to(fx, { glow: 0, duration: .6, delay: .4 }, 0);
    }
  }

  // 막 뒤 배경이 완전히 덮인 순간 후처리 무대로 전환 (막과 무대 배경색이 같아 이음매 없음)
  function postOn() { post = true; setStage(true); composer.setSize(layer.clientWidth || innerWidth, layer.clientHeight || innerHeight); }
  function postOff() { post = false; setStage(false); }

  // 결과 글 채우기
  function fillType() {
    const t = wLabel || {};
    typeEl.querySelector('.omk-kicker').textContent = `第${kanjiNum(num)}番 · ${K.glyph}`;
    typeEl.querySelector('.omk-title').textContent = t.title || '';
    typeEl.querySelector('.omk-sub').textContent = t.sub || '';
    typeEl.classList.toggle('no-title', !t.title);
  }

  // 화면이 차분히 어두워짐 → 통이 가운데에서 천천히 돌아 3/4 각도에 멈춤 → 추출구가 열리며 안쪽 빛이 새어 나옴
  // → 막대가 중력 없이 떠오르고 카메라가 따라 올라감 → 막대가 눈높이로 미끄러져 옴 → 번호 위를 빛이 한 번 지나감 → 정적 속 타이포그래피
  // 흔들기·튀어나옴·폭발 없음. 무게감 있는 ease(power2/3.inOut, sine)만 사용
  async function fullRun(task, label) {
    num = 1 + (Math.random() * 99 | 0); stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true));
    let done = false;
    const job = Promise.resolve().then(task);
    job.then(() => { done = true; }, () => { done = true; });
    parT.x = parT.y = 0;
    camOff.set(0, 0, 0); lookOff.set(0, 0, 0);
    holdStages(true);
    goFull();
    gsap.set(back, { opacity: 0 }); gsap.set(typeEl, { opacity: 0, y: 10 });

    // 1) 어두워지고, 통이 무대 가운데로 와서 천천히 돌아 멈춤 (카메라는 조용히 다가감)
    const a = gsap.timeline();
    a.to(back, { opacity: 1, duration: .4, ease: 'power1.inOut' }, 0)
      .call(postOn, null, .41)
      .to(fx, { bloom: .12, vig: .8, grain: .025, floor: 1, duration: .8, ease: 'power2.out' }, .41)
      .to(holder.position, { x: 0, y: .13, z: 0, duration: .9, ease: 'power3.inOut' }, 0)
      .to(holder.scale, { x: 1, y: 1, z: 1, duration: .9, ease: 'power3.inOut' }, 0)
      .to(holder.rotation, { y: -.42, duration: 1.3, ease: 'power2.inOut' }, .15)
      .to(camOff, { y: .45, z: -1.7, duration: 1.4, ease: 'power2.inOut' }, .1)
      .to(lookOff, { y: .2, duration: 1.4, ease: 'power2.inOut' }, .1)
      .to(fx, { glow: .35, duration: .8, ease: 'sine.inOut' }, .7);   // 안쪽에서 빛이 먼저 은은하게
    skipped = false; skipEl.hidden = false;
    curTl = a;
    await play(a);

    // 2) 응답을 기다리는 동안: 안쪽 빛만 천천히 숨 쉼 (흔들림 없음)
    while (!done && !skipped) {
      const w = gsap.timeline();
      curTl = w;
      w.to(fx, { glow: .6, duration: .7, ease: 'sine.inOut' }).to(fx, { glow: .35, duration: .7, ease: 'sine.inOut' });
      await play(w);
    }
    let result;
    try { result = await job; }
    catch (e) { skipEl.hidden = true; curTl = null; await outro(false, skipped); throw e; }

    try { wLabel = label ? label(result) : null; } catch { wLabel = null; }
    fillType();

    // 3) 추출구가 열리고(조리개처럼 돌며 접힘) → 막대가 떠오름 → 카메라가 따라감 → 눈높이로
    const HERO = { cy: 1.55, cz: -2.4, ly: 1.42 };   // 막대를 볼 때 카메라 자리
    const heroPos = (d) => {   // 그 카메라에서 앞으로 d만큼 (번호가 화면 위쪽 3분의 1에 오게 조금 올림)
      const from = new THREE.Vector3(0, HERO.cy, CAM_FULL + HERO.cz), to = new THREE.Vector3(0, HERO.ly, 0);
      const p = from.clone().add(to.sub(from).normalize().multiplyScalar(d));
      p.y += -NUM_Y + .2; return p;
    };
    const b = gsap.timeline();
    curTl = b;
    if (skipped) b.timeScale(2.5);   // 막대가 나오기 전에 건너뛰기: 막대가 빠져나와 번호·결과 글씨가 뜨는 장면을 2.5배속으로 (약 1.3초) — 6배속은 너무 빨라 그냥 끝난 것처럼 보였음
    b.call(() => buzz(8), null, 0)
      .to(aperCover.rotation, { y: Math.PI * .5, duration: .5, ease: 'power2.inOut' }, 0)
      .to(aperCover.scale, { x: .001, y: 1, z: .001, duration: .5, ease: 'power2.inOut' }, 0)
      .to(fx, { glow: 1, duration: .6, ease: 'sine.out' }, .1)
      // 떠오름: 끝이 먼저 빛 속에서 나오고, 천천히 돌며 완전히 빠져나옴
      .to(stick.position, { y: STICK_HOME + SL + .12, duration: 1.5, ease: 'sine.inOut' }, .3)
      .to(stick.rotation, { y: -1.1, duration: 1.5, ease: 'sine.inOut' }, .3)
      .to(camOff, { y: HERO.cy, z: HERO.cz, duration: 1.9, ease: 'power2.inOut' }, .35)
      .to(lookOff, { y: HERO.ly, duration: 1.9, ease: 'power2.inOut' }, .35)
      .to(holder.rotation, { y: -.62, duration: 2.6, ease: 'sine.inOut' }, .3)
      .to(fx, { glow: .45, duration: .8, ease: 'sine.inOut' }, 1.4)
      // 눈높이로 미끄러져 옴: 번호 면이 카메라를 향하고, 아주 살짝 비스듬히 (두께가 읽히게)
      .call(() => scene.attach(stick), null, 1.55)
      .to(stick.position, { x: () => heroPos(2.7).x, y: () => heroPos(2.7).y, z: () => heroPos(2.7).z, duration: 1, ease: 'power3.inOut' }, 1.56)
      .to(stick.rotation, { x: -.12, y: .2, z: -.025, duration: 1, ease: 'power3.inOut' }, 1.56)
      // 번호 위를 빛이 한 번 지나감 (짧고 정교하게)
      .call(() => { glowSpr.getWorldPosition(tmpV); strokeLight.position.set(tmpV.x + .32, tmpV.y + .38, tmpV.z + .42); }, null, 2.45)
      .to(strokeLight.position, { x: () => tmpV.x - .32, y: () => tmpV.y - .3, duration: .55, ease: 'power2.inOut' }, 2.46)
      .to(strokeLight, { intensity: 1.6, duration: .16, ease: 'power2.out' }, 2.46)
      .to(strokeLight, { intensity: 0, duration: .36, ease: 'power2.in' }, 2.65)
      .to(faceM, { emissiveIntensity: .55, duration: .18, ease: 'power2.out' }, 2.52)
      .to(faceM, { emissiveIntensity: .22, duration: .6, ease: 'power2.inOut' }, 2.72)
      .to(fx, { bloom: .17, duration: .18, ease: 'power2.out' }, 2.52)
      .to(fx, { bloom: .12, duration: .6, ease: 'power2.inOut' }, 2.72)
      .call(() => buzz([0, 12]), null, 2.55)
      // 정적 속에 결과 글
      .to(typeEl, { opacity: 1, y: 0, duration: .6, ease: 'power2.out' }, 2.7);
    await play(b);
    skipEl.hidden = true; curTl = null;
    outroP = outro(true, skipped).finally(() => { outroP = null; });
    return result;
  }

  // 마무리: 잠깐 머문 뒤 글이 사라지고, 막대는 위로 흐려지며, 무대 불이 꺼진 뒤 통이 패널 제자리로 돌아감
  function outro(picked, fast = false) {
    const c = gsap.timeline();
    if (fast) c.timeScale(1.8);   // 건너뛰기: 마무리도 빠르게
    const off = picked ? (fast ? 1.7 : 1.3) : 0;   // 결과 글씨 읽을 시간 (빠른 마무리는 1.8배속이라 실제 약 0.9초)   // 결과를 읽을 시간 (그동안 아래 패널엔 결과 카드가 이미 그려져 있음)
    if (picked) {
      c.to(typeEl, { opacity: 0, y: -6, duration: .45, ease: 'power2.in' }, off - .4)
        .to([...new Set(stickMats)], { opacity: 0, duration: .5, ease: 'power1.in' }, off - .35)
        .to(stick.position, { y: '+=.25', duration: .6, ease: 'power2.in' }, off - .35);
    }
    c.to(flash, { opacity: 0, duration: .2 }, 0)
      .to(fx, { bloom: 0, vig: 0, grain: 0, floor: 0, glow: 0, duration: .45, ease: 'power1.inOut' }, off)
      .to(camOff, { x: 0, y: 0, z: 0, duration: .55, ease: 'power2.inOut' }, off)
      .to(lookOff, { x: 0, y: 0, duration: .55, ease: 'power2.inOut' }, off)
      .to(holder.rotation, { y: 0, duration: .55, ease: 'power2.inOut' }, off)
      .to(aperCover.scale, { x: 1, z: 1, duration: .4, ease: 'power2.inOut' }, off)
      .to(aperCover.rotation, { y: 0, duration: .4, ease: 'power2.inOut' }, off)
      .call(postOff, null, off + .56)
      .to(back, { opacity: 0, duration: .4, ease: 'power1.inOut' }, off + .56)
      .add(() => {
        const p = slotPose();
        gsap.to(holder.position, { x: p.x, y: p.y, z: 0, duration: .5, ease: 'power3.inOut' });
        gsap.to(holder.scale, { x: p.s, y: p.s, z: p.s, duration: .5, ease: 'power3.inOut' });
      }, off + .56)
      .to({}, { duration: .52 }, off + .56);
    return play(c).then(() => { resetStick(); resetFx(); goPanel(); holdStages(false); tapReadyAt = performance.now() + 500; });
  }

  // 페이지 들어올 때: 통이 제자리에서 한 바퀴 휙 돌며 食·祭·遊와 띠 색이 바뀜
  function setKind(k, enter = false) {
    if (!KINDS[k]) return;
    const changed = KINDS[k] !== K;
    K = KINDS[k];
    if (changed) remakeEmblem();
    if (!calm && (changed || enter)) { gsap.killTweensOf(spin); spin.v = -Math.PI * 2; gsap.to(spin, { v: 0, duration: 1.1, ease: 'power3.out', delay: .15 }); }
  }

  function destroy() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf); raf = 0; ro.disconnect();
    listenAC?.abort(); listenAC = null;
    canvas.removeEventListener('click', onCanvasClick);
    removeEventListener('resize', resize);
    gsap.killTweensOf([spin, back, flash]);
    layer.remove();
    if (busy || outroP) holdStages(false);
    strokeLight.dispose?.();
    scene.traverse((o) => { o.geometry?.dispose?.(); for (const m of [].concat(o.material || [])) m.dispose?.(); });
    for (const tx of [lacquerTex, glyphTex, medNormal, medRough, stickTex, stickGlow, glowTex, fadeTex, shadowTex]) tx.dispose();   // 게이트 후광·보케·입자는 glowTex를 같이 씀
    floor.dispose?.();          // 반사 바닥의 렌더 타깃·재질
    deco?.dispose(); petals?.dispose();
    composer.dispose?.();       // 후처리 렌더 타깃
    bloomPass.dispose?.(); grade.dispose?.();
    envRT.dispose();
    renderer.dispose(); renderer.forceContextLoss?.();
    canvas.remove();
  }

  // 디자인 확인용: 주소에 ?omkpreview=1&ang=-0.5 → 애니메이션 없이 무대 위 제품 컷 (개발자만 쓰는 용도)
  function _preview() {
    const q = new URLSearchParams(location.search), ang = parseFloat(q.get('ang') || '-.42');
    holdStages(true); goFull(); back.style.opacity = '1'; postOn();
    Object.assign(fx, { bloom: .12, vig: .7, grain: .02, floor: 1, glow: 0 });
    holder.position.set(0, .13, 0); holder.scale.setScalar(1);
    gsap.killTweensOf(spin); spin.v = ang;
    camOff.set(0, parseFloat(q.get('cy') || '.55'), parseFloat(q.get('cz') || '-2.6')); lookOff.set(0, .05, 0);
    busy = Promise.resolve();   // 시선 따라 기울기 끔
  }
  if (/[?&]omkpreview=1/.test(location.search)) ready.then(() => setTimeout(_preview, 200));

  return { draw, setKind, attach, show, destroy, ready, calm, get alive() { return alive; }, get slot() { return slot; } };
}
