/**
 * utils.js — Shared utility functions
 * Smart Student Expense Tracker
 */

const API_BASE = "";   // Same origin as Flask

// ── Category colour mapping ───────────────────────────────────────────────
const CAT_CLASS_MAP = {
  "Food & Dining":   "cat-food",
  "Transportation":  "cat-transport",
  "Education":       "cat-education",
  "Entertainment":   "cat-entertain",
  "Healthcare":      "cat-health",
  "Shopping":        "cat-shopping",
  "Utilities":       "cat-utilities",
  "Rent":            "cat-rent",
  "Personal Care":   "cat-personal",
  "Other":           "cat-other"
};

// Chart.js colour palette (matches CSS)
const CHART_COLORS = [
  "#22c55e", "#3b82f6", "#f97316", "#a855f7",
  "#ef4444", "#14b8a6", "#f59e0b", "#ec4899",
  "#6366f1", "#64748b"
];

// ── Formatters ────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatMonthLabel(ym) {
  // "2024-11" → "Nov 2024"
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function todayISO() {
  const now = new Date();
  const y  = now.getFullYear();
  const m  = String(now.getMonth() + 1).padStart(2, "0");
  const d  = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function categoryClass(cat) {
  return CAT_CLASS_MAP[cat] || "cat-other";
}

// ── Toast notification ────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = "success") {
  const toast   = document.getElementById("toast");
  const msgEl   = document.getElementById("toast-message");
  const iconEl  = toast.querySelector(".toast-icon");

  msgEl.textContent = message;
  toast.className   = `toast ${type}`;

  const iconMap = {
    success: "fa-check-circle",
    error:   "fa-exclamation-circle",
    info:    "fa-info-circle"
  };
  iconEl.className = `toast-icon fas ${iconMap[type] || "fa-check-circle"}`;

  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ── API helpers ───────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res  = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  } catch (err) {
    throw err;
  }
}

// ── Form validation helpers ───────────────────────────────────────────────

// Map field id → error element id
function _errId(fieldId) {
  // e.g. "f-amount" → "err-amount", "edit-amount" → "edit-err-amount", "b-amount" → "err-budget"
  if (fieldId.startsWith("edit-")) return "edit-err-" + fieldId.slice(5);
  if (fieldId.startsWith("f-"))    return "err-" + fieldId.slice(2);
  if (fieldId.startsWith("b-"))    return "err-budget";
  return "err-" + fieldId;
}

function clearValidation(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("invalid");
    const errEl = document.getElementById(_errId(id));
    if (errEl) errEl.textContent = "";
  });
}

function setFieldError(inputId, errId, msg) {
  const el  = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if (el)  el.classList.add("invalid");
  if (err) err.textContent = msg;
}

function validateExpenseForm(prefix) {
  const amount = document.getElementById(`${prefix}-amount`);
  const cat    = document.getElementById(`${prefix}-category`);
  const date   = document.getElementById(`${prefix}-date`);

  clearValidation(`${prefix}-amount`, `${prefix}-category`, `${prefix}-date`);

  let valid = true;
  if (!amount || !amount.value || parseFloat(amount.value) <= 0) {
    setFieldError(`${prefix}-amount`, _errId(`${prefix}-amount`), "Enter a valid positive amount.");
    valid = false;
  }
  if (!cat || !cat.value) {
    setFieldError(`${prefix}-category`, _errId(`${prefix}-category`), "Please select a category.");
    valid = false;
  }
  if (!date || !date.value) {
    setFieldError(`${prefix}-date`, _errId(`${prefix}-date`), "Please select a date.");
    valid = false;
  }
  return valid;
}

// ── Show/hide feedback banner ─────────────────────────────────────────────
function showFeedback(id, message, type = "success") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`;
  setTimeout(() => { el.className = "form-feedback"; }, 4000);
}

// ── Progress bar helper ───────────────────────────────────────────────────
function updateProgressBar(fillId, labelId, hintId, spent, budget) {
  const fill  = document.getElementById(fillId);
  const label = document.getElementById(labelId);
  const hint  = document.getElementById(hintId);

  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  if (fill) {
    fill.style.width = pct + "%";
    fill.classList.remove("warning", "danger");
    if (pct >= 90) fill.classList.add("danger");
    else if (pct >= 70) fill.classList.add("warning");
  }
  if (label) label.textContent = pct.toFixed(1) + "%";
  if (hint) {
    const remaining = budget - spent;
    if (spent > budget) {
      hint.textContent = `⚠ Over budget by ${formatCurrency(spent - budget)}`;
      hint.style.color = "var(--red-500)";
    } else {
      hint.textContent = `${formatCurrency(remaining)} remaining out of ${formatCurrency(budget)}`;
      hint.style.color = "";
    }
  }
}

// ── Current date string ───────────────────────────────────────────────────
function setCurrentDate() {
  const el = document.getElementById("current-date");
  if (!el) return;
  const now = new Date();
  el.innerHTML = `<i class="fas fa-calendar"></i> ${now.toLocaleDateString("en-IN", { weekday:"short", year:"numeric", month:"short", day:"numeric" })}`;
}
