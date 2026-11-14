// 공통 헤더: 서비스명 + 로그인 상태
import { api, getToken, clearToken } from './api.js';
import { esc } from './icons.js';

export const APP_NAME = 'YoriMichi';

export async function renderHeader() {
  const el = document.getElementById('app-header');
  if (!el) return;
  el.className = 'app-header';
  el.innerHTML = `<a class="brand" href="/">${esc(APP_NAME)}</a><div class="user"></div>`;
  const userBox = el.querySelector('.user');

  const loginLink = () => {
    userBox.innerHTML = `<a class="link-btn" href="/login.html">로그인</a>`;
  };

  if (!getToken()) return loginLink();

  try {
    const me = await api('/api/users/me');
    userBox.innerHTML = `<span class="nick">${esc(me.nickname)}</span>님
      <button type="button" class="link-btn" data-logout>로그아웃</button>`;
    userBox.querySelector('[data-logout]').addEventListener('click', () => {
      clearToken();
      location.href = '/';
    });
  } catch {
    // 토큰 만료(401 → api.js에서 삭제) 또는 서버 오류
    loginLink();
  }
}
