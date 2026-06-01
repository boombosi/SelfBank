// ============================================================
// Learning Dashboard - Frontend Logic
// ============================================================

let activeSessionId = null;
let isRegisterMode = false;

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupAuthForm();
    setupTabs();
    setupSettingsDropdown();
    setupFinanceFormDefaults();
});

// ---- Helpers ----
function showToast(msg, isError) {
    isError = isError || false;
    var toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() { toast.className = "toast hidden"; }, 2200);
}

function fmtMinutes(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + "\u5c0f\u65f6" + m + "\u5206\u949f";
}

async function api(url, options) {
    options = options || {};
    options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    var res = await fetch(url, options);
    var data = await res.json();
    if (!res.ok && data.message) throw new Error(data.message);
    return data;
}

// ---- Auth ----
async function checkAuth() {
    try {
        var resp = await fetch("/api/auth/me");
        var data = await resp.json();
        if (data.ok) { showDashboard(data.email); loadAllData(); }
        else { showAuth(); }
    } catch(e) { showAuth(); }
}

function showAuth() {
    document.getElementById("auth-overlay").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
}

function showDashboard(email) {
    document.getElementById("auth-overlay").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("user-email").textContent = email;
}

function setupAuthForm() {
    var form = document.getElementById("auth-form");
    var link = document.getElementById("auth-switch-link");
    var st = document.getElementById("auth-switch-text");
    var sub = document.getElementById("auth-subtitle");
    var btn = document.getElementById("auth-submit-btn");
    var p2g = document.getElementById("auth-password2-group");
    var err = document.getElementById("auth-error");

    link.addEventListener("click", function(e) {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            sub.textContent = "\u521b\u5efa\u65b0\u8d26\u6237";
            btn.textContent = "\u6ce8\u518c";
            st.textContent = "\u5df2\u6709\u8d26\u53f7\uff1f";
            link.textContent = "\u7acb\u5373\u767b\u5f55";
            p2g.classList.remove("hidden");
        } else {
            sub.textContent = "\u767b\u5f55\u4f60\u7684\u8d26\u6237";
            btn.textContent = "\u767b\u5f55";
            st.textContent = "\u8fd8\u6ca1\u6709\u8d26\u53f7\uff1f";
            link.textContent = "\u7acb\u5373\u6ce8\u518c";
            p2g.classList.add("hidden");
        }
        err.classList.add("hidden");
    });

    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        var email = document.getElementById("auth-email").value.trim();
        var pw = document.getElementById("auth-password").value;
        var pw2 = document.getElementById("auth-password2").value;
        err.classList.add("hidden");
        var url = isRegisterMode ? "/api/auth/register" : "/api/auth/login";
        var body = isRegisterMode ? { email: email, password: pw, password2: pw2 } : { email: email, password: pw };
        try {
            var data = await api(url, { method: "POST", body: JSON.stringify(body) });
            showDashboard(email);
            loadAllData();
            form.reset();
            showToast(data.message);
        } catch(ex) {
            err.textContent = ex.message;
            err.classList.remove("hidden");
        }
    });
}

async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    activeSessionId = null;
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-end").disabled = true;
    showAuth();
}

// ---- Tabs ----
function setupTabs() {
    document.querySelectorAll(".tab").forEach(function(tab) {
        tab.addEventListener("click", function() {
            document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
            document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
            tab.classList.add("active");
            document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
            var t = tab.dataset.tab;
            if (t === "study") { loadStudyStats(); loadStudySessions(); }
            if (t === "finance") { loadFinance(); }
            if (t === "skills") { loadSkills(); }
            if (t === "products") { loadProducts(); }
        });
    });
}

// ---- Settings dropdown ----
function setupSettingsDropdown() {
    var btn = document.getElementById("settings-btn");
    var menu = document.getElementById("settings-menu");
    btn.addEventListener("click", function(e) {
        e.stopPropagation();
        menu.classList.toggle("hidden");
    });
    document.addEventListener("click", function() { menu.classList.add("hidden"); });
}

// ---- Export / Import / Clear ----
async function exportData() {
    try {
        var data = await api("/api/export");
        var blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "learning-dashboard-export-" + new Date().toISOString().slice(0,10) + ".json";
        a.click();
        URL.revokeObjectURL(url);
        showToast("\u6570\u636e\u5df2\u5bfc\u51fa");
    } catch(ex) { showToast("\u5bfc\u51fa\u5931\u8d25: " + ex.message, true); }
}

async function importData(event) {
    var file = event.target.files[0];
    if (!file) return;
    try {
        var text = await file.text();
        var json = JSON.parse(text);
        await api("/api/import", { method: "POST", body: JSON.stringify({ data: json }) });
        showToast("\u6570\u636e\u5bfc\u5165\u6210\u529f");
        loadAllData();
    } catch(ex) { showToast("\u5bfc\u5165\u5931\u8d25: " + ex.message, true); }
    event.target.value = "";
}

async function clearAllData() {
    if (!confirm("\u786e\u8ba4\u8981\u6e05\u7a7a\u6240\u6709\u6570\u636e\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\uff01")) return;
    if (!confirm("\u518d\u6b21\u786e\u8ba4\uff1a\u771f\u7684\u8981\u5220\u9664\u6240\u6709\u6570\u636e\u5417\uff1f")) return;
    try {
        await api("/api/clear", { method: "POST" });
        showToast("\u6240\u6709\u6570\u636e\u5df2\u6e05\u7a7a");
        loadAllData();
    } catch(ex) { showToast("\u6e05\u7a7a\u5931\u8d25: " + ex.message, true); }
}

function loadAllData() {
    loadStudyStats(); loadStudySessions(); loadFinance(); loadSkills(); loadProducts();
}

// ---- Study ----
async function loadStudyStats() {
    try {
        var data = await api("/api/study/stats");
        document.getElementById("stat-today").textContent = fmtMinutes(data.today_minutes);
        document.getElementById("stat-month").textContent = fmtMinutes(data.month_minutes);
        document.getElementById("stat-total").textContent = fmtMinutes(data.total_minutes);
    } catch(ex) { console.error(ex); }
}

async function loadStudySessions() {
    try {
        var data = await api("/api/study/sessions");
        var c = document.getElementById("study-list");
        if (data.sessions.length === 0) {
            c.innerHTML = "<div class=\"list-empty\">\u6682\u65e0\u5b66\u4e60\u8bb0\u5f55\uff0c\u70b9\u51fb\u300c\u5f00\u59cb\u5b66\u4e60\u300d\u5427</div>";
            return;
        }
        c.innerHTML = data.sessions.map(function(s) {
            var start = new Date(s.start_time);
            var end = new Date(s.end_time);
            var ds = start.toLocaleDateString("zh-CN");
            var ss = start.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
            var es = end.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
            return "<div class=\"list-item\"><div class=\"item-body\"><div class=\"item-title\">" + ds + "</div><div class=\"item-meta\">" + ss + " \u2192 " + es + " \u00b7 " + fmtMinutes(s.duration_minutes) + "</div></div></div>";
        }).join("");
    } catch(ex) { console.error(ex); }
}

async function startStudy() {
    try {
        var data = await api("/api/study/start", { method: "POST" });
        activeSessionId = data.session_id;
        document.getElementById("btn-start").disabled = true;
        document.getElementById("btn-end").disabled = false;
        showToast("\u5b66\u4e60\u8ba1\u65f6\u5f00\u59cb...");
    } catch(ex) { showToast("\u5f00\u59cb\u5931\u8d25: " + ex.message, true); }
}

async function endStudy() {
    if (!activeSessionId) return;
    try {
        var data = await api("/api/study/end", {
            method: "POST",
            body: JSON.stringify({ session_id: activeSessionId, end_time: new Date().toISOString() })
        });
        showToast("\u5df2\u8bb0\u5f55\u5b66\u4e60 " + fmtMinutes(data.duration_minutes));
        activeSessionId = null;
        document.getElementById("btn-start").disabled = false;
        document.getElementById("btn-end").disabled = true;
        loadStudyStats();
        loadStudySessions();
    } catch(ex) { showToast("\u7ed3\u675f\u5931\u8d25: " + ex.message, true); }
}

// ---- Finance ----
function setupFinanceFormDefaults() {
    var di = document.getElementById("fin-date");
    if (di) di.value = new Date().toISOString().slice(0, 10);
}

async function loadFinance() {
    try {
        var rd = await api("/api/finance");
        var sd = await api("/api/finance/summary");
        document.getElementById("fin-balance").textContent = "\u00a5" + sd.total_balance.toFixed(2);
        document.getElementById("fin-income").textContent = "\u00a5" + sd.month_income.toFixed(2);
        document.getElementById("fin-expense").textContent = "\u00a5" + sd.month_expense.toFixed(2);
        var c = document.getElementById("finance-list");
        if (rd.records.length === 0) {
            c.innerHTML = "<div class=\"list-empty\">\u6682\u65e0\u8d44\u91d1\u8bb0\u5f55</div>";
            return;
        }
        c.innerHTML = rd.records.map(function(r) {
            var cls = r.type === "income" ? "income" : "expense";
            var pfx = r.type === "income" ? "+" : "-";
            return "<div class=\"list-item\"><div class=\"item-body\"><div class=\"item-title\">" + escHtml(r.category || "\u672a\u5206\u7c7b") + "</div><div class=\"item-meta\">" + r.date + " \u00b7 " + escHtml(r.note) + " \u00b7 " + (r.type === "income" ? "\u6536\u5165" : "\u652f\u51fa") + "</div></div><div class=\"item-amount " + cls + "\">" + pfx + "\u00a5" + r.amount.toFixed(2) + "</div><div class=\"item-actions\"><button class=\"danger\" onclick=\"deleteFinance(" + r.id + ")\">\u5220\u9664</button></div></div>";
        }).join("");
    } catch(ex) { console.error(ex); }
}

async function addFinance(event) {
    event.preventDefault();
    var data = {
        date: document.getElementById("fin-date").value,
        type: document.getElementById("fin-type").value,
        amount: parseFloat(document.getElementById("fin-amount").value),
        category: document.getElementById("fin-category").value.trim(),
        note: document.getElementById("fin-note").value.trim()
    };
    if (!data.date || isNaN(data.amount) || data.amount <= 0) {
        showToast("\u8bf7\u586b\u5199\u6709\u6548\u65e5\u671f\u548c\u91d1\u989d", true);
        return false;
    }
    try {
        await api("/api/finance", { method: "POST", body: JSON.stringify(data) });
        showToast("\u5df2\u6dfb\u52a0");
        event.target.reset();
        setupFinanceFormDefaults();
        loadFinance();
    } catch(ex) { showToast(ex.message, true); }
    return false;
}

async function deleteFinance(id) {
    if (!confirm("\u786e\u8ba4\u5220\u9664\u6b64\u8bb0\u5f55\uff1f")) return;
    try {
        await api("/api/finance/" + id, { method: "DELETE" });
        showToast("\u5df2\u5220\u9664");
        loadFinance();
    } catch(ex) { showToast(ex.message, true); }
}

// ---- Skills ----
async function loadSkills() {
    try {
        var data = await api("/api/skills");
        var c = document.getElementById("skill-list");
        if (data.skills.length === 0) {
            c.innerHTML = "<div class=\"list-empty\">\u6682\u65e0\u6280\u80fd\u8bb0\u5f55</div>";
            return;
        }
        var pm = { "\u4e86\u89e3": "badge-beginner", "\u719f\u6089": "badge-familiar", "\u638c\u63e1": "badge-mastery", "\u7cbe\u901a": "badge-expert" };
        c.innerHTML = data.skills.map(function(s) {
            var lh = s.link ? "<a href=\"" + escAttr(s.link) + "\" target=\"_blank\" rel=\"noopener\">\ud83d\udd17 \u94fe\u63a5</a>" : "";
            return "<div class=\"list-item\"><div class=\"item-body\"><div class=\"item-title\">" + escHtml(s.name) + " <span class=\"badge " + (pm[s.proficiency] || "badge-beginner") + "\">" + escHtml(s.proficiency) + "</span></div><div class=\"item-meta\">" + s.hours + " \u5c0f\u65f6 \u00b7 " + escHtml(s.note) + " " + lh + "</div></div><div class=\"item-actions\"><button onclick=\"editSkill(" + s.id + ")\">\u7f16\u8f91</button><button class=\"danger\" onclick=\"deleteSkill(" + s.id + ")\">\u5220\u9664</button></div></div>";
        }).join("");
    } catch(ex) { console.error(ex); }
}

// Store skill data for edit lookup
var _skillCache = {};
var _productCache = {};

async function loadSkillsWithCache() {
    try {
        var data = await api("/api/skills");
        _skillCache = {};
        data.skills.forEach(function(s) { _skillCache[s.id] = s; });
        var c = document.getElementById("skill-list");
        if (data.skills.length === 0) {
            c.innerHTML = "<div class=\"list-empty\">\u6682\u65e0\u6280\u80fd\u8bb0\u5f55</div>";
            return;
        }
        var pm = { "\u4e86\u89e3": "badge-beginner", "\u719f\u6089": "badge-familiar", "\u638c\u63e1": "badge-mastery", "\u7cbe\u901a": "badge-expert" };
        c.innerHTML = data.skills.map(function(s) {
            var lh = s.link ? "<a href=\"" + escAttr(s.link) + "\" target=\"_blank\" rel=\"noopener\">\ud83d\udd17 \u94fe\u63a5</a>" : "";
            return "<div class=\"list-item\"><div class=\"item-body\"><div class=\"item-title\">" + escHtml(s.name) + " <span class=\"badge " + (pm[s.proficiency] || "badge-beginner") + "\">" + escHtml(s.proficiency) + "</span></div><div class=\"item-meta\">" + s.hours + " \u5c0f\u65f6 \u00b7 " + escHtml(s.note) + " " + lh + "</div></div><div class=\"item-actions\"><button onclick=\"editSkill(" + s.id + ")\">\u7f16\u8f91</button><button class=\"danger\" onclick=\"deleteSkill(" + s.id + ")\">\u5220\u9664</button></div></div>";
        }).join("");
    } catch(ex) { console.error(ex); }
}

async function saveSkill(event) {
    event.preventDefault();
    var editId = document.getElementById("skill-edit-id").value;
    var data = {
        name: document.getElementById("skill-name").value.trim(),
        hours: parseFloat(document.getElementById("skill-hours").value),
        proficiency: document.getElementById("skill-proficiency").value,
        link: document.getElementById("skill-link").value.trim(),
        note: document.getElementById("skill-note").value.trim()
    };
    if (!data.name || isNaN(data.hours) || data.hours <= 0) {
        showToast("\u8bf7\u586b\u5199\u6280\u80fd\u540d\u79f0\u548c\u6709\u6548\u65f6\u957f", true);
        return false;
    }
    try {
        if (editId) {
            await api("/api/skills/" + editId, { method: "PUT", body: JSON.stringify(data) });
            showToast("\u5df2\u66f4\u65b0");
        } else {
            await api("/api/skills", { method: "POST", body: JSON.stringify(data) });
            showToast("\u5df2\u6dfb\u52a0");
        }
        cancelSkillEdit();
        loadSkillsWithCache();
    } catch(ex) { showToast(ex.message, true); }
    return false;
}

function editSkill(id) {
    var s = _skillCache[id];
    if (!s) return;
    document.getElementById("skill-edit-id").value = s.id;
    document.getElementById("skill-name").value = s.name;
    document.getElementById("skill-hours").value = s.hours;
    document.getElementById("skill-proficiency").value = s.proficiency;
    document.getElementById("skill-link").value = s.link;
    document.getElementById("skill-note").value = s.note;
    document.getElementById("skill-submit-btn").textContent = "\u66f4\u65b0";
    document.getElementById("skill-form-title").textContent = "\u270f\ufe0f \u7f16\u8f91\u6280\u80fd";
    document.getElementById("skill-cancel-btn").classList.remove("hidden");
}

function cancelSkillEdit() {
    document.getElementById("skill-edit-id").value = "";
    document.getElementById("skill-form").reset();
    document.getElementById("skill-submit-btn").textContent = "\u6dfb\u52a0";
    document.getElementById("skill-form-title").textContent = "\u2795 \u6dfb\u52a0\u6280\u80fd";
    document.getElementById("skill-cancel-btn").classList.add("hidden");
}

async function deleteSkill(id) {
    if (!confirm("\u786e\u8ba4\u5220\u9664\u6b64\u6280\u80fd\uff1f")) return;
    try {
        await api("/api/skills/" + id, { method: "DELETE" });
        showToast("\u5df2\u5220\u9664");
        loadSkillsWithCache();
    } catch(ex) { showToast(ex.message, true); }
}

// ---- Products ----
async function loadProductsWithCache() {
    try {
        var data = await api("/api/products");
        _productCache = {};
        data.products.forEach(function(p) { _productCache[p.id] = p; });
        var c = document.getElementById("product-list");
        if (data.products.length === 0) {
            c.innerHTML = "<div class=\"list-empty\">\u6682\u65e0\u4ea7\u54c1\u8bb0\u5f55</div>";
            return;
        }
        c.innerHTML = data.products.map(function(p) {
            var lh = p.link ? "<a href=\"" + escAttr(p.link) + "\" target=\"_blank\" rel=\"noopener\">\ud83d\udd17 \u94fe\u63a5</a>" : "";
            return "<div class=\"list-item\"><div class=\"item-body\"><div class=\"item-title\">" + escHtml(p.name) + " <span class=\"badge badge-familiar\">" + escHtml(p.type) + "</span></div><div class=\"item-meta\">" + (p.completed_date || "\u672a\u8bbe\u7f6e\u65e5\u671f") + " \u00b7 " + escHtml(p.description) + " " + lh + "</div></div><div class=\"item-actions\"><button onclick=\"editProduct(" + p.id + ")\">\u7f16\u8f91</button><button class=\"danger\" onclick=\"deleteProduct(" + p.id + ")\">\u5220\u9664</button></div></div>";
        }).join("");
    } catch(ex) { console.error(ex); }
}

async function saveProduct(event) {
    event.preventDefault();
    var editId = document.getElementById("product-edit-id").value;
    var data = {
        name: document.getElementById("product-name").value.trim(),
        type: document.getElementById("product-type").value,
        completed_date: document.getElementById("product-date").value,
        link: document.getElementById("product-link").value.trim(),
        description: document.getElementById("product-desc").value.trim()
    };
    if (!data.name) {
        showToast("\u8bf7\u586b\u5199\u4ea7\u54c1\u540d\u79f0", true);
        return false;
    }
    try {
        if (editId) {
            await api("/api/products/" + editId, { method: "PUT", body: JSON.stringify(data) });
            showToast("\u5df2\u66f4\u65b0");
        } else {
            await api("/api/products", { method: "POST", body: JSON.stringify(data) });
            showToast("\u5df2\u6dfb\u52a0");
        }
        cancelProductEdit();
        loadProductsWithCache();
    } catch(ex) { showToast(ex.message, true); }
    return false;
}

function editProduct(id) {
    var p = _productCache[id];
    if (!p) return;
    document.getElementById("product-edit-id").value = p.id;
    document.getElementById("product-name").value = p.name;
    document.getElementById("product-type").value = p.type;
    document.getElementById("product-date").value = p.completed_date || "";
    document.getElementById("product-link").value = p.link;
    document.getElementById("product-desc").value = p.description;
    document.getElementById("product-submit-btn").textContent = "\u66f4\u65b0";
    document.getElementById("product-form-title").textContent = "\u270f\ufe0f \u7f16\u8f91\u4ea7\u54c1";
    document.getElementById("product-cancel-btn").classList.remove("hidden");
}

function cancelProductEdit() {
    document.getElementById("product-edit-id").value = "";
    document.getElementById("product-form").reset();
    document.getElementById("product-submit-btn").textContent = "\u6dfb\u52a0";
    document.getElementById("product-form-title").textContent = "\u2795 \u6dfb\u52a0\u4ea7\u54c1";
    document.getElementById("product-cancel-btn").classList.add("hidden");
}

async function deleteProduct(id) {
    if (!confirm("\u786e\u8ba4\u5220\u9664\u6b64\u4ea7\u54c1\uff1f")) return;
    try {
        await api("/api/products/" + id, { method: "DELETE" });
        showToast("\u5df2\u5220\u9664");
        loadProductsWithCache();
    } catch(ex) { showToast(ex.message, true); }
}

// Wrappers that use cached versions
function loadSkills() { loadSkillsWithCache(); }
function loadProducts() { loadProductsWithCache(); }

// ---- Escape helpers ----
function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}