// 오미쿠지 통 겉면의 금 마키에 무늬 + 주변에 흩날리는 벚꽃잎
// 무늬는 이미지 없이 캔버스에 코드로 그림 (흰색 = 금박, 검정 = 옻칠이 보이는 곳)
//   정면: 도리이·시메나와·「おみくじ」 액자·벚꽃·청해파 (가운데 食/祭/遊 메달리온 자리는 비움)
//   옆면: 마엽(麻の葉)·구름·벚꽃 가지·청해파 / 뚜껑: 청해파·벚꽃 (추출구 자리는 비움)
// 같은 캔버스로 금박 모양(alphaMap)과 살짝 도드라진 요철(normalMap)을 함께 만듦
import * as THREE from 'three';

const TAU = Math.PI * 2;

// ── 무늬 조각 ──
function petalPath(g, r) {   // 끝이 살짝 갈라진 벚꽃잎 하나 (가운데 → 위쪽 -y 방향)
  g.beginPath();
  g.moveTo(0, -r * .12);
  g.bezierCurveTo(-r * .55, -r * .3, -r * .55, -r * .88, -r * .2, -r);
  g.lineTo(0, -r * .82);
  g.lineTo(r * .2, -r);
  g.bezierCurveTo(r * .55, -r * .88, r * .55, -r * .3, 0, -r * .12);
  g.closePath();
}
function sakura(g, x, y, r, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineJoin = 'round';
  for (let i = 0; i < 5; i++) {
    g.save(); g.rotate(i * TAU / 5);
    petalPath(g, r);
    g.fillStyle = '#fff'; g.fill();
    g.strokeStyle = '#000'; g.lineWidth = Math.max(1, r * .08); g.stroke();
    g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, -r * .6); g.lineWidth = Math.max(.8, r * .05); g.stroke();
    g.restore();
  }
  g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = Math.max(.8, r * .045);
  for (let i = 0; i < 10; i++) {
    const a = i * TAU / 10 + .3, cx = Math.cos(a), cy = Math.sin(a);
    g.beginPath(); g.moveTo(cx * r * .08, cy * r * .08); g.lineTo(cx * r * .32, cy * r * .32); g.stroke();
    g.beginPath(); g.arc(cx * r * .36, cy * r * .36, r * .05, 0, TAU); g.fill();
  }
  g.restore();
}
function loosePetal(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1.15, 1); g.translate(0, r * .56);
  petalPath(g, r); g.fillStyle = '#fff'; g.fill();
  g.restore();
}
function bud(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = Math.max(1, r * .18);
  g.beginPath(); g.ellipse(0, -r * .4, r * .62, r, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-r * .5, r * .3); g.lineTo(0, r * 1.1); g.lineTo(r * .5, r * .3); g.fill();
  g.restore();
}
const bez = (p0, p1, p2, p3, n = 24) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return o;
};
function branch(g, pts, w0, w1) {   // 굵은 쪽에서 가는 쪽으로
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    g.lineWidth = w0 + (w1 - w0) * i / Math.max(1, pts.length - 2);
    g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.stroke();
  }
}
// 청해파(青海波): 위쪽 반원 동심원을 비늘처럼 겹침. path(g)로 만든 모양 안에만
function seigaiha(g, x0, y0, x1, y1, r, path) {
  g.save();
  path(g); g.clip();
  const lw = Math.max(1, r * .08);
  for (let row = 0, y = y0; y <= y1 + r; row++, y += r * .5) {
    const off = (row % 2) * r;
    for (let x = x0 - r * 2 + off; x <= x1 + r * 2; x += r * 2) {
      g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = lw;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x, y, r * (.9 - k * .22), Math.PI, 0); g.stroke(); }
    }
  }
  g.restore();
  g.save(); path(g); g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, r * .14); g.stroke(); g.restore();
}
// 마엽(麻の葉): 정삼각형 격자 + 각 삼각형 중심에서 꼭짓점으로
function asanoha(g, W, H, s, lw) {
  const h = s * Math.sqrt(3) / 2, P = (a, b) => [a * s + b * s / 2, b * h];
  const bMax = Math.ceil(H / h) + 1, aMin = -Math.ceil(bMax / 2) - 2, aMax = Math.ceil(W / s) + 2;
  g.strokeStyle = '#fff'; g.lineWidth = lw; g.beginPath();
  for (let b = -1; b <= bMax; b++) for (let a = aMin; a <= aMax; a++) {
    for (const tri of [[P(a, b), P(a + 1, b), P(a, b + 1)], [P(a + 1, b), P(a + 1, b + 1), P(a, b + 1)]]) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      for (const p of tri) { g.moveTo(cx, cy); g.lineTo(...p); }
    }
  }
  g.stroke();
}
function cloud(g, x, y, s, flip) {   // 끝이 말린 구름 띠 두 줄
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = .15;
  g.beginPath(); g.moveTo(-1, 0); g.lineTo(.45, 0); g.arc(.45, -.24, .24, Math.PI / 2, -Math.PI / 2, true); g.lineTo(.1, -.48); g.stroke();
  g.beginPath(); g.moveTo(-.55, .42); g.lineTo(.95, .42); g.stroke();
  g.restore();
}
function torii(g, cx, top, w) {
  g.save(); g.translate(cx, top); g.scale(w, w); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(-.52, -.03); g.quadraticCurveTo(0, .06, .52, -.03); g.lineTo(.48, .07); g.quadraticCurveTo(0, .13, -.48, .07); g.closePath(); g.fill();   // 笠木
  g.fillRect(-.42, .1, .84, .045);    // 島木
  g.fillRect(-.035, .14, .07, .11);   // 額束
  g.fillRect(-.45, .25, .9, .05);     // 貫
  for (const s of [-1, 1]) {          // 기둥: 아래로 살짝 벌어짐
    g.beginPath(); g.moveTo(s * .24, .14); g.lineTo(s * .3, .14); g.lineTo(s * .33, .75); g.lineTo(s * .23, .75); g.closePath(); g.fill();
  }
  g.restore();
}
function shimenawa(g, x0, x1, y, sag, th) {
  const pt = (t) => [x0 + (x1 - x0) * t, y + sag * 4 * t * (1 - t)];
  g.strokeStyle = '#fff'; g.lineWidth = th; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i <= 40; i++) { const [x, yy] = pt(i / 40); i ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
  g.strokeStyle = '#000'; g.lineWidth = Math.max(1, th * .14);
  for (let i = 1; i < 30; i++) { const [x, yy] = pt(i / 30); g.beginPath(); g.moveTo(x - th * .28, yy - th * .42); g.lineTo(x + th * .28, yy + th * .42); g.stroke(); }
  g.fillStyle = '#fff';
  for (const t of [.12, .3, .7, .88]) {   // 시데(紙垂): 지그재그 종이
    const [x, yy] = pt(t), s = th * 1.2;
    for (let k = 0; k < 4; k++) g.fillRect(x + (k % 2 ? .05 : -.45) * s, yy + th * .5 + k * s * .5, s * .4, s * .42);
  }
}
function cartouchePath(g, cx, y0, y1, w, inset) {
  const hw = w / 2 - inset, a = y0 + inset, b = y1 - inset, c = w * .22;
  g.beginPath();
  g.moveTo(cx, a);
  g.bezierCurveTo(cx + hw * .3, a + c * .05, cx + hw * .4, a + c * .7, cx + hw, a + c);
  g.lineTo(cx + hw, b - c);
  g.bezierCurveTo(cx + hw * .4, b - c * .7, cx + hw * .3, b - c * .05, cx, b);
  g.bezierCurveTo(cx - hw * .3, b - c * .05, cx - hw * .4, b - c * .7, cx - hw, b - c);
  g.lineTo(cx - hw, a + c);
  g.bezierCurveTo(cx - hw * .4, a + c * .7, cx - hw * .3, a + c * .05, cx, a);
  g.closePath();
}
function frame(g, W, H) {
  g.strokeStyle = '#fff'; g.lineWidth = W * .012;
  const i = W * .022; g.strokeRect(i, i, W - 2 * i, H - 2 * i);
}

// ── 면별 그림 ──
function drawFront(g, W, H, o) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  // 아래 청해파: 가운데가 낮아 메달리온을 피함
  seigaiha(g, 0, H * .74, W, H, W * .07, (c) => {
    c.beginPath(); c.moveTo(-4, H + 4); c.lineTo(-4, H * .78);
    c.bezierCurveTo(W * .18, H * .76, W * .3, H * .87, W * .5, H * .875);
    c.bezierCurveTo(W * .7, H * .87, W * .82, H * .76, W + 4, H * .78);
    c.lineTo(W + 4, H + 4); c.closePath();
  });
  // 양옆 벚꽃 가지
  for (const s of [1, -1]) {
    const X = (x) => (s > 0 ? x : W - x);
    const B = bez([X(W * .0), H * .58], [X(W * .16), H * .5], [X(W * .04), H * .34], [X(W * .2), H * .22]);
    branch(g, B, W * .022, W * .007);
    sakura(g, X(W * .15), H * (s > 0 ? .26 : .3), W * .075, s > 0 ? .2 : .9);
    sakura(g, X(W * .08), H * (s > 0 ? .37 : .41), W * .058, 1.1);
    sakura(g, X(W * .16), H * (s > 0 ? .48 : .52), W * .066, .6);
    bud(g, X(W * .21), H * .2, W * .022, s * -.5);
    bud(g, X(W * .05), H * .5, W * .02, s * .7);
    sakura(g, X(W * .13), H * (s > 0 ? .69 : .73), W * .05, .4);
  }
  for (const [x, y, r] of [[.27, .64, .3], [.76, .17, 1.4], [.71, .66, 2.2], [.3, .1, 4], [.82, .6, 5.1], [.2, .79, 1]]) loosePetal(g, W * x, H * y, W * .022, r);
  // 메달리온 자리: 비우고 금 테 두 줄
  const my = H * o.med.f, mr = o.med.r;
  g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, my, mr * 1.34, 0, TAU); g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = W * .009; g.beginPath(); g.arc(W / 2, my, mr * 1.12, 0, TAU); g.stroke();
  g.lineWidth = W * .004; g.beginPath(); g.arc(W / 2, my, mr * 1.26, 0, TAU); g.stroke();
  // 「おみくじ」 액자
  const y0 = H * .215, y1 = H * .585, cw = W * .4;
  cartouchePath(g, W / 2, y0, y1, cw, 0); g.fillStyle = '#000'; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = W * .014; g.stroke();
  cartouchePath(g, W / 2, y0, y1, cw, W * .028); g.lineWidth = W * .005; g.stroke();
  const fs = W * .14, step = fs * 1.14, mid = (y0 + y1) / 2;
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${fs}px ${o.serif}`;
  [...'おみくじ'].forEach((ch, i) => g.fillText(ch, W / 2, mid + (i - 1.5) * step));
  // 도리이 + 시메나와
  torii(g, W / 2, H * .062, W * .4);
  shimenawa(g, W * .07, W * .93, H * .118, H * .026, W * .026);
  frame(g, W, H);
  // 아래 작은 붉은 인장 자리
  const sy = H * o.seal.f, sr = o.seal.r;
  g.fillStyle = '#000'; g.fillRect(W / 2 - sr * 1.4, sy - sr * 1.4, sr * 2.8, sr * 2.8);
}

function drawSide(g, W, H) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const top = (c) => { c.beginPath(); c.moveTo(-4, -4); c.lineTo(W + 4, -4); c.lineTo(W + 4, H * .08); c.bezierCurveTo(W * .7, H * .12, W * .35, H * .3, -4, H * .34); c.closePath(); };
  g.save(); top(g); g.clip(); asanoha(g, W, H * .36, W * .12, Math.max(1.2, W * .0045)); g.restore();
  g.save(); top(g); g.strokeStyle = '#fff'; g.lineWidth = W * .01; g.stroke(); g.restore();
  cloud(g, W * .72, H * .3, W * .16, false);
  cloud(g, W * .2, H * .45, W * .11, true);
  const B = bez([W * .02, H * .88], [W * .36, H * .72], [W * .28, H * .5], [W * .78, H * .38]);
  branch(g, B, W * .032, W * .008);
  const B2 = bez(B[10], [W * .5, H * .64], [W * .72, H * .62], [W * .92, H * .54], 14);
  branch(g, B2, W * .016, W * .005);
  sakura(g, ...B[7], W * .085, .3);
  sakura(g, ...B[15], W * .07, 1.2);
  sakura(g, ...B[21], W * .075, .7);
  bud(g, ...B[24], W * .024, .9);
  sakura(g, ...B2[8], W * .06, 2);
  sakura(g, ...B2[14], W * .065, .1);
  sakura(g, W * .14, H * .6, W * .055, 1.6);
  sakura(g, W * .56, H * .48, W * .05, .9);
  for (const [x, y, r] of [[.4, .3, .5], [.86, .44, 2], [.66, .74, 3.3], [.12, .7, 1.2], [.9, .2, 4]]) loosePetal(g, W * x, H * y, W * .022, r);
  seigaiha(g, 0, H * .7, W, H, W * .075, (c) => {
    c.beginPath(); c.moveTo(-4, H + 4); c.lineTo(-4, H * .9);
    c.bezierCurveTo(W * .3, H * .9, W * .55, H * .74, W + 4, H * .72);
    c.lineTo(W + 4, H + 4); c.closePath();
  });
  frame(g, W, H);
}

function drawLid(g, S, o) {
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const c = S / 2, r = o.lidR * o.lidPx;
  const hex = (k) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = c + Math.cos(a) * r * k, y = c + Math.sin(a) * r * k; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  g.save(); hex(1); g.clip();
  seigaiha(g, 0, c + r * .4, S, S, S * .045, (q) => { q.beginPath(); q.moveTo(-4, S + 4); q.lineTo(-4, c + r * .62); q.bezierCurveTo(c - r * .4, c + r * .45, c + r * .3, c + r * .66, S + 4, c + r * .5); q.lineTo(S + 4, S + 4); q.closePath(); });
  seigaiha(g, 0, 0, S, c - r * .4, S * .04, (q) => { q.beginPath(); q.moveTo(-4, -4); q.lineTo(S + 4, -4); q.lineTo(S + 4, c - r * .62); q.bezierCurveTo(c + r * .4, c - r * .48, c - r * .3, c - r * .68, -4, c - r * .56); q.closePath(); });
  sakura(g, c - r * .64, c - r * .06, S * .055, .3);
  sakura(g, c + r * .64, c + r * .08, S * .05, 1);
  sakura(g, c - r * .42, c + r * .3, S * .036, 2);
  sakura(g, c + r * .44, c - r * .3, S * .04, .7);
  loosePetal(g, c + r * .2, c - r * .5, S * .016, 1); loosePetal(g, c - r * .25, c + r * .5, S * .016, 3);
  g.fillStyle = '#000'; g.beginPath(); g.arc(c, c, o.aperR * o.lidPx, 0, TAU); g.fill();
  g.restore();
  hex(.97); g.strokeStyle = '#fff'; g.lineWidth = S * .012; g.stroke();
}

// 흑백 무늬 → 살짝 번진 높이맵 → 노멀맵 (금박이 옻칠 위로 도드라져 보임)
function writeNormal(src, dst, strength) {
  const w = src.width, h = src.height;
  const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
  const hg = hc.getContext('2d', { willReadFrequently: true });
  hg.filter = 'blur(1.3px)'; hg.drawImage(src, 0, 0); hg.filter = 'none';
  const sd = hg.getImageData(0, 0, w, h).data;
  const dg = dst.getContext('2d'), out = dg.createImageData(w, h), d = out.data;
  const Hh = (x, y) => sd[((y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (Hh(x + 1, y - 1) + 2 * Hh(x + 1, y) + Hh(x + 1, y + 1)) - (Hh(x - 1, y - 1) + 2 * Hh(x - 1, y) + Hh(x - 1, y + 1));
    const dy = (Hh(x - 1, y + 1) + 2 * Hh(x, y + 1) + Hh(x + 1, y + 1)) - (Hh(x - 1, y - 1) + 2 * Hh(x, y - 1) + Hh(x + 1, y - 1));
    const nx = -dx * strength, ny = dy * strength, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
    d[i] = (nx / l * .5 + .5) * 255; d[i + 1] = (ny / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  dg.putImageData(out, 0, 0);
}
function texSet(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const nc = document.createElement('canvas'); nc.width = w; nc.height = h;
  const mask = new THREE.CanvasTexture(c), normal = new THREE.CanvasTexture(nc);
  mask.anisotropy = normal.anisotropy = 4;
  const redraw = () => {
    g.save(); draw(g, w, h); g.restore();
    writeNormal(c, nc, 1.3);
    mask.needsUpdate = true; normal.needsUpdate = true;
  };
  redraw();
  return { mask, normal, redraw, dispose() { mask.dispose(); normal.dispose(); } };
}

/**
 * o: { W, H: 면 캔버스 크기(면 비율과 같게), serif, med: { f: 메달리온 중심(위에서 비율), r: 반지름 px }, seal: { f, r },
 *      lidPx: 뚜껑 무늬 1단위당 px, lidR: 뚜껑 윗면 육각 외접 반지름, aperR: 추출구 비울 반지름 }
 */
export function makeDeco(o) {
  const front = texSet(o.W, o.H, (g, w, h) => drawFront(g, w, h, o));
  const side = texSet(o.W, o.H, (g, w, h) => drawSide(g, w, h));
  const lid = texSet(512, 512, (g, s) => drawLid(g, s, o));
  return {
    front, side, lid,
    redrawFront: () => front.redraw(),   // 명조 폰트가 늦게 오면 「おみくじ」를 다시 그림
    dispose() { front.dispose(); side.dispose(); lid.dispose(); },
  };
}

// ── 흩날리는 벚꽃잎: 한 번의 그리기(InstancedMesh)로 수십 장 ──
export function makePetals(count = 40) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 58, 2, 32, 34, 34);
  gr.addColorStop(0, '#FFF6F8'); gr.addColorStop(.55, '#FBD9E1'); gr.addColorStop(1, '#F1B3C3');
  g.translate(32, 32 + 30 * .52); g.scale(1.25, 1);
  petalPath(g, 30); g.fillStyle = gr; g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(.08, .08);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6, side: THREE.DoubleSide, alphaTest: .35, emissive: '#FFFFFF', emissiveMap: tex, emissiveIntensity: .3 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const rnd = Math.random, P = [];
  const spawn = (p, top) => {
    p.x = (rnd() - .5) * 2.6 - (top ? .3 : 0); p.z = (rnd() - .5) * 1.8;
    p.y = top ? 1.9 + rnd() * .5 : -1.1 + rnd() * 3.2;
    p.vy = .15 + rnd() * .15; p.ph = rnd() * TAU; p.f = .6 + rnd() * .9;
    p.rx = (rnd() - .5) * 3; p.ry = (rnd() - .5) * 3; p.rz = (rnd() - .5) * 2; p.s = .7 + rnd() * .6;
    return p;
  };
  for (let i = 0; i < count; i++) P.push(spawn({}, false));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3();
  let t = 0;
  function step(dt) {
    t += dt;
    for (let i = 0; i < count; i++) {
      const p = P[i];
      p.y -= p.vy * dt;
      p.x += (Math.sin(t * p.f + p.ph) * .14 + .05) * dt;   // 바람에 살랑이며 오른쪽으로 조금씩
      p.z += Math.cos(t * p.f * .7 + p.ph) * .05 * dt;
      if (p.y < -1.15 || p.x > 1.7) spawn(p, true);
      e.set(t * p.rx + p.ph, t * p.ry, t * p.rz + p.ph); q.setFromEuler(e);
      m.compose(v.set(p.x, p.y, p.z), q, sv.setScalar(p.s)); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  step(0);
  return { mesh, step, dispose() { tex.dispose(); geo.dispose(); mat.dispose(); } };
}
