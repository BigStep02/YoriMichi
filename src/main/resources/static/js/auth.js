// U-01 회원가입 / U-02 로그인
import { api, setToken } from './api.js';
import { renderHeader } from './header.js';
import { icons } from './icons.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const tabs = {
  login: { tab: document.getElementById('tab-login'), form: document.getElementById('form-login') },
  signup: { tab: document.getElementById('tab-signup'), form: document.getElementById('form-signup') },
};

function selectTab(name) {
  Object.entries(tabs).forEach(([key, { tab, form }]) => {
    const on = key === name;
    tab.setAttribute('aria-selected', String(on));
    form.hidden = !on;
  });
  history.replaceState(null, '', name === 'signup' ? '#signup' : '#login');
}

tabs.login.tab.addEventListener('click', () => selectTab('login'));
tabs.signup.tab.addEventListener('click', () => selectTab('signup'));
if (location.hash === '#signup') selectTab('signup');

function bind(form, path, validate) {
  const errorEl = form.querySelector('.form-error');
  const submit = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const body = Object.fromEntries(new FormData(form));
    body.email = body.email.trim();
    if (body.nickname !== undefined) body.nickname = body.nickname.trim();

    const clientError = validate(body);
    if (clientError) {
      errorEl.textContent = clientError;
      return;
    }

    submit.disabled = true;
    try {
      const { token } = await api(path, { method: 'POST', body, auth: false });
      setToken(token);
      location.href = '/';
    } catch (err) {
      // 서버 메시지(409 중복, 400 검증, 401 실패)를 그대로 표시
      errorEl.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });
}

const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

bind(tabs.login.form, '/api/auth/login', ({ email, password }) => {
  if (!email || !password) return '이메일과 비밀번호를 입력해 주세요.';
  return null;
});

bind(tabs.signup.form, '/api/auth/signup', ({ email, password, nickname }) => {
  if (!emailOk(email)) return '이메일 형식을 확인해 주세요.';
  if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.';
  if (!nickname) return '닉네임을 입력해 주세요.';
  return null;
});
