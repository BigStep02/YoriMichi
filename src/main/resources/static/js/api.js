// fetch 래퍼: 토큰 자동 첨부, JSON 에러 → Error, 401 → 토큰 삭제
const TOKEN_KEY = 'token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* 저장 불가 환경 */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {string} path  '/api/...' 상대 경로
 * @param {{method?: string, body?: any, auth?: boolean}} options auth=false면 토큰 미첨부
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해 주세요.', 0, 'NETWORK');
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const message = data?.message || `요청에 실패했어요 (${res.status})`;
    throw new ApiError(message, res.status, data?.code);
  }
  return data;
}
