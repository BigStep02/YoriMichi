// 축제 목록·상세·주변 맛집·로그인 공용 3D 배경
// <canvas id="hanabi-stage" data-scene="yatai|shrine|alley|river"> 를 찾아서 그 무대를 띄움
import { createHanabiStage, webglAvailable } from './hanabi/hanabi-stage.js';

const canvas = document.getElementById('hanabi-stage');
let stage = null;
let pendingGlyph = null;

if (canvas && webglAvailable() && window.gsap) {
  document.body.classList.add('hanabi-bg');
  requestAnimationFrame(() => setTimeout(startStage, 0));
}

function startStage() {
  try {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // ?scene=ema 처럼 주소로 무대를 바꿔서 미리 볼 수 있음 (디자인 확인용)
    const override = new URLSearchParams(location.search).get('scene');
    const SCENES = ['street', 'yatai', 'shrine', 'alley', 'river', 'ema', 'goldfish', 'moon'];
    const scene = SCENES.includes(override) ? override : (canvas.dataset.scene || 'street');
    stage = createHanabiStage(canvas, { scene, lite: true, calm });
    if (canvas.dataset.glyph) setTimeout(() => stage.introGlyph(canvas.dataset.glyph), 800);
    if (pendingGlyph) { stage.introGlyph(pendingGlyph); pendingGlyph = null; }
    onScroll();
  } catch (e) {
    console.warn('3D 배경을 켤 수 없어요', e);
  }
}

// 다른 스크립트가 하늘에 글자를 쓰고 싶을 때 (예: 축제 상세 → 축제 이름)
window.addEventListener('yori:glyph', (e) => {
  if (!e.detail) return;
  if (stage) stage.introGlyph(e.detail); else pendingGlyph = e.detail;
});

// 스크롤하면 헤더에 유리 배경
// 스크롤하면 헤더에 유리 배경 + 카메라가 무대 안쪽으로 걸어 들어감 (신사: 도리이를 하나씩 통과)
const header = document.getElementById('app-header');
const onScroll = () => {
  header?.classList.toggle('scrolled', scrollY > 20);
  const max = document.documentElement.scrollHeight - innerHeight;
  if (stage && max > 0) stage.setScroll(scrollY / max);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
