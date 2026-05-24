(function () {
  const config = window.FOREVER_FORWARD_CONFIG || {};
  const ENDPOINT = config.speakingFormEndpoint || "";
  const TOKEN_KEY = "ff_admin_token";

  let authToken = localStorage.getItem(TOKEN_KEY) || "";
  let clientsCache = [];
  let inquiriesCache = [];
  let activeView = "overview";
  let clientFilter = "";
  let clientSort = "recent";
  let lastAuthError = "";

  const authSection = document.getElementById("adminAuth");
  const dashboardSection = document.getElementById("adminDashboard");
  const authForm = document.getElementById("authForm");
  const authPassword = document.getElementById("authPassword");
  const authStatus = document.getElementById("authStatus");
  const clientList = document.getElementById("clientList");
  const inquiryList = document.getElementById("inquiryList");
  const signOutBtn = document.getElementById("signOutBtn");

  const sidebar = document.getElementById("adminSidebar");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const adminApp = document.getElementById("adminDashboard");
  const topbarEyebrow = document.getElementById("topbarEyebrow");
  const topbarTitle = document.getElementById("topbarTitle");
  const topbarActions = document.getElementById("topbarActions");
  const navClientsBadge = document.getElementById("navClientsBadge");
  const navInquiriesBadge = document.getElementById("navInquiriesBadge");
  const recentSessions = document.getElementById("recentSessions");
  const recentInquiries = document.getElementById("recentInquiries");
  const clientSearchInput = document.getElementById("clientSearch");
  const clientSortSelect = document.getElementById("clientSort");

  const VIEW_META = {
    overview: { eyebrow: "Dashboard", title: "Overview" },
    clients: { eyebrow: "Roster", title: "Clients" },
    inquiries: { eyebrow: "Inbox", title: "Speaking Inquiries" },
    tools: { eyebrow: "Shortcuts", title: "Quick Tools" }
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(s) {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function daysAgo(s) {
    if (!s) return Infinity;
    const d = new Date(s);
    if (isNaN(d.getTime())) return Infinity;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  async function apiPost(action, body) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({}, body || {}, { action: action, token: authToken }))
    });
    if (!res.ok) return { success: false, error: "Network error" };
    return res.json().catch(() => ({ success: false, error: "Bad response" }));
  }

  async function apiGet(action) {
    const url = ENDPOINT + "?action=" + encodeURIComponent(action) + "&token=" + encodeURIComponent(authToken);
    const res = await fetch(url);
    if (!res.ok) return { success: false, error: "Network error" };
    return res.json().catch(() => ({ success: false, error: "Bad response" }));
  }

  async function tryAuth(password) {
    authToken = password;
    const result = await apiGet("clients");
    if (result && result.success) {
      localStorage.setItem(TOKEN_KEY, password);
      clientsCache = result.clients || [];
      lastAuthError = "";
      return true;
    }
    lastAuthError = (result && result.error) || "";
    authToken = "";
    localStorage.removeItem(TOKEN_KEY);
    return false;
  }

  function showDashboard() {
    authSection.hidden = true;
    dashboardSection.hidden = false;
    setActiveView(activeView || "overview");
    renderClients();
    renderOverview();
    loadInquiries();
  }

  function showAuth() {
    authSection.hidden = false;
    dashboardSection.hidden = true;
  }

  function signOut() {
    authToken = "";
    localStorage.removeItem(TOKEN_KEY);
    clientsCache = [];
    inquiriesCache = [];
    activeView = "overview";
    showAuth();
  }

  // ---------- View routing ----------
  function setActiveView(view) {
    activeView = view;
    document.querySelectorAll(".sidebar-link[data-view]").forEach(function (el) {
      el.classList.toggle("is-active", el.dataset.view === view);
    });
    document.querySelectorAll(".admin-view").forEach(function (el) {
      el.classList.toggle("is-active", el.dataset.view === view);
    });
    const meta = VIEW_META[view] || { eyebrow: "Dashboard", title: "" };
    topbarEyebrow.textContent = meta.eyebrow;
    topbarTitle.textContent = meta.title;
    renderTopbarActions(view);
    closeMobileSidebar();
  }

  function renderTopbarActions(view) {
    topbarActions.innerHTML = "";
    if (view === "clients") {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-primary";
      add.textContent = "+ Add Client";
      add.addEventListener("click", openAddClient);
      topbarActions.appendChild(add);
    } else if (view === "inquiries") {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.className = "button button-secondary";
      refresh.textContent = "Refresh";
      refresh.addEventListener("click", function () {
        inquiryList.innerHTML = '<p class="muted-note">Refreshing…</p>';
        loadInquiries();
      });
      topbarActions.appendChild(refresh);
    } else if (view === "overview") {
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.className = "button button-secondary";
      refresh.textContent = "Refresh";
      refresh.addEventListener("click", async function () {
        await Promise.all([loadClients(), loadInquiries()]);
      });
      topbarActions.appendChild(refresh);
    }
  }

  // ---------- Mobile drawer ----------
  function openMobileSidebar() {
    adminApp.classList.add("sidebar-open");
    if (sidebarBackdrop) sidebarBackdrop.hidden = false;
  }
  function closeMobileSidebar() {
    adminApp.classList.remove("sidebar-open");
    if (sidebarBackdrop) sidebarBackdrop.hidden = true;
  }

  // ---------- Data loading ----------
  async function loadClients() {
    const result = await apiGet("clients");
    if (!result.success) {
      clientList.innerHTML = '<p class="muted-note">Could not load clients.</p>';
      return;
    }
    clientsCache = result.clients || [];
    renderClients();
    renderOverview();
  }

  async function loadInquiries() {
    const result = await apiGet("inquiries");
    if (!result.success) {
      inquiryList.innerHTML = '<p class="muted-note">Could not load inquiries.</p>';
      inquiriesCache = [];
      renderOverview();
      return;
    }
    inquiriesCache = result.inquiries || [];
    renderInquiries();
    renderOverview();
  }

  // ---------- Overview ----------
  function renderOverview() {
    const totalSessions = clientsCache.reduce(function (sum, c) {
      return sum + ((c.sessions && c.sessions.length) || c.completed || 0);
    }, 0);
    const totalRemaining = clientsCache.reduce(function (sum, c) {
      return sum + Math.max(0, Number(c.remaining) || 0);
    }, 0);
    const activeClients = clientsCache.filter(function (c) {
      return (Number(c.remaining) || 0) > 0;
    }).length;

    const sessionsLast7 = clientsCache.reduce(function (sum, c) {
      const ss = c.sessions || [];
      return sum + ss.filter(function (s) { return daysAgo(s.date) <= 7; }).length;
    }, 0);

    const inquiriesLast30 = inquiriesCache.filter(function (i) {
      return daysAgo(i.date) <= 30;
    }).length;

    setMetric("metricActiveClients", activeClients, clientsCache.length + " total in roster");
    setMetric("metricSessionsTotal", totalSessions, sessionsLast7 + " in the last 7 days");
    setMetric("metricRemaining", totalRemaining, "Across all active clients");
    setMetric("metricInquiries", inquiriesCache.length, inquiriesLast30 + " in the last 30 days");

    // sidebar badges
    if (navClientsBadge) {
      const n = clientsCache.length;
      navClientsBadge.textContent = n;
      navClientsBadge.hidden = n === 0;
    }
    if (navInquiriesBadge) {
      const n = inquiriesCache.length;
      navInquiriesBadge.textContent = n;
      navInquiriesBadge.hidden = n === 0;
    }

    renderRecentSessions();
    renderRecentInquiries();
  }

  function setMetric(id, value, sub) {
    const v = document.getElementById(id);
    if (v) v.textContent = value;
    const s = document.getElementById(id + "Sub");
    if (s) s.textContent = sub || "";
    // metrics 2-4 use different sub ids — match by convention
    const fallback = document.getElementById(
      id === "metricSessionsTotal" ? "metricSessionsSub" :
      id === "metricRemaining" ? "metricRemainingSub" :
      id === "metricInquiries" ? "metricInquiriesSub" :
      id === "metricActiveClients" ? "metricActiveClientsSub" : ""
    );
    if (fallback) fallback.textContent = sub || "";
  }

  function renderRecentSessions() {
    if (!recentSessions) return;
    const flattened = [];
    clientsCache.forEach(function (c) {
      (c.sessions || []).forEach(function (s) {
        flattened.push({ clientName: c.name, date: s.date, notes: s.notes });
      });
    });
    flattened.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    const top = flattened.slice(0, 5);
    if (!top.length) {
      recentSessions.innerHTML = '<p class="muted-note">No sessions logged yet.</p>';
      return;
    }
    recentSessions.innerHTML = top.map(function (s) {
      return (
        '<div class="activity-row">' +
          '<span class="activity-date">' + escapeHtml(formatDate(s.date)) + '</span>' +
          '<span class="activity-primary">' + escapeHtml(s.clientName) + '</span>' +
          '<span class="activity-secondary">' + escapeHtml(s.notes || "—") + '</span>' +
        '</div>'
      );
    }).join("");
  }

  function renderRecentInquiries() {
    if (!recentInquiries) return;
    const top = inquiriesCache.slice(0, 5);
    if (!top.length) {
      recentInquiries.innerHTML = '<p class="muted-note">No inquiries yet.</p>';
      return;
    }
    recentInquiries.innerHTML = top.map(function (i) {
      return (
        '<div class="activity-row">' +
          '<span class="activity-date">' + escapeHtml(formatDate(i.date)) + '</span>' +
          '<span class="activity-primary">' + escapeHtml(i.name || "—") + '</span>' +
          '<span class="activity-secondary">' + escapeHtml(i.organization || "—") + '</span>' +
        '</div>'
      );
    }).join("");
  }

  // ---------- Clients view ----------
  function getFilteredClients() {
    const q = clientFilter.trim().toLowerCase();
    let list = clientsCache.slice();
    if (q) {
      list = list.filter(function (c) {
        return (
          String(c.name || "").toLowerCase().includes(q) ||
          String(c.email || "").toLowerCase().includes(q) ||
          String(c.package || "").toLowerCase().includes(q)
        );
      });
    }
    list.sort(function (a, b) {
      if (clientSort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
      if (clientSort === "remaining") return (Number(b.remaining) || 0) - (Number(a.remaining) || 0);
      if (clientSort === "completed") return (Number(b.completed) || 0) - (Number(a.completed) || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }

  function renderClients() {
    if (!clientsCache.length) {
      clientList.innerHTML = '<p class="muted-note">No clients yet. Add your first client to start tracking sessions.</p>';
      return;
    }
    const list = getFilteredClients();
    if (!list.length) {
      clientList.innerHTML = '<p class="muted-note">No clients match that search.</p>';
      return;
    }
    clientList.innerHTML = list.map(function (c) {
      const remaining = Number(c.remaining) || 0;
      const remainingClass = remaining <= 0 ? "remaining-out" : remaining <= 1 ? "remaining-low" : "remaining-ok";
      return (
        '<article class="client-card" data-client="' + escapeHtml(c.id) + '">' +
          '<div class="client-head">' +
            '<div class="client-id">' +
              '<h3>' + escapeHtml(c.name) + '</h3>' +
              '<p class="client-meta">' + escapeHtml(c.email || "no email on file") + (c.package ? ' · ' + escapeHtml(c.package) : "") + '</p>' +
            '</div>' +
            '<div class="client-stats">' +
              '<span class="stat"><strong>' + (c.completed || 0) + '</strong><span>done</span></span>' +
              '<span class="stat"><strong>' + (c.sessionsPaid || 0) + '</strong><span>paid</span></span>' +
              '<span class="stat ' + remainingClass + '"><strong>' + remaining + '</strong><span>left</span></span>' +
            '</div>' +
          '</div>' +
          '<div class="client-actions">' +
            '<button type="button" class="button button-primary" data-action="log" data-id="' + escapeHtml(c.id) + '">+ Log Session</button>' +
            '<button type="button" class="button button-secondary" data-action="history" data-id="' + escapeHtml(c.id) + '">History (' + (c.sessions ? c.sessions.length : 0) + ')</button>' +
            '<button type="button" class="text-link danger" data-action="delete-client" data-id="' + escapeHtml(c.id) + '">Remove</button>' +
          '</div>' +
          '<div class="session-history" data-history="' + escapeHtml(c.id) + '" hidden>' + renderSessionHistory(c.sessions || []) + '</div>' +
        '</article>'
      );
    }).join("");
  }

  function renderSessionHistory(sessions) {
    if (!sessions.length) return '<p class="muted-note">No sessions logged yet.</p>';
    const sorted = sessions.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    return (
      '<ul class="session-list">' +
        sorted.map(function (s) {
          return (
            '<li>' +
              '<span class="session-date">' + escapeHtml(formatDate(s.date)) + '</span>' +
              (s.notes ? '<span class="session-notes">' + escapeHtml(s.notes) + '</span>' : '<span class="session-notes muted">—</span>') +
              '<button type="button" class="text-link danger" data-action="delete-session" data-id="' + escapeHtml(s.id) + '">undo</button>' +
            '</li>'
          );
        }).join("") +
      '</ul>'
    );
  }

  // ---------- Inquiries view ----------
  function renderInquiries() {
    if (!inquiriesCache.length) {
      inquiryList.innerHTML = '<p class="muted-note">No speaking inquiries yet.</p>';
      return;
    }
    inquiryList.innerHTML = inquiriesCache.map(function (i) {
      return (
        '<article class="inquiry-card">' +
          '<div class="inquiry-head">' +
            '<div>' +
              '<h3>' + escapeHtml(i.name) + '</h3>' +
              '<p class="client-meta">' + escapeHtml(i.organization || "—") + ' · <a href="mailto:' + escapeHtml(i.email) + '">' + escapeHtml(i.email) + '</a></p>' +
            '</div>' +
            '<span class="inquiry-date">' + escapeHtml(formatDate(i.date)) + '</span>' +
          '</div>' +
          '<p class="inquiry-details">' + escapeHtml(i.details) + '</p>' +
        '</article>'
      );
    }).join("");
  }

  // ---------- Modal ----------
  function buildModal(opts) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = (
      '<div class="modal-card" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<h2>' + escapeHtml(opts.title) + '</h2>' +
          '<button type="button" class="modal-close" aria-label="Close">×</button>' +
        '</div>' +
        '<form class="modal-form contact-form">' +
          opts.fields.map(fieldHtml).join("") +
          '<p class="form-status modal-status" aria-live="polite"></p>' +
          '<div class="modal-actions">' +
            '<button type="button" class="button button-secondary modal-cancel">Cancel</button>' +
            '<button type="submit" class="button button-primary">' + escapeHtml(opts.submitLabel) + '</button>' +
          '</div>' +
        '</form>' +
      '</div>'
    );
    document.body.appendChild(overlay);

    const form = overlay.querySelector(".modal-form");
    const status = overlay.querySelector(".modal-status");
    const submitBtn = form.querySelector('button[type="submit"]');
    const close = function () { overlay.remove(); };

    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector(".modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function escListener(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escListener);
      }
    });

    const firstInput = form.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      status.textContent = "Saving…";
      const data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      const result = await opts.onSubmit(data);
      submitBtn.disabled = false;
      if (result && result.success) {
        close();
      } else {
        status.textContent = (result && result.error) || "Could not save.";
      }
    });
  }

  function fieldHtml(f) {
    const req = f.required ? " required" : "";
    if (f.type === "textarea") {
      return '<label>' + escapeHtml(f.label) + '<textarea name="' + f.name + '" rows="3"' + req + '></textarea></label>';
    }
    if (f.type === "select") {
      return (
        '<label>' + escapeHtml(f.label) +
          '<select name="' + f.name + '"' + req + '>' +
            f.options.map(function (o) { return '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>'; }).join("") +
          '</select>' +
        '</label>'
      );
    }
    const def = f.default !== undefined ? ' value="' + escapeHtml(String(f.default)) + '"' : "";
    const min = f.min !== undefined ? ' min="' + f.min + '"' : "";
    return '<label>' + escapeHtml(f.label) + '<input type="' + f.type + '" name="' + f.name + '"' + req + def + min + '></label>';
  }

  function openAddClient() {
    buildModal({
      title: "Add Client",
      submitLabel: "Add Client",
      fields: [
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: false },
        { name: "package", label: "Package", type: "select", required: true, options: ["Single Session", "5 Session Package", "10 Session Package", "Military Prep — Group", "Military Prep — 1-on-1", "Custom"] },
        { name: "sessionsPaid", label: "Sessions Paid", type: "number", required: true, min: 1, default: 1 },
        { name: "notes", label: "Notes (optional)", type: "textarea", required: false }
      ],
      onSubmit: async function (data) {
        const r = await apiPost("addClient", data);
        if (r.success) await loadClients();
        return r;
      }
    });
  }

  function openLogSession(clientId) {
    const client = clientsCache.find(function (c) { return c.id === clientId; });
    if (!client) return;
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    buildModal({
      title: "Log Session — " + client.name,
      submitLabel: "Log Session",
      fields: [
        { name: "date", label: "Date & Time", type: "datetime-local", required: true, default: iso },
        { name: "notes", label: "Notes (optional)", type: "textarea", required: false }
      ],
      onSubmit: async function (data) {
        const r = await apiPost("logSession", { clientId: clientId, date: data.date, notes: data.notes });
        if (r.success) await loadClients();
        return r;
      }
    });
  }

  // ---------- Event wiring ----------
  document.querySelectorAll(".sidebar-link[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () { setActiveView(btn.dataset.view); });
  });

  document.querySelectorAll("[data-jump]").forEach(function (btn) {
    btn.addEventListener("click", function () { setActiveView(btn.dataset.jump); });
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      if (adminApp.classList.contains("sidebar-open")) closeMobileSidebar();
      else openMobileSidebar();
    });
  }
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  if (clientSearchInput) {
    clientSearchInput.addEventListener("input", function () {
      clientFilter = clientSearchInput.value || "";
      renderClients();
    });
  }
  if (clientSortSelect) {
    clientSortSelect.addEventListener("change", function () {
      clientSort = clientSortSelect.value || "recent";
      renderClients();
    });
  }

  clientList.addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "log") {
      openLogSession(id);
    } else if (action === "history") {
      const card = btn.closest(".client-card");
      const el = card && card.querySelector('[data-history="' + id + '"]');
      if (el) el.hidden = !el.hidden;
    } else if (action === "delete-client") {
      if (!confirm("Remove this client? Their logged sessions will remain in the sheet history.")) return;
      const r = await apiPost("deleteClient", { id: id });
      if (r.success) loadClients();
      else alert(r.error || "Could not remove.");
    } else if (action === "delete-session") {
      if (!confirm("Undo this logged session?")) return;
      const r = await apiPost("deleteSession", { id: id });
      if (r.success) loadClients();
      else alert(r.error || "Could not undo.");
    }
  });

  signOutBtn.addEventListener("click", signOut);

  authForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!ENDPOINT) {
      authStatus.textContent = "Admin endpoint not configured.";
      return;
    }
    authStatus.textContent = "Signing in…";
    const ok = await tryAuth(authPassword.value);
    if (ok) {
      authStatus.textContent = "";
      authPassword.value = "";
      showDashboard();
    } else {
      if (lastAuthError && lastAuthError !== "unauthorized") {
        authStatus.textContent = "Sign-in error: " + lastAuthError;
      } else {
        authStatus.textContent = "Incorrect password.";
      }
    }
  });

  (async function init() {
    if (!ENDPOINT) {
      authStatus.textContent = "Admin endpoint not configured.";
      return;
    }
    if (authToken) {
      const ok = await tryAuth(authToken);
      if (ok) showDashboard();
    }
  })();
})();
