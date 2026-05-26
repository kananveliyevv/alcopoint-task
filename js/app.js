/**
 * ALCOPOINT — İş Planlaması (vahid JS, duplicate yoxdur)
 */
(function () {
  "use strict";

  const STATUS = {
    WAIT: "Gözləyir",
    PROGRESS: "Davam edir",
    PENDING_MANAGER: "Rəhbər baxışı gözləyir",
    FULLY_APPROVED: "Tam təsdiqləndi",
    LATE: "Gecikir"
  };

  const SC = {
    [STATUS.FULLY_APPROVED]: "green",
    [STATUS.PROGRESS]: "blue",
    [STATUS.PENDING_MANAGER]: "amber",
    "Rəhbər baxışında": "amber",
    Təsdiqləndi: "green",
    [STATUS.LATE]: "red",
    [STATUS.WAIT]: "gray",
    Tamamlandı: "green",
    "Ləğv edildi": "red"
  };

  const DEFAULT_DB = {
    adminPass: "admin123",
    users: [
      { id: "u1", name: "Kenan", dept: "Satış", role: "worker", pass: "isci2025" },
      { id: "u2", name: "Shamil", dept: "İT", role: "worker", pass: "isci2025" },
      { id: "u3", name: "Nurlan", dept: "Anbar", role: "worker", pass: "isci2025" }
    ],
    tasks: [
      {
        id: "ALC-001",
        task: "Aylıq satış hesabatı",
        worker: "Kenan",
        dept: "Satış",
        start: "2025-05-01",
        deadline: "2025-05-30",
        status: STATUS.FULLY_APPROVED,
        priority: "Yüksək",
        note: "Vaxtında təhvil verildi"
      },
      {
        id: "ALC-002",
        task: "Müştəri bazası yenilənməsi",
        worker: "Kenan",
        dept: "Satış",
        start: "2025-05-05",
        deadline: "2026-06-15",
        status: STATUS.PROGRESS,
        priority: "Orta",
        note: "CRM yenilənir"
      },
      {
        id: "ALC-003",
        task: "Q2 satış planı",
        worker: "Kenan",
        dept: "Satış",
        start: "2025-05-10",
        deadline: "2026-05-20",
        status: STATUS.PENDING_MANAGER,
        waitingManager: true,
        workerApproved: true,
        priority: "Yüksək",
        note: ""
      },
      {
        id: "ALC-004",
        task: "Müqavilə imzalanması",
        worker: "Kenan",
        dept: "Satış",
        start: "2025-05-15",
        deadline: "2025-05-28",
        status: STATUS.LATE,
        priority: "Kritik",
        note: "Müştəri cavab vermir"
      },
      {
        id: "ALC-005",
        task: "Server texniki baxım",
        worker: "Shamil",
        dept: "İT",
        start: "2025-05-01",
        deadline: "2025-05-28",
        status: STATUS.FULLY_APPROVED,
        priority: "Kritik",
        note: "Tamamlandı"
      },
      {
        id: "ALC-006",
        task: "Şəbəkə konfiqurasiyası",
        worker: "Shamil",
        dept: "İT",
        start: "2025-05-08",
        deadline: "2026-06-10",
        status: STATUS.PROGRESS,
        priority: "Yüksək",
        note: "VPN quraşdırılır"
      },
      {
        id: "ALC-007",
        task: "İstifadəçi hesabları",
        worker: "Shamil",
        dept: "İT",
        start: "2025-05-12",
        deadline: "2026-05-30",
        status: STATUS.WAIT,
        priority: "Orta",
        note: ""
      },
      {
        id: "ALC-008",
        task: "İnventar yoxlaması",
        worker: "Nurlan",
        dept: "Anbar",
        start: "2025-05-01",
        deadline: "2025-05-26",
        status: STATUS.LATE,
        priority: "Kritik",
        note: "Sənədlər çatışmır"
      },
      {
        id: "ALC-009",
        task: "Anbar hesabatı",
        worker: "Nurlan",
        dept: "Anbar",
        start: "2025-05-05",
        deadline: "2025-05-20",
        status: STATUS.LATE,
        priority: "Kritik",
        note: "Deadline keçib!"
      },
      {
        id: "ALC-010",
        task: "Mal qəbulu",
        worker: "Nurlan",
        dept: "Anbar",
        start: "2025-05-15",
        deadline: "2026-06-01",
        status: STATUS.PENDING_MANAGER,
        waitingManager: true,
        workerApproved: true,
        priority: "Yüksək",
        note: "Yük gəldi"
      }
    ],
    imports: [
      {
        id: "IMP-001",
        company: "Araz Supermarket",
        subject: "Yeni mal partiyası",
        date: "2025-05-20",
        worker: "Kenan",
        status: "Tamamlandı",
        nextDate: "2025-06-05",
        notes: "50 ящик sifarişi"
      }
    ],
    departments: [
      { id: "d1", name: "Satış" },
      { id: "d2", name: "İT" },
      { id: "d3", name: "Anbar" },
      { id: "d4", name: "Logistika" },
      { id: "d5", name: "Maliyyə" },
      { id: "d6", name: "HR" }
    ],
    activityLogs: []
  };

  let db = structuredClone(DEFAULT_DB);
  let currentUser = null;
  let editingTaskId = null;
  let editingImportId = null;
  let editingUserId = null;
  let countdownTimer = null;
  let firebaseMode = "local";
  let firebaseConnected = false;
  let currentTheme = "dark";

  // ─── Helpers ───
  function badge(s) {
    return `<span class="badge ${SC[s] || "gray"}">${esc(s)}</span>`;
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function prioH(p) {
    const c = p === "Kritik" ? "k" : p === "Yüksək" ? "y" : "o";
    return `<span class="prio"><span class="pd ${c}"></span>${esc(p)}</span>`;
  }
  const AZ_MONTHS = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "İyun",
    "İyul",
    "Avqust",
    "Sentyabr",
    "Oktyabr",
    "Noyabr",
    "Dekabr"
  ];

  function fd(d) {
    if (!d) return "—";
    const p = d.split("-");
    if (p.length !== 3) return d;
    const day = parseInt(p[2], 10);
    const month = parseInt(p[1], 10);
    const year = p[0];
    if (isNaN(day) || isNaN(month) || month < 1 || month > 12) return d;
    return `${day} ${AZ_MONTHS[month - 1]} ${year}`;
  }

  function initDateSelects(prefix) {
    const dSel = document.getElementById(prefix + "-d");
    const mSel = document.getElementById(prefix + "-m");
    const ySel = document.getElementById(prefix + "-y");
    if (!dSel || dSel.options.length) return;

    dSel.innerHTML = Array.from({ length: 31 }, (_, i) => {
      const n = i + 1;
      return `<option value="${n}">${n}</option>`;
    }).join("");

    mSel.innerHTML = AZ_MONTHS.map(
      (name, i) => `<option value="${i + 1}">${name}</option>`
    ).join("");

    const y = new Date().getFullYear();
    ySel.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const yr = y - 2 + i;
      return `<option value="${yr}">${yr}</option>`;
    }).join("");
  }

  function getDateFromSelects(prefix) {
    const d = document.getElementById(prefix + "-d")?.value;
    const m = document.getElementById(prefix + "-m")?.value;
    const y = document.getElementById(prefix + "-y")?.value;
    if (!d || !m || !y) return "";
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function setDateToSelects(prefix, iso) {
    initDateSelects(prefix);
    if (!iso) return;
    const p = iso.split("-");
    if (p.length !== 3) return;
    const dEl = document.getElementById(prefix + "-d");
    const mEl = document.getElementById(prefix + "-m");
    const yEl = document.getElementById(prefix + "-y");
    if (dEl) dEl.value = parseInt(p[2], 10);
    if (mEl) mEl.value = parseInt(p[1], 10);
    if (yEl) yEl.value = p[0];
  }

  function clearDateSelects(prefix) {
    initDateSelects(prefix);
    const today = new Date();
    const dEl = document.getElementById(prefix + "-d");
    const mEl = document.getElementById(prefix + "-m");
    const yEl = document.getElementById(prefix + "-y");
    if (dEl) dEl.value = today.getDate();
    if (mEl) mEl.value = today.getMonth() + 1;
    if (yEl) yEl.value = today.getFullYear();
  }
  function notify(msg, type = "ok") {
    const el = document.createElement("div");
    el.className = `notif ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
  function applyTheme(theme) {
    const root = document.documentElement;
    currentTheme = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", currentTheme);
    const isLight = currentTheme === "light";
    root.classList.toggle("theme-light", isLight);
    root.style.colorScheme = isLight ? "light" : "dark";
    if (document.body) {
      document.body.setAttribute("data-theme", currentTheme);
      document.body.classList.toggle("theme-light", isLight);
      document.body.style.colorScheme = isLight ? "light" : "dark";
    }
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) {
      btn.textContent = isLight ? "🌙 Qara rejim" : "☀️ Ağ rejim";
    }
    const loginIcon = document.getElementById("theme-toggle-login-icon");
    const loginBtn = document.getElementById("theme-toggle-login");
    if (loginIcon) loginIcon.textContent = isLight ? "🌙" : "☀️";
    if (loginBtn) {
      loginBtn.title = isLight ? "Qara rejimə keç" : "Ağ rejimə keç";
      loginBtn.setAttribute("aria-label", isLight ? "Qara rejim" : "Ağ rejim");
    }
    try {
      localStorage.setItem("alcopoint_theme", currentTheme);
    } catch (_) {}
  }
  function loadTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem("alcopoint_theme");
    } catch (_) {}
    const prefersLight =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(saved || (prefersLight ? "light" : "dark"));
  }
  function newTaskId() {
    const ids = db.tasks.map((t) => parseInt(t.id.replace("ALC-", ""), 10)).filter((n) => !isNaN(n));
    return "ALC-" + (Math.max(0, ...ids) + 1).toString().padStart(3, "0");
  }
  function newImpId() {
    const ids = db.imports.map((t) => parseInt(t.id.replace("IMP-", ""), 10)).filter((n) => !isNaN(n));
    return "IMP-" + (Math.max(0, ...ids) + 1).toString().padStart(3, "0");
  }
  function isDoneStatus(s) {
    return s === STATUS.FULLY_APPROVED || s === "Təsdiqləndi" || s === "Tamamlandı";
  }
  function migrateTask(t) {
    if (t.status === "Təsdiqləndi") t.status = STATUS.FULLY_APPROVED;
    if (t.status === "Rəhbər baxışında") {
      t.status = STATUS.PENDING_MANAGER;
      t.waitingManager = true;
    }
    if (t.waitingManager && t.status !== STATUS.PENDING_MANAGER) {
      t.status = STATUS.PENDING_MANAGER;
    }
    return t;
  }
  function sortTasks(list) {
    return [...list].sort((a, b) => {
      const pa = a.waitingManager ? 0 : 1;
      const pb = b.waitingManager ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const da = a.deadline || "9999";
      const db2 = b.deadline || "9999";
      return da.localeCompare(db2);
    });
  }
  function deadlineMs(d) {
    if (!d) return null;
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day, 23, 59, 59).getTime();
  }
  function getCountdown(deadline, status) {
    if (isDoneStatus(status) || status === STATUS.PENDING_MANAGER) {
      return { text: "—", cls: "countdown-ok" };
    }
    const end = deadlineMs(deadline);
    if (!end) return { text: "—", cls: "" };
    const diff = end - Date.now();
    if (diff <= 0) return { text: "Gecikir", cls: "countdown-late" };
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const text =
      days > 0 ? `${days}g ${hrs}s ${mins}d` : hrs > 0 ? `${hrs}s ${mins}d ${secs}s` : `${mins}d ${secs}s`;
    const cls = diff < 86400000 * 2 ? "countdown-warn" : "countdown-ok";
    return { text, cls };
  }
  function applyOverdueRules() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    db.tasks.forEach((t) => {
      migrateTask(t);
      if (isDoneStatus(t.status) || t.status === STATUS.PENDING_MANAGER) return;
      const end = deadlineMs(t.deadline);
      if (end && end < Date.now() && t.status !== STATUS.LATE) {
        t.status = STATUS.LATE;
      }
    });
  }

  function logActivity(action, detail) {
    const entry = {
      id: "log_" + Date.now(),
      action,
      detail,
      user: currentUser ? currentUser.name : "system",
      at: new Date().toISOString()
    };
    db.activityLogs = db.activityLogs || [];
    db.activityLogs.unshift(entry);
    if (db.activityLogs.length > 200) db.activityLogs.length = 200;
    if (FirebaseService.connected) FirebaseService.pushActivity(entry);
  }

  function saveDB() {
    applyOverdueRules();
    syncDepartments();
    try {
      localStorage.setItem("alcopoint_v2", JSON.stringify(db));
    } catch (_) {}
    FirebaseService.saveAll(db);
    updateConnectionUI();
    updateApprovalBadge();
    refreshAllViews();
  }

  function loadDB() {
    try {
      const cached = FirebaseService.loadCache();
      const local = localStorage.getItem("alcopoint_v2");
      const src = cached || (local ? JSON.parse(local) : null);
      if (src) {
        db = { ...structuredClone(DEFAULT_DB), ...src };
        if (!db.imports) db.imports = DEFAULT_DB.imports;
        if (!db.departments) db.departments = DEFAULT_DB.departments;
        if (!db.activityLogs) db.activityLogs = [];
      }
    } catch (_) {}
    db.tasks.forEach(migrateTask);
    applyOverdueRules();
  }

  function syncDepartments() {
    const names = new Set(db.departments.map((d) => d.name));
    db.users.forEach((u) => names.add(u.dept));
    db.tasks.forEach((t) => t.dept && names.add(t.dept));
    db.departments = [...names].filter(Boolean).map((name, i) => ({
      id: "d_" + name.replace(/\s/g, "_"),
      name
    }));
  }

  let firebaseInitialSync = false;

  function mergeRemoteData(remote) {
    if (!remote) return;
    const hasCloudTasks = remote.tasks && remote.tasks.length > 0;
    const hasCloudUsers = remote.users && remote.users.length > 0;

    if (!firebaseInitialSync && !hasCloudTasks && db.tasks.length) {
      firebaseInitialSync = true;
      FirebaseService.saveAll(db);
      return;
    }
    firebaseInitialSync = true;

    if (hasCloudTasks) db.tasks = remote.tasks.map(migrateTask);
    if (hasCloudUsers) db.users = remote.users;
    if (remote.departments && remote.departments.length) db.departments = remote.departments;
    if (remote.activityLogs) db.activityLogs = remote.activityLogs;
    if (remote.meta) {
      if (remote.meta.adminPass) db.adminPass = remote.meta.adminPass;
      if (remote.meta.imports) db.imports = remote.meta.imports;
    }
    if (remote.adminPass) db.adminPass = remote.adminPass;
    if (remote.imports) db.imports = remote.imports;
    try {
      localStorage.setItem("alcopoint_v2", JSON.stringify(db));
    } catch (_) {}
    applyOverdueRules();
    refreshAllViews();
    updateApprovalBadge();
  }

  function refreshAllViews() {
    if (!currentUser) return;
    const page = document.querySelector(".page.active");
    if (!page) return;
    const id = page.id.replace("page-", "");
    showPage(id, true);
  }

  function updateConnectionUI() {
    const el = document.getElementById("conn-status");
    if (!el) return;
    if (firebaseMode === "firebase" && firebaseConnected) {
      el.className = "conn-pill online";
      el.textContent = "● Realtime bağlı";
    } else if (firebaseMode === "firebase") {
      el.className = "conn-pill offline";
      el.textContent = "○ Yenidən qoşulur...";
    } else {
      el.className = "conn-pill local";
      el.textContent = "◆ Local rejim";
    }
  }

  function updateApprovalBadge() {
    const n = db.tasks.filter((t) => t.waitingManager).length;
    const badge = document.getElementById("nav-approval-badge");
    if (badge) {
      badge.textContent = n;
      badge.style.display = n ? "inline-flex" : "none";
    }
  }

  function startCountdowns() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      document.querySelectorAll("[data-countdown-id]").forEach((el) => {
        const id = el.getAttribute("data-countdown-id");
        const t = db.tasks.find((x) => x.id === id);
        if (!t) return;
        const c = getCountdown(t.deadline, t.status);
        el.textContent = c.text;
        el.className = "countdown " + c.cls;
      });
    }, 1000);
  }

  // ─── Auth ───
  function populateLoginSelect() {
    const sel = document.getElementById("login-user");
    while (sel.options.length > 2) sel.remove(2);
    db.users.forEach((u) => {
      const o = document.createElement("option");
      o.value = u.name;
      o.textContent = u.name;
      sel.appendChild(o);
    });
  }

  window.doLogin = function () {
    const u = document.getElementById("login-user").value;
    const p = document.getElementById("login-pass").value;
    const err = document.getElementById("login-err");
    err.style.display = "none";
    if (!u) {
      err.textContent = "İstifadəçi seçin";
      err.style.display = "block";
      return;
    }
    if (u === "admin") {
      if (p !== db.adminPass) {
        err.style.display = "block";
        return;
      }
      currentUser = { id: "admin", name: "Admin", role: "admin" };
    } else {
      const user = db.users.find((x) => x.name === u);
      if (!user || p !== user.pass) {
        err.style.display = "block";
        return;
      }
      currentUser = user;
    }
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    initApp();
  };

  window.doLogout = function () {
    currentUser = null;
    document.getElementById("app").classList.remove("app-worker");
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("app").style.display = "none";
    document.getElementById("login-pass").value = "";
    document.getElementById("login-err").style.display = "none";
  };

  function initApp() {
    const isAdmin = currentUser.role === "admin";
    document.getElementById("nav-admin").style.display = isAdmin ? "block" : "none";
    document.getElementById("nav-worker").style.display = isAdmin ? "none" : "block";
    document.getElementById("app").classList.toggle("app-worker", !isAdmin);
    document.getElementById("sidebar-name").textContent = currentUser.name;
    document.getElementById("sidebar-role").textContent = isAdmin ? "Rəhbər" : "İşçi · " + currentUser.dept;
    const av = document.getElementById("sidebar-avatar");
    av.textContent = currentUser.name[0].toUpperCase();
    av.className = "avatar " + (isAdmin ? "admin" : "worker");
    document.getElementById("dash-date").textContent = new Date().toLocaleDateString("az-AZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    updateApprovalBadge();
    startCountdowns();
    if (isAdmin) {
      showPage("dashboard");
      populateWorkerFilter();
    } else {
      showPage("my-tasks");
    }
  }

  window.showPage = function (name, silent) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    const pg = document.getElementById("page-" + name);
    if (pg) pg.classList.add("active");
    const nav = document.querySelector(`[data-page="${name}"]`);
    if (nav) nav.classList.add("active");

    if (name === "dashboard") renderDashboard();
    if (name === "tasks") renderTasksTable();
    if (name === "approval") renderApprovalPage();
    if (name === "users") renderUsers();
    if (name === "import") renderImport();
    if (name === "my-tasks") renderMyTasks();
    if (name === "settings") renderSettings();
    if (name === "performance") {
      renderPerformancePanel();
      const dst = document.getElementById("perf-panel-full");
      const src = document.getElementById("perf-panel");
      if (dst && src) dst.innerHTML = src.innerHTML;
    }
  };
  window.toggleTheme = function () {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  };

  window.renderTasksTable = renderTasksTable;
  window.renderImport = renderImport;

  function populateWorkerFilter() {
    const s = document.getElementById("filter-worker");
    if (!s) return;
    while (s.options.length > 1) s.remove(1);
    db.users.forEach((u) => {
      const o = document.createElement("option");
      o.value = u.name;
      o.textContent = u.name;
      s.appendChild(o);
    });
  }

  function countdownCell(t) {
    const c = getCountdown(t.deadline, t.status);
    return `<span class="countdown ${c.cls}" data-countdown-id="${esc(t.id)}">${esc(c.text)}</span>`;
  }

  // ─── Dashboard ───
  function renderDashboard() {
    applyOverdueRules();
    const t = db.tasks;
    document.getElementById("s-total").textContent = t.length;
    document.getElementById("s-done").textContent = t.filter((x) => isDoneStatus(x.status)).length;
    document.getElementById("s-prog").textContent = t.filter((x) => x.status === STATUS.PROGRESS).length;
    document.getElementById("s-late").textContent = t.filter((x) => x.status === STATUS.LATE).length;
    document.getElementById("s-pending").textContent = t.filter((x) => x.waitingManager).length;

    const recent = sortTasks(t).slice(0, 8);
    document.getElementById("dash-table").innerHTML = recent.length
      ? recent
          .map(
            (task) => `<tr>
      <td class="mono">${esc(task.id)}</td>
      <td style="font-weight:500">${esc(task.task)}</td>
      <td style="color:var(--text2)">${esc(task.worker)}</td>
      <td>${countdownCell(task)}</td>
      <td>${badge(task.status)}</td>
      <td>${prioH(task.priority)}</td>
    </tr>`
          )
          .join("")
      : '<tr><td colspan="6"><div class="empty"><p>Tapşırıq yoxdur</p></div></td></tr>';

    renderPerformancePanel();
  }

  // ─── Performance ───
  function renderPerformancePanel() {
    const el = document.getElementById("perf-panel");
    if (!el) return;
    applyOverdueRules();
    const today = new Date().toISOString().split("T")[0];
    const doneToday = db.tasks.filter(
      (t) => isDoneStatus(t.status) && t.managerApprovedAt && t.managerApprovedAt.startsWith(today)
    ).length;
    const late = db.tasks.filter((t) => t.status === STATUS.LATE).length;
    const active = db.tasks.filter(
      (t) => !isDoneStatus(t.status) && t.status !== STATUS.PENDING_MANAGER
    ).length;
    const pending = db.tasks.filter((t) => t.waitingManager).length;

    const workerCounts = {};
    db.tasks.forEach((t) => {
      if (!t.worker) return;
      workerCounts[t.worker] = (workerCounts[t.worker] || 0) + 1;
    });
    const topWorkers = Object.entries(workerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const deptStats = {};
    db.tasks.forEach((t) => {
      const d = t.dept || "—";
      if (!deptStats[d]) deptStats[d] = { total: 0, done: 0 };
      deptStats[d].total++;
      if (isDoneStatus(t.status)) deptStats[d].done++;
    });

    const maxW = topWorkers[0] ? topWorkers[0][1] : 1;

    el.innerHTML = `
      <div class="perf-grid">
        <div class="perf-card"><div class="perf-val">${doneToday}</div><div class="perf-lbl">Bu gün tamamlanan</div></div>
        <div class="perf-card"><div class="perf-val red">${late}</div><div class="perf-lbl">Gecikən</div></div>
        <div class="perf-card"><div class="perf-val blue">${active}</div><div class="perf-lbl">Aktiv</div></div>
        <div class="perf-card"><div class="perf-val amber">${pending}</div><div class="perf-lbl">Təsdiq gözləyən</div></div>
      </div>
      <div class="perf-charts">
        <div class="perf-chart-box">
          <h4>Ən aktiv işçilər</h4>
          ${topWorkers
            .map(
              ([name, n]) => `<div class="bar-row">
            <span>${esc(name)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(n / maxW) * 100}%"></div></div>
            <span class="bar-num">${n}</span>
          </div>`
            )
            .join("") || "<p class='muted'>Məlumat yoxdur</p>"}
        </div>
        <div class="perf-chart-box">
          <h4>Şöbə statistikası</h4>
          ${Object.entries(deptStats)
            .map(([dept, s]) => {
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              return `<div class="bar-row">
              <span>${esc(dept)}</span>
              <div class="bar-track"><div class="bar-fill green" style="width:${pct}%"></div></div>
              <span class="bar-num">${s.done}/${s.total}</span>
            </div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  // ─── Tasks table ───
  function renderTasksTable() {
    const q = (document.getElementById("task-search")?.value || "").toLowerCase();
    const fw = document.getElementById("filter-worker")?.value || "";
    const fs = document.getElementById("filter-status")?.value || "";
    let list = db.tasks.filter(
      (t) =>
        (!q || (t.task + t.worker + (t.note || "")).toLowerCase().includes(q)) &&
        (!fw || t.worker === fw) &&
        (!fs || t.status === fs)
    );
    list = sortTasks(list);

    document.getElementById("tasks-count").textContent = `Tapşırıqlar (${list.length})`;
    const statusOpts = [
      STATUS.WAIT,
      STATUS.PROGRESS,
      STATUS.PENDING_MANAGER,
      STATUS.FULLY_APPROVED,
      STATUS.LATE
    ];

    document.getElementById("tasks-table").innerHTML = list.length
      ? list
          .map(
            (t) => `<tr class="${t.waitingManager ? "row-pending" : ""}">
      <td class="mono">${esc(t.id)}</td>
      <td style="font-weight:500;max-width:180px">${esc(t.task)}</td>
      <td style="color:var(--text2)">${esc(t.worker)}</td>
      <td style="color:var(--text3)">${esc(t.dept)}</td>
      <td>${countdownCell(t)}</td>
      <td><select class="sselect ${SC[t.status] || "gray"}" onchange="adminChgStatus('${esc(t.id)}',this.value,this)">
        ${statusOpts.map((s) => `<option${s === t.status ? " selected" : ""}>${esc(s)}</option>`).join("")}
      </select></td>
      <td>${prioH(t.priority)}</td>
      <td style="color:var(--text3);font-size:12px;max-width:120px">${esc(t.note || "—")}</td>
      <td><div class="tbl-actions">
        <button class="btn sm" onclick="editTask('${esc(t.id)}')" title="Redaktə">✎</button>
        <button class="btn sm danger" onclick="deleteTask('${esc(t.id)}')">✕</button>
      </div></td>
    </tr>`
          )
          .join("")
      : '<tr><td colspan="9"><div class="empty"><div class="ico">☰</div><p>Tapşırıq tapılmadı</p></div></td></tr>';
  }

  window.adminChgStatus = function (id, val, sel) {
    const t = db.tasks.find((x) => x.id === id);
    if (!t) return;
    t.status = val;
    if (val === STATUS.PENDING_MANAGER) t.waitingManager = true;
    if (val === STATUS.FULLY_APPROVED) {
      t.waitingManager = false;
      t.managerApproved = true;
    }
    sel.className = "sselect " + (SC[val] || "gray");
    logActivity("status_change", `${id} → ${val}`);
    saveDB();
    notify("Status: " + val);
  };

  // ─── Approval page ───
  function renderApprovalPage() {
    const box = document.getElementById("approval-list");
    if (!box) return;
    const pending = sortTasks(db.tasks.filter((t) => t.waitingManager));
    document.getElementById("approval-count").textContent = pending.length;

    if (!pending.length) {
      box.innerHTML = '<div class="empty"><div class="ico">✓</div><p>Təsdiq gözləyən tapşırıq yoxdur</p></div>';
      return;
    }

    box.innerHTML = pending
      .map(
        (t) => `<div class="approval-card">
      <div class="approval-card-body">
        <div class="mono">${esc(t.id)}</div>
        <h3>${esc(t.task)}</h3>
        <div class="approval-meta">
          <span>👤 ${esc(t.worker)}</span>
          <span>📁 ${esc(t.dept)}</span>
          <span>📅 ${fd(t.deadline)}</span>
          ${prioH(t.priority)}
        </div>
        ${t.note ? `<p class="approval-note">${esc(t.note)}</p>` : ""}
        <span class="badge amber">Rəhbər baxışı gözləyir</span>
      </div>
      <button class="btn yellow" onclick="managerApproveTask('${esc(t.id)}')">Təsdiqlə</button>
    </div>`
      )
      .join("");
  }

  window.workerApproveTask = function (taskId) {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.waitingManager) {
      notify("Artıq rəhbər baxışındadır", "info");
      return;
    }
    task.waitingManager = true;
    task.workerApproved = true;
    task.managerApproved = false;
    task.status = STATUS.PENDING_MANAGER;
    task.workerApprovedAt = new Date().toISOString();
    logActivity("worker_submit", task.id + " — " + task.task);
    saveDB();
    notify("Rəhbər baxışına göndərildi ✓");
  };

  window.managerApproveTask = function (taskId) {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.waitingManager = false;
    task.managerApproved = true;
    task.status = STATUS.FULLY_APPROVED;
    task.managerApprovedAt = new Date().toISOString();
    logActivity("manager_approve", task.id + " — " + task.task);
    saveDB();
    notify("Tapşırıq tam təsdiqləndi ✓");
  };

  // ─── Task modal ───
  window.openTaskModal = function (id) {
    editingTaskId = id || null;
    initDateSelects("f-start");
    initDateSelects("f-deadline");
    document.getElementById("modal-task-title").textContent = id ? "Tapşırığı düzəlt" : "Yeni Tapşırıq";
    const fw = document.getElementById("f-worker");
    fw.innerHTML = db.users.map((u) => `<option>${esc(u.name)}</option>`).join("");
    fw.onchange = function () {
      const u = db.users.find((x) => x.name === fw.value);
      if (u) document.getElementById("f-dept").value = u.dept;
    };
    const deptSel = document.getElementById("f-dept");
    deptSel.innerHTML = db.departments.map((d) => `<option>${esc(d.name)}</option>`).join("");

    if (id) {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) return;
      document.getElementById("f-task").value = t.task;
      fw.value = t.worker;
      deptSel.value = t.dept;
      setDateToSelects("f-start", t.start || "");
      setDateToSelects("f-deadline", t.deadline || "");
      document.getElementById("f-priority").value = t.priority;
      document.getElementById("f-status").value = t.status;
      document.getElementById("f-note").value = t.note || "";
    } else {
      document.getElementById("f-task").value = "";
      document.getElementById("f-note").value = "";
      clearDateSelects("f-start");
      clearDateSelects("f-deadline");
      document.getElementById("f-status").value = STATUS.WAIT;
    }
    document.getElementById("task-modal").style.display = "flex";
  };

  window.closeTaskModal = function () {
    document.getElementById("task-modal").style.display = "none";
  };
  window.editTask = function (id) {
    openTaskModal(id);
  };

  window.saveTask = function () {
    const task = document.getElementById("f-task").value.trim();
    if (!task) {
      notify("Tapşırıq adı daxil edin", "err");
      return;
    }
    const payload = {
      task,
      worker: document.getElementById("f-worker").value,
      dept: document.getElementById("f-dept").value,
      start: getDateFromSelects("f-start"),
      deadline: getDateFromSelects("f-deadline"),
      priority: document.getElementById("f-priority").value,
      status: document.getElementById("f-status").value,
      note: document.getElementById("f-note").value
    };
    if (payload.status === STATUS.PENDING_MANAGER) payload.waitingManager = true;

    if (editingTaskId) {
      const t = db.tasks.find((x) => x.id === editingTaskId);
      if (t) Object.assign(t, payload);
    } else {
      db.tasks.push({ id: newTaskId(), ...payload });
    }
    logActivity("task_save", task);
    saveDB();
    closeTaskModal();
    notify(editingTaskId ? "Tapşırıq yeniləndi ✓" : "Tapşırıq əlavə edildi ✓");
  };

  window.deleteTask = function (id) {
    if (!confirm("Tapşırığı silmək istəyirsiniz?")) return;
    db.tasks = db.tasks.filter((t) => t.id !== id);
    logActivity("task_delete", id);
    saveDB();
    notify("Tapşırıq silindi", "info");
  };

  // ─── My tasks (worker) ───
  function renderMyTasks() {
    const name = currentUser.name;
    const my = sortTasks(db.tasks.filter((t) => t.worker === name));
    document.getElementById("my-tasks-title").textContent = name + " — Tapşırıqlarım";
    document.getElementById("my-s-total").textContent = my.length;
    document.getElementById("my-s-done").textContent = my.filter((t) => isDoneStatus(t.status)).length;
    document.getElementById("my-s-prog").textContent = my.filter((t) => t.status === STATUS.PROGRESS).length;
    document.getElementById("my-s-late").textContent = my.filter((t) => t.status === STATUS.LATE).length;

    const el = document.getElementById("my-tasks-list");
    if (!my.length) {
      el.innerHTML = '<div class="empty"><div class="ico">✓</div><p>Hal-hazırda tapşırığınız yoxdur</p></div>';
      return;
    }

    const workerStatuses = [STATUS.WAIT, STATUS.PROGRESS, STATUS.LATE];

    el.innerHTML = my
      .map((t) => {
        const done = isDoneStatus(t.status);
        const pending = t.waitingManager || t.status === STATUS.PENDING_MANAGER;
        return `<div class="task-card${done ? " done" : ""}${pending ? " pending" : ""}">
      <div class="task-card-top">
        <div>
          <div class="mono">${esc(t.id)}</div>
          <div class="task-title">${esc(t.task)}</div>
        </div>
        ${badge(t.status)}
      </div>
      <div class="task-meta">
        <span class="meta-tag">📁 ${esc(t.dept)}</span>
        <span class="meta-tag">▶ Başlama: ${fd(t.start)}</span>
        <span class="meta-tag">⏰ Deadline: ${fd(t.deadline)}</span>
        <span class="meta-tag">⏱ ${countdownCell(t)}</span>
        <span class="meta-tag">${prioH(t.priority)}</span>
      </div>
      ${t.note ? `<div class="task-note">${esc(t.note)}</div>` : ""}
      <div class="status-row worker-actions">
        ${
          pending
            ? `<div class="pending-box">
            <span class="pending-box-icon">⏳</span>
            <div class="pending-box-text">
              <span class="pending-box-title">Təsdiqləndi</span>
              <span class="pending-box-sub">Rəhbər baxışı gözləyir — təsdiq gözlənilir</span>
            </div>
          </div>`
            : done
              ? `<div class="done-box">✓ Tam təsdiqləndi</div>`
              : `<div class="worker-status-row">
            <label>Status:</label>
            <select onchange="workerChgStatus('${esc(t.id)}',this.value)" aria-label="Status seçin">
              ${workerStatuses
                .map((s) => `<option${s === t.status ? " selected" : ""}>${esc(s)}</option>`)
                .join("")}
            </select>
          </div>
          <button type="button" class="btn-approve" onclick="workerApproveTask('${esc(t.id)}')" aria-label="Təsdiqləndi">
            <span class="btn-approve-label">✓ Təsdiqləndi</span>
            <span class="btn-approve-hint">Rəhbərə göndərilsin</span>
          </button>`
        }
      </div>
    </div>`;
      })
      .join("");
  }

  window.workerChgStatus = function (id, val) {
    const t = db.tasks.find((x) => x.id === id);
    if (!t || t.waitingManager) return;
    t.status = val;
    saveDB();
    notify("Status → " + val);
  };

  // ─── Users ───
  function renderUsers() {
    document.getElementById("users-grid").innerHTML = db.users
      .map((u) => {
        const my = db.tasks.filter((t) => t.worker === u.name);
        const done = my.filter((t) => isDoneStatus(t.status)).length;
        const prog = my.filter((t) => t.status === STATUS.PROGRESS).length;
        const late = my.filter((t) => t.status === STATUS.LATE).length;
        return `<div class="user-card">
      <div class="user-card-top">
        <div class="avatar worker" style="width:40px;height:40px;font-size:15px">${esc(u.name[0])}</div>
        <div><div class="user-card-name">${esc(u.name)}</div><div class="user-card-role">${esc(u.dept)}</div></div>
      </div>
      <div class="user-stats">
        <div class="mini-stat"><div class="n">${my.length}</div><div class="l">Cəmi</div></div>
        <div class="mini-stat"><div class="n" style="color:var(--green)">${done}</div><div class="l">Hazır</div></div>
        <div class="mini-stat"><div class="n" style="color:var(--blue)">${prog}</div><div class="l">Davam</div></div>
        <div class="mini-stat"><div class="n" style="color:var(--red)">${late}</div><div class="l">Gecikir</div></div>
      </div>
      <div class="user-actions">
        <button class="btn sm" onclick="editUser('${esc(u.id)}')">Redaktə</button>
        <button class="btn sm yellow" style="flex:1" onclick="quickTask('${esc(u.name)}')">+ Tapşırıq</button>
        <button class="btn sm" onclick="exportWorkerPdf('${esc(u.name)}')">PDF</button>
        <button class="btn sm danger" onclick="deleteUser('${esc(u.id)}')">Sil</button>
      </div>
    </div>`;
      })
      .join("");
  }

  window.quickTask = function (name) {
    openTaskModal();
    setTimeout(() => {
      document.getElementById("f-worker").value = name;
      const u = db.users.find((x) => x.name === name);
      if (u) document.getElementById("f-dept").value = u.dept;
    }, 50);
  };

  window.openUserModal = function () {
    editingUserId = null;
    document.getElementById("user-modal-title").textContent = "Yeni İşçi əlavə et";
    document.getElementById("u-name").value = "";
    document.getElementById("u-dept").value = "Satış";
    document.getElementById("u-pass").value = "isci2025";
    document.getElementById("user-save-btn").textContent = "Əlavə et";
    document.getElementById("user-modal").style.display = "flex";
  };

  window.closeUserModal = function () {
    document.getElementById("user-modal").style.display = "none";
    editingUserId = null;
  };

  window.editUser = function (id) {
    const user = db.users.find((u) => u.id === id);
    if (!user) return;
    editingUserId = id;
    document.getElementById("user-modal-title").textContent = "İşçini redaktə et";
    document.getElementById("u-name").value = user.name;
    document.getElementById("u-dept").value = user.dept;
    document.getElementById("u-pass").value = user.pass;
    document.getElementById("user-save-btn").textContent = "Yadda saxla";
    document.getElementById("user-modal").style.display = "flex";
  };

  window.saveUser = function () {
    const name = document.getElementById("u-name").value.trim();
    const dept = document.getElementById("u-dept").value;
    const pass = document.getElementById("u-pass").value;
    if (!name) {
      notify("Ad daxil edin", "err");
      return;
    }

    if (editingUserId) {
      const user = db.users.find((u) => u.id === editingUserId);
      if (!user) return;
      const oldName = user.name;
      if (db.users.some((u) => u.name === name && u.id !== editingUserId)) {
        notify("Bu adda işçi artıq mövcuddur", "err");
        return;
      }
      user.name = name;
      user.dept = dept;
      user.pass = pass;
      db.tasks.forEach((t) => {
        if (t.worker === oldName) {
          t.worker = name;
          t.dept = dept;
        }
      });
      db.imports.forEach((i) => {
        if (i.worker === oldName) i.worker = name;
      });
      logActivity("user_edit", name);
    } else {
      if (db.users.find((u) => u.name === name)) {
        notify("Bu adda işçi artıq mövcuddur", "err");
        return;
      }
      db.users.push({
        id: "u" + Date.now(),
        name,
        dept,
        role: "worker",
        pass: pass || "isci2025"
      });
      logActivity("user_add", name);
    }
    saveDB();
    closeUserModal();
    populateLoginSelect();
    notify("İşçi yadda saxlanıldı ✓");
  };

  window.deleteUser = function (id) {
    if (!confirm("İşçini silmək istəyirsiniz?")) return;
    db.users = db.users.filter((u) => u.id !== id);
    saveDB();
    populateLoginSelect();
    notify("İşçi silindi", "info");
  };

  // ─── Import ───
  function renderImport() {
    const q = (document.getElementById("imp-search")?.value || "").toLowerCase();
    const df = document.getElementById("imp-date-filter")?.value || "";
    const sf = document.getElementById("imp-status-filter")?.value || "";
    const list = [...db.imports]
      .filter(
        (i) =>
          (!q || (i.company + i.subject + (i.notes || "") + i.worker).toLowerCase().includes(q)) &&
          (!df || i.date === df) &&
          (!sf || i.status === sf)
      )
      .reverse();
    const el = document.getElementById("import-list");
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="ico">📋</div><p>Qeyd tapılmadı</p></div>';
      return;
    }
    el.innerHTML = list
      .map(
        (i) => `<div class="journal-entry${i.status === "Tamamlandı" ? " confirmed" : ""}">
      <div class="je-top">
        <div>
          <div class="mono">${esc(i.id)}</div>
          <div class="je-title">${esc(i.company)}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:3px">${esc(i.subject)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          ${badge(i.status)}
          <div style="display:flex;gap:6px">
            <button class="btn xs" onclick="editImport('${esc(i.id)}')">✎</button>
            <button class="btn xs danger" onclick="deleteImport('${esc(i.id)}')">✕</button>
          </div>
        </div>
      </div>
      <div class="je-meta">
        <span class="meta-tag">📅 ${fd(i.date)}</span>
        <span class="meta-tag">👤 ${esc(i.worker)}</span>
        ${i.nextDate ? `<span class="meta-tag">🔄 ${fd(i.nextDate)}</span>` : ""}
      </div>
      ${i.notes ? `<div class="je-note">${esc(i.notes)}</div>` : ""}
    </div>`
      )
      .join("");
  }

  window.openImportModal = function (id) {
    editingImportId = id || null;
    document.getElementById("modal-import-title").textContent = id ? "Qeydi düzəlt" : "Yeni İdxal Qeydi";
    const iw = document.getElementById("imp-worker");
    iw.innerHTML = db.users.map((u) => `<option>${esc(u.name)}</option>`).join("");
    const today = new Date().toISOString().split("T")[0];
    if (id) {
      const imp = db.imports.find((x) => x.id === id);
      if (!imp) return;
      document.getElementById("imp-company").value = imp.company;
      document.getElementById("imp-subject").value = imp.subject;
      document.getElementById("imp-date").value = imp.date || today;
      iw.value = imp.worker;
      document.getElementById("imp-status").value = imp.status;
      document.getElementById("imp-next").value = imp.nextDate || "";
      document.getElementById("imp-notes").value = imp.notes || "";
    } else {
      document.getElementById("imp-company").value = "";
      document.getElementById("imp-subject").value = "";
      document.getElementById("imp-date").value = today;
      document.getElementById("imp-next").value = "";
      document.getElementById("imp-notes").value = "";
    }
    document.getElementById("import-modal").style.display = "flex";
  };
  window.closeImportModal = function () {
    document.getElementById("import-modal").style.display = "none";
  };
  window.editImport = function (id) {
    openImportModal(id);
  };
  window.saveImport = function () {
    const company = document.getElementById("imp-company").value.trim();
    const subject = document.getElementById("imp-subject").value.trim();
    if (!company || !subject) {
      notify("Şirkət adı və mövzu tələb olunur", "err");
      return;
    }
    const obj = {
      id: editingImportId || newImpId(),
      company,
      subject,
      date: document.getElementById("imp-date").value,
      worker: document.getElementById("imp-worker").value,
      status: document.getElementById("imp-status").value,
      nextDate: document.getElementById("imp-next").value,
      notes: document.getElementById("imp-notes").value
    };
    if (editingImportId) {
      const i = db.imports.findIndex((x) => x.id === editingImportId);
      if (i >= 0) db.imports[i] = obj;
    } else db.imports.push(obj);
    saveDB();
    closeImportModal();
    notify(editingImportId ? "Qeyd yeniləndi ✓" : "Qeyd əlavə edildi ✓");
  };
  window.deleteImport = function (id) {
    if (!confirm("Qeydi silmək istəyirsiniz?")) return;
    db.imports = db.imports.filter((i) => i.id !== id);
    saveDB();
    notify("Qeyd silindi", "info");
  };

  // ─── Settings ───
  function renderSettings() {
    document.getElementById("old-pass").value = "";
    document.getElementById("new-pass").value = "";
    document.getElementById("new-pass2").value = "";
    document.getElementById("worker-pass-list").innerHTML =
      '<div style="display:grid;gap:10px">' +
      db.users
        .map(
          (u) => `<div class="pass-row">
      <div style="font-weight:600;min-width:100px">${esc(u.name)}</div>
      <div style="font-size:12px;color:var(--text3);flex:1">${esc(u.dept)}</div>
      <input type="text" id="wp-${esc(u.id)}" value="${esc(u.pass)}" class="pass-inp">
      <button class="btn sm yellow" onclick="saveWorkerPass('${esc(u.id)}')">Saxla</button>
    </div>`
        )
        .join("") +
      "</div>";

    const fbStatus = document.getElementById("firebase-status-text");
    if (fbStatus) {
      fbStatus.textContent = FirebaseService.isConfigured()
        ? firebaseConnected
          ? "Firebase Realtime Database — aktiv və bağlı"
          : "Firebase konfiqurasiya edilib — bağlantı gözlənilir"
        : "Firebase konfiqurasiya edilməyib — local rejim aktivdir";
    }
  }

  window.changeAdminPass = function () {
    const o = document.getElementById("old-pass").value;
    const n = document.getElementById("new-pass").value;
    const n2 = document.getElementById("new-pass2").value;
    if (o !== db.adminPass) {
      notify("Köhnə şifrə yanlışdır", "err");
      return;
    }
    if (!n) {
      notify("Yeni şifrə daxil edin", "err");
      return;
    }
    if (n !== n2) {
      notify("Şifrələr uyğun gəlmir", "err");
      return;
    }
    db.adminPass = n;
    saveDB();
    notify("Admin şifrəsi yeniləndi ✓");
  };

  window.saveWorkerPass = function (uid) {
    const inp = document.getElementById("wp-" + uid);
    const u = db.users.find((x) => x.id === uid);
    if (!u || !inp.value) {
      notify("Şifrə boş ola bilməz", "err");
      return;
    }
    u.pass = inp.value;
    saveDB();
    notify(u.name + " şifrəsi yeniləndi ✓");
  };

  window.clearTasks = function () {
    if (!confirm("Bütün tapşırıqlar silinsin?")) return;
    db.tasks = [];
    saveDB();
    notify("Tapşırıqlar silindi", "info");
  };
  window.clearImport = function () {
    if (!confirm("İdxal jurnalı silinsin?")) return;
    db.imports = [];
    saveDB();
    notify("Jurnal silindi", "info");
  };
  window.clearAll = function () {
    if (!confirm("Bütün məlumatlar silinsin?")) return;
    db.tasks = [];
    db.imports = [];
    saveDB();
    notify("Sıfırlandı", "info");
  };

  window.exportData = function () {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "alcopoint_backup_" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    notify("Məlumatlar yükləndi ✓");
  };

  window.importData = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        db = { ...db, ...d };
        db.tasks.forEach(migrateTask);
        saveDB();
        populateLoginSelect();
        notify("Məlumatlar yükləndi ✓");
        if (currentUser) initApp();
      } catch {
        notify("Fayl oxunmadı", "err");
      }
    };
    r.readAsText(file);
  };

  // ─── PDF Export ───
  function loadLogoForPdf(doc, x, y, cb) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        doc.addImage(img, "PNG", x, y, 40, 12);
      } catch (_) {}
      cb();
    };
    img.onerror = cb;
    img.src = "./logo.png";
  }

  window.exportAllTasksPdf = function () {
    if (typeof jspdf === "undefined") {
      notify("PDF kitabxanası yüklənməyib", "err");
      return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleString("az-AZ");
    loadLogoForPdf(doc, 14, 10, () => {
      doc.setFontSize(16);
      doc.text("ALCOPOINT — Tapşırıq Hesabatı", 14, 32);
      doc.setFontSize(10);
      doc.text("Tarix: " + date, 14, 40);
      const total = db.tasks.length;
      const done = db.tasks.filter((t) => isDoneStatus(t.status)).length;
      const late = db.tasks.filter((t) => t.status === STATUS.LATE).length;
      const pending = db.tasks.filter((t) => t.waitingManager).length;
      doc.text(`Cəmi: ${total} | Tamamlanan: ${done} | Gecikən: ${late} | Təsdiq gözləyən: ${pending}`, 14, 48);

      let y = 58;
      sortTasks(db.tasks).forEach((t) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.text(
          `${t.id} | ${t.task} | ${t.worker} | ${t.dept} | ${t.status} | ${fd(t.deadline)}`,
          14,
          y
        );
        y += 7;
      });
      doc.save("alcopoint_tasks_" + new Date().toISOString().split("T")[0] + ".pdf");
      notify("PDF yükləndi ✓");
    });
  };

  window.exportWorkerPdf = function (workerName) {
    if (typeof jspdf === "undefined") {
      notify("PDF kitabxanası yüklənməyib", "err");
      return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const my = db.tasks.filter((t) => t.worker === workerName);
    const done = my.filter((t) => isDoneStatus(t.status)).length;
    const date = new Date().toLocaleString("az-AZ");

    loadLogoForPdf(doc, 14, 10, () => {
      doc.setFontSize(16);
      doc.text("İşçi Performans Hesabatı", 14, 32);
      doc.setFontSize(11);
      doc.text(`İşçi: ${workerName}`, 14, 42);
      doc.text(`Tarix: ${date}`, 14, 50);
      doc.text(`Cəmi tapşırıq: ${my.length} | Tamamlanan: ${done} | Faiz: ${my.length ? Math.round((done / my.length) * 100) : 0}%`, 14, 58);

      let y = 68;
      my.forEach((t) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.text(`${t.id} | ${t.task} | ${t.status} | Deadline: ${fd(t.deadline)}`, 14, y);
        y += 7;
      });
      doc.save("performans_" + workerName.replace(/\s/g, "_") + ".pdf");
      notify("PDF yükləndi ✓");
    });
  };

  // ─── Init ───
  loadTheme();
  loadDB();
  populateLoginSelect();

  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  const fbOk = FirebaseService.init(
    (remote) => mergeRemoteData(remote),
    (st) => {
      firebaseMode = st.mode;
      firebaseConnected = !!st.connected;
      updateConnectionUI();
      if (st.connected) notify("Firebase realtime bağlandı", "info");
      if (st.error && !st.connected) notify("Bağlantı kəsildi — cache istifadə olunur", "err");
    }
  );

  if (!fbOk) updateConnectionUI();
})();
