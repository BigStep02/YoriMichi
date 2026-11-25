// 옻칠 오미쿠지 통 — 주변 맛집·축제·놀거리 뽑기 패널 3D 연출 (Three.js + GSAP)
// 대기: 패널 안 작은 통이 숨 쉬듯 흔들리고 금가루가 떠오름. 마우스·폰 기울기를 따라 살짝 기울며 옻칠·금박 반사가 바뀜
// 뽑기: 통이 화면 가운데로 떠오름 → 묵직하게 두 번 흔들림 → (응답 기다리는 동안 덜그럭) → 윗구멍이 카메라를 향해 기울고
//       → 막대가 툭 빠져나와 눈앞까지 다가옴 → 번호가 번쩍 → 결과
// 동작 줄이기: 패널 안에서 막대가 천천히 올라오며 빛남 (이동·흔들림·회전·줌 없음)
// 사용: const omk = mountOmikuji(slotEl, { kind: 'food'|'fest'|'spot', calm, onTap });  await omk.draw(task)
import * as THREE from 'three';
import { holdStages } from '../hanabi/hanabi-stage.js';

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const KINDS = {
  food: { glyph: '食', band: '#C8301E', glow: '#FF7A55' },
  fest: { glyph: '祭', band: '#D9A12A', glow: '#FFD27A' },
  spot: { glyph: '遊', band: '#178C6A', glow: '#7FE0C0' },
};
const SERIF = '"Zen Old Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';
const NUMS = '〇一二三四五六七八九';
const kanjiNum = (n) => { const t = Math.floor(n / 10), o = n % 10; return (t ? (t > 1 ? NUMS[t] : '') + '十' : '') + (o ? NUMS[o] : ''); };

const R = .62, H = 1.7, SEG = 6, T0 = Math.PI / 6;      // 6각 통 (T0: 평평한 면이 정면을 보게)
const APO = R * Math.cos(Math.PI / 6);                  // 정면 면까지 거리
const SL = 1.55, SW = .085, ST = .03;                   // 막대 길이·폭·두께
const STICK_HOME = H / 2 - .05 - SL / 2;                // 통 안에 숨은 위치
const NUM_Y = SL / 2 - .28;                             // 막대 위 '第○番' 글씨 가운데 (막대 기준)
const CAM_PANEL = 4.4, CAM_FULL = 9, FOV = 30;
const TAN = Math.tan(FOV / 2 * Math.PI / 180);

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

// 금박·옻칠이 비칠 가짜 주변광: 따뜻한 소프트박스 + 붉은 띠 + 금색 바닥 반사
function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: '#07060C', side: THREE.BackSide })));
  const card = (c, k, pos, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  card('#FFDDB0', 4, [-2.6, 2.8, 3.2], [2.6, 1.1]);
  card('#FF3A22', 2.6, [3.6, .8, 1.6], [1, 4.2]);
  card('#F2C14E', 1.6, [0, -3.2, 2.2], [5, .5]);
  card('#5A68A8', .7, [-4, 0, -2], [1.4, 4]);
  const rt = pm.fromScene(s, .035);
  pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

export function mountOmikuji(slot, opts = {}) {
  const gsap = window.gsap;
  const calm = !!opts.calm;
  let K = KINDS[opts.kind] || KINDS.food;
  const buzz = (p) => { if (calm) return; try { navigator.vibrate?.(p); } catch { /* noop */ } };

  // ── DOM: 패널 칸 안 canvas + 뽑을 때 쓰는 전체 화면 막 ──
  const canvas = document.createElement('canvas');
  canvas.className = 'omk-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  slot.appendChild(canvas);
  const layer = document.createElement('div');
  layer.className = 'omk-layer';
  layer.innerHTML = '<div class="omk-back"></div><div class="omk-flash"></div>';
  const back = layer.firstElementChild, flash = layer.lastElementChild;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const envRT = makeEnv(renderer);
  scene.environment = envRT.texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 50);

  // 빛: 먹색 공간에 붉은 스포트라이트 하나 + 약한 키·림
  scene.add(new THREE.AmbientLight('#2A1E2A', .5));
  const key = new THREE.DirectionalLight('#FFE6C4', 1.2); key.position.set(-2, 3, 4); scene.add(key);
  const spot = new THREE.SpotLight('#FF3B26', 26, 16, .42, .75, 1.3); spot.position.set(1.8, 4.2, 3.6); scene.add(spot);
  const rim = new THREE.PointLight('#F2C14E', 5, 7, 2); rim.position.set(-.4, 1.6, -2.2); scene.add(rim);

  // ── 통 ──
  const holder = new THREE.Group();    // 패널 ↔ 화면 가운데 이동·크기
  const par = new THREE.Group();       // 시선 따라 기울기·회전
  const tilt = new THREE.Group();      // 흔들기·기울이기
  holder.add(par); par.add(tilt); scene.add(holder);
  spot.target = holder;

  const lacquerTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0D0A0C'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {   // 옻칠 아래 비치는 붓결
      g.fillStyle = `rgba(${70 + Math.random() * 50 | 0},${16 + Math.random() * 12 | 0},14,${.03 + Math.random() * .06})`;
      g.fillRect(Math.random() * w, 0, 1 + Math.random() * 2.5, h);
    }
  });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', map: lacquerTex, roughness: .34, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .9 });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#E7B64A', metalness: .92, roughness: .26, clearcoat: .35, envMapIntensity: 1.5 });
  const bandMat = new THREE.MeshPhysicalMaterial({ color: K.band, roughness: .5, sheen: 1, sheenColor: new THREE.Color(K.band), sheenRoughness: .35, clearcoat: .25, envMapIntensity: .6 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, SEG, 1, false, T0), lacquer);
  tilt.add(body);
  for (const y of [H / 2 - .03, -H / 2 + .03]) {   // 위·아래 금테
    const rimG = new THREE.Mesh(new THREE.CylinderGeometry(R + .012, R + .012, .05, SEG, 1, true, T0), gold);
    rimG.position.y = y; tilt.add(rimG);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + .007, R + .007, .2, SEG, 1, true, T0), bandMat);
  band.position.y = .5; tilt.add(band);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000000' }));
  hole.position.y = H / 2 + .002; tilt.add(hole);
  const holeRing = new THREE.Mesh(new THREE.RingGeometry(.1, .14, 32).rotateX(-Math.PI / 2), gold);
  holeRing.position.y = H / 2 + .003; tilt.add(holeRing);

  // 금박 한자: 글자만 금속, 금박이 군데군데 벗겨진 듯한 자국
  const drawGlyph = (g, w, h) => {
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${w * .74}px ${SERIF}`; g.fillText(K.glyph, w / 2, h * .53);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) { g.globalAlpha = .25 + Math.random() * .5; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, .6 + Math.random() * 2.2, 0, 6.29); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  };
  const glyphTex = canvasTex(512, 512, drawGlyph);
  const glyphMat = gold.clone();
  Object.assign(glyphMat, { map: glyphTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, envMapIntensity: 2.4, roughness: .3 });
  glyphMat.emissive = new THREE.Color('#7A4E10'); glyphMat.emissiveMap = glyphTex; glyphMat.emissiveIntensity = .55;   // 어두운 패널에서도 금박이 읽히게
  const glyph = new THREE.Mesh(new THREE.PlaneGeometry(.66, .66), glyphMat);
  glyph.position.set(0, -.12, APO + .003); tilt.add(glyph);

  // ── 막대: 히노키색 나무, 끝은 붉은 칠, 앞면에 '第○番' 먹글씨 ──
  let num = 1;
  const drawStick = (ink) => (g, w, h) => {
    if (ink) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
    else {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#D9BE8C'); gr.addColorStop(.5, '#F0DCB2'); gr.addColorStop(1, '#D6B884');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,80,40,${.05 + Math.random() * .08})`; g.lineWidth = 1; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - .5) * 6, h); g.stroke(); }
      g.fillStyle = '#B8281A'; g.fillRect(0, 0, w, h * .055);
    }
    const chars = ['第', ...kanjiNum(num), '番'];
    g.fillStyle = ink ? '#FFFFFF' : '#1A0E08'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${w * .8}px ${SERIF}`;
    chars.forEach((c, i) => g.fillText(c, w / 2, h * .1 + i * w * .92));
  };
  const stickTex = canvasTex(128, 2304, drawStick(false));
  const stickGlow = canvasTex(128, 2304, drawStick(true));
  const wood = new THREE.MeshStandardMaterial({ color: '#E2C796', roughness: .7, transparent: true });
  const tipM = new THREE.MeshStandardMaterial({ color: '#B8281A', roughness: .5, transparent: true });
  const faceM = new THREE.MeshStandardMaterial({ map: stickTex, roughness: .65, emissive: new THREE.Color(K.glow), emissiveMap: stickGlow, emissiveIntensity: 0, transparent: true });
  const stickMats = [wood, wood, tipM, wood, faceM, wood];
  const stick = new THREE.Mesh(new THREE.BoxGeometry(SW, SL, ST), stickMats);
  stick.position.y = STICK_HOME; tilt.add(stick);

  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,240,210,.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: K.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glowSpr.position.set(0, NUM_Y, .05); glowSpr.scale.setScalar(.01); stick.add(glowSpr);

  // ── 금가루: 통 주변에서 천천히 떠오름 ──
  const ND = 26, dPos = new Float32Array(ND * 3), dSpd = new Float32Array(ND);
  const seedDust = (i, y) => { const a = Math.random() * 6.283, r = .75 + Math.random() * .45; dPos.set([Math.cos(a) * r, y ?? (-H / 2 + Math.random() * .3), Math.sin(a) * r * .6], i * 3); dSpd[i] = .08 + Math.random() * .16; };
  for (let i = 0; i < ND; i++) seedDust(i, -H / 2 + Math.random() * (H + .6));
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: glowTex, color: '#F2C14E', size: .07, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  par.add(dust);

  // ── 화면 모드 ──
  let full = false;
  function resize() {
    const host = full ? layer : slot;
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
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
    full = true; layer.appendChild(canvas); layer.insertBefore(canvas, flash); resize();
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
  if (!calm) {
    addEventListener('pointermove', (e) => { if (busy) return; parT.y = (e.clientX / innerWidth - .5) * .34; parT.x = (e.clientY / innerHeight - .5) * .22; }, { passive: true });
    addEventListener('deviceorientation', (e) => { if (busy || e.gamma == null) return; parT.y = Math.max(-1, Math.min(1, e.gamma / 30)) * .17; parT.x = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * .11; }, { passive: true });
  }

  // ── 그리기 ──
  let visible = true, alive = true, raf = 0, t = 0;
  const spin = { v: calm ? 0 : -Math.PI * 2 };
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '80px' });
  io.observe(slot);
  const clock = new THREE.Clock();
  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!slot.isConnected) { destroy(); return; }
    const dt = Math.min(clock.getDelta(), .05);
    if (document.hidden || (!visible && !busy)) return;
    t += dt;
    parC.x += (parT.x - parC.x) * .07; parC.y += (parT.y - parC.y) * .07;
    par.rotation.set(parC.x + (calm ? 0 : Math.sin(t * .9) * .025), parC.y + spin.v + (calm ? 0 : Math.sin(t * .6) * .08), 0);
    if (!busy) tilt.position.y = calm ? 0 : Math.sin(t * 1.4) * .025;
    for (let i = 0; i < ND; i++) {
      dPos[i * 3 + 1] += dSpd[i] * dt * (busy ? 2.2 : 1);
      dPos[i * 3] += Math.sin(t + i) * .0006;
      if (dPos[i * 3 + 1] > H / 2 + .7) seedDust(i);
    }
    dGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  resize();
  raf = requestAnimationFrame(frame);
  addEventListener('resize', resize);
  // 페이지 들어올 때: 통이 제자리에서 한 바퀴 휙 돌며 자리 잡음
  if (!calm) gsap.to(spin, { v: 0, duration: 1.1, ease: 'power3.out', delay: .15 });
  canvas.addEventListener('click', () => { if (!busy) opts.onTap?.(); });
  slot.addEventListener('click', (e) => { if (e.target === slot && !busy) opts.onTap?.(); });

  // 폰트가 늦게 오면 한자를 다시 그림
  document.fonts?.load(`900 80px ${SERIF}`).then(() => { glyphTex.redraw(drawGlyph); stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true)); }).catch(() => {});

  const play = (tl) => new Promise((ok) => { tl.eventCallback('onComplete', ok); });

  function resetStick() {
    gsap.killTweensOf([stick.position, stick.rotation, faceM, glowSpr.scale, glowSpr.material]);
    tilt.add(stick);
    stick.position.set(0, STICK_HOME, 0); stick.rotation.set(0, 0, 0); stick.scale.setScalar(1);
    for (const m of new Set(stickMats)) m.opacity = 1;
    faceM.emissiveIntensity = 0; glowSpr.material.opacity = 0; glowSpr.scale.setScalar(.01);
  }

  /** 뽑기: task(Promise를 돌려주는 함수)를 실행하면서 연출. 번호가 번쩍하는 순간 task 결과로 resolve (실패면 reject) */
  function draw(task) {
    if (busy) return busy;
    busy = (calm ? calmRun(task) : fullRun(task)).finally(() => { busy = null; });
    return busy;
  }

  async function calmRun(task) {
    num = 1 + (Math.random() * 99 | 0); stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true));
    const job = Promise.resolve().then(task);
    const up = gsap.timeline();
    up.to(stick.position, { y: H / 2 + .35 - SL / 2, duration: .7, ease: 'sine.out' }, 0)
      .to(faceM, { emissiveIntensity: 1.2, duration: .7 }, 0)
      .to(spot, { intensity: 40, duration: .7 }, 0);
    try {
      const [r] = await Promise.all([job, play(up)]);
      return r;
    } finally {
      gsap.timeline().to(stick.position, { y: STICK_HOME, duration: .6, ease: 'sine.inOut', delay: .4 }, 0)
        .to(faceM, { emissiveIntensity: 0, duration: .6, delay: .4 }, 0)
        .to(spot, { intensity: 26, duration: .6, delay: .4 }, 0);
    }
  }

  async function fullRun(task) {
    num = 1 + (Math.random() * 99 | 0); stickTex.redraw(drawStick(false)); stickGlow.redraw(drawStick(true));
    let done = false;
    const job = Promise.resolve().then(task);
    job.then(() => { done = true; }, () => { done = true; });
    parT.x = parT.y = 0;
    holdStages(true);
    goFull();
    gsap.set(back, { opacity: 0 });

    // 1) 화면 가운데로 떠오름 + 묵직하게 두 번 흔들기
    const a = gsap.timeline();
    a.to(back, { opacity: 1, duration: .3, ease: 'power1.out' }, 0)
      .to(holder.position, { x: 0, y: .15, z: 0, duration: .42, ease: 'power3.out' }, 0)
      .to(holder.scale, { x: 1, y: 1, z: 1, duration: .42, ease: 'power3.out' }, 0)
      .call(() => buzz([30, 50, 30]), null, .28)
      .to(tilt.rotation, { keyframes: [{ z: .3, duration: .09 }, { z: -.26, duration: .11 }, { z: .2, duration: .1 }, { z: -.1, duration: .08 }, { z: 0, duration: .07 }], ease: 'power1.inOut' }, .28)
      .to(tilt.position, { keyframes: [{ y: .12, duration: .1 }, { y: -.04, duration: .12 }, { y: .07, duration: .1 }, { y: 0, duration: .13 }] }, .28);
    await play(a);

    // 2) 응답이 아직이면 덜그럭거리며 기다림
    while (!done) {
      buzz(12);
      const w = gsap.timeline();
      w.to(tilt.rotation, { z: .07, duration: .07, yoyo: true, repeat: 3, ease: 'sine.inOut' })
        .to(tilt.rotation, { z: 0, duration: .05 }).to({}, { duration: .12 });
      await play(w);
    }

    let result;
    try { result = await job; }
    catch (e) { await outro(false); throw e; }

    // 3) 윗구멍이 카메라를 향해 기울고 → 막대가 툭 → 눈앞까지
    const camZ = CAM_FULL, camY = 0;
    const b = gsap.timeline();
    b.to(tilt.rotation, { x: 1.2, z: 0, duration: .26, ease: 'power2.in' }, 0)
      .to(tilt.position, { y: .3, z: .7, duration: .26, ease: 'power2.out' }, 0)
      .to(stick.position, { y: H / 2 + .45 - SL / 2, duration: .1, ease: 'power2.out' }, .24)
      .call(() => { buzz(90); scene.attach(stick); }, null, .34)
      .to(stick.position, { x: 0, y: camY - NUM_Y, z: camZ - 1.35, duration: .46, ease: 'expo.out' }, .34)
      .to(stick.rotation, { x: 0, y: 0, z: -.05, duration: .46, ease: 'power3.out' }, .34)
      .to(holder.position, { y: -.6, z: -1.2, duration: .5, ease: 'power2.out' }, .34)
      // 4) 번호가 번쩍
      .to(faceM, { emissiveIntensity: 2.6, duration: .16, ease: 'power2.in' }, .66)
      .to(glowSpr.material, { opacity: 1, duration: .16 }, .66)
      .to(glowSpr.scale, { x: .9, y: .9, z: .9, duration: .2, ease: 'power2.out' }, .66)
      .to(flash, { opacity: .85, duration: .12, ease: 'power2.in' }, .7);
    await play(b);
    outro(true);
    return result;
  }

  // 마무리: 하얀 빛이 걷히며 통이 패널 제자리로 돌아감
  function outro(picked) {
    const p = slotPose();
    const c = gsap.timeline();
    if (picked) c.to(flash, { opacity: 0, duration: .5, ease: 'power1.out' }, 0).to(stickMats.filter((m, i, a) => a.indexOf(m) === i), { opacity: 0, duration: .22 }, 0);
    c.to(back, { opacity: 0, duration: .4, ease: 'power1.inOut' }, picked ? .05 : 0)
      .to(tilt.rotation, { x: 0, z: 0, duration: .4, ease: 'power2.inOut' }, 0)
      .to(tilt.position, { y: 0, z: 0, duration: .4, ease: 'power2.inOut' }, 0)
      .to(holder.position, { x: p.x, y: p.y, z: 0, duration: .45, ease: 'power3.inOut' }, .05)
      .to(holder.scale, { x: p.s, y: p.s, z: p.s, duration: .45, ease: 'power3.inOut' }, .05);
    return play(c).then(() => { resetStick(); goPanel(); holdStages(false); });
  }

  function setKind(k) {
    if (!KINDS[k] || KINDS[k] === K) return;
    K = KINDS[k];
    bandMat.color.set(K.band); bandMat.sheenColor.set(K.band); faceM.emissive.set(K.glow); glowSpr.material.color.set(K.glow);
    glyphTex.redraw(drawGlyph);
    if (!calm) { spin.v = -Math.PI * 2; gsap.to(spin, { v: 0, duration: 1, ease: 'power3.out' }); }
  }

  function destroy() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf); io.disconnect();
    removeEventListener('resize', resize);
    layer.remove();
    if (busy) holdStages(false);
    scene.traverse((o) => { o.geometry?.dispose?.(); for (const m of [].concat(o.material || [])) m.dispose?.(); });
    for (const tx of [lacquerTex, glyphTex, stickTex, stickGlow, glowTex]) tx.dispose();
    envRT.dispose();
    renderer.dispose(); renderer.forceContextLoss?.();
    canvas.remove();
  }

  return { draw, setKind, destroy, get alive() { return alive; } };
}
