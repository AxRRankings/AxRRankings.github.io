// small shared UI pieces: icons + nav
export const ICONS = {
  sword: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3c3 0 5-2 5-5A10 10 0 0 0 12 2z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  frame: '<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  trophy: '<path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4M6 3h12v7a6 6 0 0 1-12 0V3zM12 16v3M8 21h8"/>',
  chart: '<path d="M3 3v18h18M7 14l4-4 3 3 5-6"/>',
  bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
};
export const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

export function navHTML({ links = true, right = '' } = {}) {
  return `<header class="nav"><div class="wrap">
    <a class="logo" href="/"><i><svg viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/></svg></i>AxR<b>CARDS</b></a>
    ${links ? `<nav class="nav-links"><a href="/rankings">Rankings</a><a href="/#features">Features</a><a href="/#gallery">Gallery</a><a href="/#how">How it works</a><a href="/#faq">FAQ</a></nav>` : ''}
    <div class="nav-right" id="navright">${right}</div>
  </div></header>`;
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// shows Login or the user chip in the nav
export async function fillNavUser() {
  const el = document.getElementById('navright');
  try {
    const r = await fetch('/api/me');
    if (!r.ok) throw 0;
    const m = await r.json();
    el.innerHTML = `<a class="btn sm" href="/editor">Editor</a><span class="who">${m.data?.avatarUrl ? `<img src="${esc(m.data.avatarUrl)}" alt="">` : ''}${esc(m.user.username)}</span><a class="btn sm ghost" href="/api/auth/logout">Logout</a>`;
    return m;
  } catch {
    el.innerHTML = `<a class="btn sm primary" href="/api/auth/login">Login with Discord</a>`;
    return null;
  }
}
