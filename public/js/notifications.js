// public/js/notifications.js
(function () {
  const wrap = document.getElementById('notifBellWrap');
  const btn = document.getElementById('notifBellBtn');
  const badge = document.getElementById('notifBellBadge');
  const panel = document.getElementById('notifPanel');
  const panelBody = document.getElementById('notifPanelBody');
  const panelClose = document.getElementById('notifPanelClose');
  const markAllBtn = document.getElementById('notifMarkAllBtn');
  if (!wrap || !btn || !panel) return;

  const UNREAD_POLL_MS = 30 * 1000; // 30 s
  let open = false;

  // ---- helpers ----
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  async function fetchUnreadCount() {
    try {
      const r = await fetch('/api/notifications/unread-count', { headers: { Accept: 'application/json' } });
      const d = await r.json();
      if (!d.ok) return;
      updateBadge(d.count);
    } catch (_) { /* ignore */ }
  }

  function updateBadge(n) {
    if (!badge) return;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  async function fetchList() {
    panelBody.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const r = await fetch('/api/notifications', { headers: { Accept: 'application/json' } });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Failed');
      renderList(d.notifications || []);
    } catch (err) {
      panelBody.innerHTML = `<p class="muted">Failed to load: ${esc(err.message)}</p>`;
    }
  }

  function renderList(items) {
    if (!items.length) {
      panelBody.innerHTML = '<p class="muted">No notifications.</p>';
      return;
    }
    panelBody.innerHTML = items.map((n) => `
      <div class="notif-mini ${n.status === 'unread' ? 'unread' : ''}" data-id="${n._id}">
        <div class="notif-mini-icon type-${esc(n.type)}">
          ${n.type === 'flood_warning' ? '🌊' : n.type === 'route_warning' ? '🧭' : 'ℹ️'}
        </div>
        <div class="notif-mini-body">
          <div class="notif-mini-title">${esc(n.title)}</div>
          <div class="notif-mini-msg">${esc(n.message)}</div>
          <div class="notif-mini-time">${esc(fmt(n.created_at))}</div>
        </div>
        <button type="button" class="notif-mini-read" data-id="${n._id}" title="Mark read">✓</button>
      </div>
    `).join('');

    panelBody.querySelectorAll('.notif-mini-read').forEach((b) => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        await markRead(b.dataset.id);
      });
    });
  }

  async function markRead(id) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    await Promise.all([fetchUnreadCount(), fetchList()]);
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    await Promise.all([fetchUnreadCount(), fetchList()]);
  }

  // ---- open / close ----
  function openPanel() {
    open = true;
    panel.style.display = '';
    fetchList();
  }
  function closePanel() {
    open = false;
    panel.style.display = 'none';
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open) closePanel(); else openPanel();
  });
  if (panelClose) panelClose.addEventListener('click', closePanel);
  if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (open && !wrap.contains(e.target)) closePanel();
  });

  // ---- init ----
  fetchUnreadCount();
  setInterval(fetchUnreadCount, UNREAD_POLL_MS);
})();