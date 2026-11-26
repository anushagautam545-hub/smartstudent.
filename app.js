/**
 * app.js — Main application logic
 * Smart Student Expense Tracker
 */

// ── State ─────────────────────────────────────────────────────────────────
let allCategories     = [];
let currentPage       = "dashboard";
let deleteTargetId    = null;
let currentExpenses   = [];

// ── Page metadata ─────────────────────────────────────────────────────────
const PAGE_META = {
  dashboard:   { title: "Dashboard",        subtitle: "Overview of your finances" },
  "add-expense": { title: "Add Expense",    subtitle: "Record a new expense" },
  history:     { title: "Expense History",  subtitle: "View, edit and delete your expenses" },
  charts:      { title: "Charts & Reports", subtitle: "Visual breakdown of your spending" },
  budget:      { title: "Monthly Budget",   subtitle: "Manage your spending limit" }
};

// ═════════════════════════════════════════════════════
//  NAVIGATION
// ═════════════════════════════════════════════════════
function navigateTo(page) {
  // Update nav links
  document.querySelectorAll(".nav-link").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  // Show/hide pages
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");

  // Update topbar titles
  const meta = PAGE_META[page] || {};
  document.getElementById("page-title").textContent    = meta.title    || page;
  document.getElementById("page-subtitle").textContent = meta.subtitle || "";

  currentPage = page;
  closeSidebar();

  // Load page-specific data
  if (page === "dashboard")    loadDashboard();
  if (page === "history")      loadHistory();
  if (page === "charts")       renderChartsPage();
  if (page === "budget")       loadBudgetPage();
  if (page === "add-expense")  prepareAddForm();
}

// ═════════════════════════════════════════════════════
//  SIDEBAR (mobile)
// ═════════════════════════════════════════════════════
function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("overlay").classList.add("active");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("active");
}

// ═════════════════════════════════════════════════════
//  DASHBOARD
// ═════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const res     = await apiFetch("/api/summary");
    const summary = res.data;

    document.getElementById("dash-budget").textContent    = formatCurrency(summary.monthly_budget);
    document.getElementById("dash-monthly").textContent   = formatCurrency(summary.monthly_total);
    document.getElementById("dash-remaining").textContent = formatCurrency(summary.remaining_budget);
    document.getElementById("dash-total").textContent     = formatCurrency(summary.total_expenses);
    document.getElementById("dash-count").textContent     = summary.expense_count + " entries";

    // Remaining card colour
    const remainingCard = document.getElementById("remaining-card");
    if (summary.over_budget) {
      remainingCard.classList.add("over-budget");
    } else {
      remainingCard.classList.remove("over-budget");
    }

    updateProgressBar(
      "progress-fill", "progress-label", "progress-hint",
      summary.monthly_total, summary.monthly_budget
    );

    await loadRecentExpenses();
    await renderDashPie();
  } catch (err) {
    console.error("Dashboard load error:", err);
    showToast("Failed to load dashboard data.", "error");
  }
}

async function loadRecentExpenses() {
  const list = document.getElementById("recent-list");
  try {
    const res = await apiFetch("/api/expenses");
    const expenses = res.data.slice(0, 6);

    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-receipt"></i>
          <p>No expenses yet. <a href="#" onclick="navigateTo('add-expense')">Add one!</a></p>
        </div>`;
      return;
    }

    list.innerHTML = expenses.map(e => `
      <div class="recent-item">
        <span class="recent-cat-badge cat-pill ${categoryClass(e.category)}">${e.category.split(" ")[0]}</span>
        <span class="recent-desc">${e.description || e.category}</span>
        <span class="recent-date">${formatDate(e.date)}</span>
        <span class="recent-amount">${formatCurrency(e.amount)}</span>
      </div>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p class="progress-hint">Failed to load recent expenses.</p>`;
  }
}

// ═════════════════════════════════════════════════════
//  ADD EXPENSE FORM
// ═════════════════════════════════════════════════════
function prepareAddForm() {
  resetForm();
  document.getElementById("f-date").value = todayISO();
}

async function populateCategoryDropdowns() {
  try {
    const res = await apiFetch("/api/categories");
    allCategories = res.data;

    const selects = ["f-category", "edit-category", "filter-category"];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;

      if (id === "filter-category") {
        sel.innerHTML = `<option value="All">All Categories</option>`;
        allCategories.forEach(cat => {
          sel.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
      } else {
        sel.innerHTML = `<option value="">— Select category —</option>`;
        allCategories.forEach(cat => {
          sel.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
      }
    });
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
}

function resetForm() {
  document.getElementById("expense-id").value = "";
  document.getElementById("f-amount").value   = "";
  document.getElementById("f-category").value = "";
  document.getElementById("f-date").value     = todayISO();
  document.getElementById("f-description").value = "";

  clearValidation("f-amount", "f-category", "f-date");
  document.getElementById("form-heading").textContent    = "Add New Expense";
  document.getElementById("form-subheading").textContent = "Fill in the details below to record your expense";
  document.getElementById("form-submit-btn").innerHTML   = '<i class="fas fa-save"></i> Save Expense';
  document.getElementById("form-cancel-btn").style.display = "none";
  document.getElementById("form-feedback").className = "form-feedback";
}

// Handle Add/Edit form submit
document.getElementById("expense-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const id = document.getElementById("expense-id").value;

  if (!validateExpenseForm("f")) return;

  const payload = {
    amount:      parseFloat(document.getElementById("f-amount").value),
    category:    document.getElementById("f-category").value,
    date:        document.getElementById("f-date").value,
    description: document.getElementById("f-description").value.trim()
  };

  const submitBtn = document.getElementById("form-submit-btn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

  try {
    if (id) {
      await apiFetch(`/api/expenses/${id}`, {
        method: "PUT", body: JSON.stringify(payload)
      });
      showToast("Expense updated successfully!", "success");
    } else {
      await apiFetch("/api/expenses", {
        method: "POST", body: JSON.stringify(payload)
      });
      showToast("Expense added successfully!", "success");
    }
    resetForm();
    navigateTo("history");
  } catch (err) {
    showFeedback("form-feedback", err.message, "error");
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Expense';
  }
});

// ═════════════════════════════════════════════════════
//  EXPENSE HISTORY TABLE
// ═════════════════════════════════════════════════════
async function loadHistory(category = null, startDate = null, endDate = null) {
  const tbody = document.getElementById("expense-tbody");
  tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;

  let url = "/api/expenses?";
  if (category && category !== "All") url += `category=${encodeURIComponent(category)}&`;
  if (startDate) url += `start_date=${startDate}&`;
  if (endDate)   url += `end_date=${endDate}&`;

  try {
    const res = await apiFetch(url);
    currentExpenses = res.data;

    document.getElementById("history-count").textContent = res.count;

    const total = currentExpenses.reduce((s, e) => s + e.amount, 0);
    document.getElementById("history-total").textContent = formatCurrency(total);

    if (currentExpenses.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6" class="empty-row">
          <i class="fas fa-inbox"></i> No expenses found.
        </td></tr>`;
      return;
    }

    tbody.innerHTML = currentExpenses.map((e, idx) => `
      <tr>
        <td style="color:var(--gray-400);font-size:.8rem">${idx + 1}</td>
        <td>${formatDate(e.date)}</td>
        <td><span class="cat-pill ${categoryClass(e.category)}">${e.category}</span></td>
        <td style="color:var(--gray-600)">${e.description || "—"}</td>
        <td class="amount-cell">${formatCurrency(e.amount)}</td>
        <td>
          <div class="action-cell">
            <button class="btn btn-icon btn-edit"   onclick="openEditModal(${e.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-icon btn-delete" onclick="openDeleteModal(${e.id})" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Failed to load expenses.</td></tr>`;
    showToast("Failed to load expenses.", "error");
  }
}

// ── Filter actions ────────────────────────────────────────────────────────
function applyFilters() {
  const cat   = document.getElementById("filter-category").value;
  const start = document.getElementById("filter-start").value;
  const end   = document.getElementById("filter-end").value;
  loadHistory(cat, start, end);
}

function clearFilters() {
  document.getElementById("filter-category").value = "All";
  document.getElementById("filter-start").value    = "";
  document.getElementById("filter-end").value      = "";
  loadHistory();
}

// ═════════════════════════════════════════════════════
//  EDIT MODAL
// ═════════════════════════════════════════════════════
async function openEditModal(id) {
  try {
    const res = await apiFetch(`/api/expenses/${id}`);
    const e   = res.data;

    document.getElementById("edit-id").value          = e.id;
    document.getElementById("edit-amount").value      = e.amount;
    document.getElementById("edit-category").value    = e.category;
    document.getElementById("edit-date").value        = e.date;
    document.getElementById("edit-description").value = e.description || "";

    clearValidation("edit-amount", "edit-category", "edit-date");
    document.getElementById("edit-feedback").className = "form-feedback";

    document.getElementById("modal-backdrop").classList.add("open");
  } catch (err) {
    showToast("Could not load expense details.", "error");
  }
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
}

document.getElementById("edit-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const id = document.getElementById("edit-id").value;

  if (!validateExpenseForm("edit")) return;

  const payload = {
    amount:      parseFloat(document.getElementById("edit-amount").value),
    category:    document.getElementById("edit-category").value,
    date:        document.getElementById("edit-date").value,
    description: document.getElementById("edit-description").value.trim()
  };

  try {
    await apiFetch(`/api/expenses/${id}`, {
      method: "PUT", body: JSON.stringify(payload)
    });
    closeModal();
    showToast("Expense updated!", "success");
    loadHistory();
    if (currentPage === "dashboard") loadDashboard();
  } catch (err) {
    showFeedback("edit-feedback", err.message, "error");
  }
});

// ═════════════════════════════════════════════════════
//  DELETE MODAL
// ═════════════════════════════════════════════════════
function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById("delete-backdrop").classList.add("open");
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById("delete-backdrop").classList.remove("open");
}

document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await apiFetch(`/api/expenses/${deleteTargetId}`, { method: "DELETE" });
    closeDeleteModal();
    showToast("Expense deleted.", "info");
    loadHistory();
    if (currentPage === "dashboard") loadDashboard();
  } catch (err) {
    showToast("Failed to delete expense.", "error");
  }
});

// Close modals on backdrop click
document.getElementById("modal-backdrop").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});
document.getElementById("delete-backdrop").addEventListener("click", function(e) {
  if (e.target === this) closeDeleteModal();
});

// ═════════════════════════════════════════════════════
//  BUDGET PAGE
// ═════════════════════════════════════════════════════
async function loadBudgetPage() {
  try {
    const [budgetRes, summaryRes] = await Promise.all([
      apiFetch("/api/budget"),
      apiFetch("/api/summary")
    ]);

    const budget  = budgetRes.monthly_budget;
    const summary = summaryRes.data;

    document.getElementById("current-budget-display").textContent =
      formatCurrency(budget);
    document.getElementById("b-amount").value = budget;

    // Stats
    document.getElementById("bstat-budget").textContent    = formatCurrency(summary.monthly_budget);
    document.getElementById("bstat-spent").textContent     = formatCurrency(summary.monthly_total);
    document.getElementById("bstat-remaining").textContent = formatCurrency(summary.remaining_budget);

    const pct = summary.monthly_budget > 0
      ? Math.min((summary.monthly_total / summary.monthly_budget) * 100, 100)
      : 0;
    document.getElementById("bstat-usage").textContent = pct.toFixed(1) + "%";

    updateProgressBar(
      "budget-progress-fill", null, "budget-progress-hint",
      summary.monthly_total, summary.monthly_budget
    );
  } catch (err) {
    showToast("Failed to load budget data.", "error");
  }
}

document.getElementById("budget-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById("b-amount").value);
  const err = document.getElementById("err-budget");

  err.textContent = "";
  if (!val || val <= 0) {
    err.textContent = "Please enter a valid positive budget amount.";
    document.getElementById("b-amount").classList.add("invalid");
    return;
  }
  document.getElementById("b-amount").classList.remove("invalid");

  try {
    await apiFetch("/api/budget", {
      method: "POST",
      body: JSON.stringify({ monthly_budget: val })
    });
    showToast("Budget updated successfully!", "success");
    showFeedback("budget-feedback", "Budget updated to " + formatCurrency(val), "success");
    loadBudgetPage();
  } catch (err2) {
    showFeedback("budget-feedback", err2.message, "error");
  }
});

// ═════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═════════════════════════════════════════════════════
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeModal();
    closeDeleteModal();
    closeSidebar();
  }
});

// ═════════════════════════════════════════════════════
//  INIT
// ═════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  // Set current date in topbar
  setCurrentDate();

  // Populate category dropdowns
  await populateCategoryDropdowns();

  // Sidebar nav clicks
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
    });
  });

  // Hamburger
  document.getElementById("hamburger").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  // Overlay click
  document.getElementById("overlay").addEventListener("click", closeSidebar);

  // Set default date for add form
  document.getElementById("f-date").value = todayISO();

  // Load dashboard
  navigateTo("dashboard");
});
