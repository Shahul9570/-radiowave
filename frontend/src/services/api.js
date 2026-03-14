const envUrl = process.env.REACT_APP_API_URL || '';
export const BASE_URL = envUrl;

export const WS_URL = BASE_URL
  ? BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws')
  : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

function getToken() { return localStorage.getItem('rw_token'); }

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  signup:              (d)  => req('POST',   '/auth/signup',      d,    false),
  login:               (d)  => req('POST',   '/auth/login',       d,    false),
  getMe:               ()   => req('GET',    '/auth/me'),
  searchUsers:         (q)  => req('GET',    `/users/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest:   (id) => req('POST',   '/friends/request',  { target_id: id }),
  acceptFriendRequest: (id) => req('POST',   '/friends/accept',   { target_id: id }),
  rejectFriendRequest: (id) => req('POST',   '/friends/reject',   { target_id: id }),
  getFriends:          ()   => req('GET',    '/friends/'),
  getPending:          ()   => req('GET',    '/friends/pending'),
  removeFriend:        (id) => req('DELETE', `/friends/${id}`),
};