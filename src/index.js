const SESSION_COOKIE = 'siyasa_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function cookieHeader(value, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64ToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function derivePassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, material, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return `v1.${bytesToBase64(salt)}.${bytesToBase64(hash)}`;
}

async function verifyPassword(password, encoded) {
  const [, saltValue, hashValue] = encoded.split('.');
  if (!saltValue || !hashValue) return false;
  const expected = base64ToBytes(hashValue);
  const actual = await derivePassword(password, base64ToBytes(saltValue));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  actual.forEach((byte, index) => { difference |= byte ^ expected[index]; });
  return difference === 0;
}

async function signSession(payload, secret) {
  const data = bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${bytesToBase64(new Uint8Array(signature))}`;
}

async function readSession(request, secret) {
  const cookie = request.headers.get('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!cookie) return null;
  const [data, signature] = cookie.split('.');
  if (!data || !signature) return null;
  const expected = await signSession(JSON.parse(new TextDecoder().decode(base64ToBytes(data))), secret);
  if (expected.split('.')[1] !== signature) return null;
  const payload = JSON.parse(new TextDecoder().decode(base64ToBytes(data)));
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

function validCredentials(username, password) {
  return typeof username === 'string' && username.length >= 3 && username.length <= 32 && /^[\p{L}\p{N}_.-]+$/u.test(username)
    && typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

async function handleApi(request, env, url) {
  if (!env.DB || !env.SESSION_SECRET) return json({ error: 'إعدادات الخادم غير مكتملة.' }, 500);
  if (url.pathname === '/api/me' && request.method === 'GET') {
    const session = await readSession(request, env.SESSION_SECRET);
    return json({ user: session ? { username: session.username } : null });
  }
  if (url.pathname === '/api/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
  }
  if (!['/api/signup', '/api/login'].includes(url.pathname) || request.method !== 'POST') return json({ error: 'المسار غير موجود.' }, 404);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'الطلب غير صالح.' }, 400); }
  const username = body.username?.trim();
  const { password } = body;
  if (!validCredentials(username, password)) return json({ error: 'اسم المستخدم أو كلمة المرور غير صالحين.' }, 400);

  if (url.pathname === '/api/signup') {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) return json({ error: 'اسم المستخدم مستخدم بالفعل.' }, 409);
    await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').bind(username, await hashPassword(password)).run();
  }
  const user = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').bind(username).first();
  if (!user || (url.pathname === '/api/login' && !(await verifyPassword(password, user.password_hash)))) return json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحين.' }, 401);
  const session = await signSession({ id: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }, env.SESSION_SECRET);
  return json({ user: { username: user.username } }, 200, { 'set-cookie': cookieHeader(session) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};