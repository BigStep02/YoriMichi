// 공통 헤더: 서비스명 + 로그인 상태
import { api, getToken, clearToken } from './api.js';
import { esc, icons } from './icons.js';
import { setDev } from './mock.js';
import { OMAMORI } from './saved.js';

export const APP_NAME = 'YoriMichi';

export async function renderHeader() {
  const el = document.getElementById('app-header');
  if (!el) return;
  el.className = 'app-header';
  el.innerHTML = `<a class="brand" href="/">${esc(APP_NAME)}<small lang="ja">よりみち</small></a><div class="user"></div>`;
  const userBox = el.querySelector('.user');

  const loginLink = () => {
    userBox.innerHTML = `<a class="icon-btn" href="/login.html" aria-label="로그인" title="로그인">${icons.user('icon icon-lg')}</a>`;
  };

  if (!getToken()) { setDev(false); return loginLink(); }

  try {
    const me = await api('/api/users/me');
    setDev(!!me.developer);
    userBox.innerHTML = `<a class="icon-btn saved-link" href="/saved.html" aria-label="저장함 縁帳" title="저장함">${OMAMORI}</a>
      <span class="nick">${esc(me.nickname)}</span>님
      <button type="button" class="link-btn" data-logout>로그아웃</button>`;
    userBox.querySelector('[data-logout]').addEventListener('click', () => {
      clearToken();
      setDev(false);
      location.href = '/';
    });
  } catch {
    // 토큰 만료(401 → api.js에서 삭제) 또는 서버 오류
    if (!getToken()) setDev(false);
    loginLink();
  }
}
