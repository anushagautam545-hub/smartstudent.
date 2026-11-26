/**
 * charts.js — Chart.js rendering for Smart Student Expense Tracker
 */

// Store chart instances so we can destroy & re-render
let categoryChartInstance = null;
let monthlyChartInstance  = null;
let dashPieChartInstance  = null;

// ── Shared Chart defaults ─────────────────────────────────────────────────
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.plugins.legend.display = false;

// ── Category Pie Chart (Charts page) ─────────────────────────────────────
async function renderCategoryChart() {
  const wrap = document.getElementById("category-chart-wrap");
  if (!wrap) return;

  if (!document.getElementById("category-chart")) {
    wrap.innerHTML = `<canvas id="category-chart"></canvas>`;
  }
  const canvas = document.getElementById("category-chart");

  try {
    const res = await apiFetch("/api/charts/category");
    const data = res.data;

    if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }

    if (!data || data.length === 0) {
      wrap.innerHTML =
        `<div class="empty-state"><i class="fas fa-chart-pie"></i>
         <p>No expense data for this month.</p></div>`;
      return;
    }

    const labels = data.map(d => d.category);
    const values = data.map(d => d.total);
    const colors = data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

    categoryChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { size: 12, weight: "500" },
              color: "#374151"
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Category chart error:", err);
  }
}

// ── Monthly Bar Chart (Charts page) ──────────────────────────────────────
async function renderMonthlyChart() {
  const wrap = document.getElementById("monthly-chart-wrap");
  if (!wrap) return;

  if (!document.getElementById("monthly-chart")) {
    wrap.innerHTML = `<canvas id="monthly-chart"></canvas>`;
  }
  const canvas = document.getElementById("monthly-chart");

  try {
    const res  = await apiFetch("/api/charts/monthly");
    const data = res.data;

    if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }

    if (!data || data.length === 0) {
      wrap.innerHTML =
        `<div class="empty-state"><i class="fas fa-chart-bar"></i>
         <p>No spending data for the last 6 months.</p></div>`;
      return;
    }

    const labels = data.map(d => formatMonthLabel(d.month));
    const values = data.map(d => d.total);

    monthlyChartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Spending (₹)",
          data: values,
          backgroundColor: values.map((_, i) =>
            i === values.length - 1 ? "#22c55e" : "#86efac"
          ),
          borderColor: values.map((_, i) =>
            i === values.length - 1 ? "#16a34a" : "#4ade80"
          ),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Spent: ${formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: "#6b7280" }
          },
          y: {
            grid: { color: "#f3f4f6", lineWidth: 1 },
            ticks: {
              font: { size: 11 }, color: "#6b7280",
              callback: v => "₹" + v.toLocaleString("en-IN")
            },
            beginAtZero: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Monthly chart error:", err);
  }
}

// ── Dashboard Mini Pie ────────────────────────────────────────────────────
async function renderDashPie() {
  const wrap   = document.getElementById("dash-pie-wrap");
  const legend = document.getElementById("dash-legend");
  if (!wrap) return;

  // Always restore the canvas before drawing (empty-state may have replaced it)
  if (!document.getElementById("dash-pie-chart")) {
    wrap.innerHTML = `<canvas id="dash-pie-chart"></canvas>`;
  }
  const canvas = document.getElementById("dash-pie-chart");

  try {
    const res  = await apiFetch("/api/charts/category");
    const data = res.data;

    if (dashPieChartInstance) { dashPieChartInstance.destroy(); dashPieChartInstance = null; }

    if (!data || data.length === 0) {
      wrap.innerHTML =
        `<div class="empty-state" style="min-height:160px">
           <i class="fas fa-chart-pie"></i>
           <p style="font-size:.8rem">No data yet.</p>
         </div>`;
      if (legend) legend.innerHTML = "";
      return;
    }

    const labels = data.map(d => d.category);
    const values = data.map(d => d.total);
    const colors = data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    const total  = values.reduce((s, v) => s + v, 0);

    dashPieChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
            }
          }
        }
      }
    });

    // Build custom legend
    if (legend) {
      legend.innerHTML = data.slice(0, 5).map((d, i) =>
        `<div class="legend-item">
           <span class="legend-dot" style="background:${colors[i]}"></span>
           <span>${d.category.split(" ")[0]} – ${formatCurrency(d.total)}</span>
         </div>`
      ).join("");
    }
  } catch (err) {
    console.error("Dashboard pie error:", err);
  }
}

// ── Top Categories summary ────────────────────────────────────────────────
async function renderTopCategories() {
  const container = document.getElementById("top-categories");
  if (!container) return;

  try {
    const res  = await apiFetch("/api/charts/category");
    const data = res.data;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="progress-hint">No data for this month.</p>`;
      return;
    }

    const total = data.reduce((s, d) => s + d.total, 0);
    container.innerHTML = data.slice(0, 5).map((d, i) => `
      <div class="top-cat-item">
        <span class="top-cat-name">
          <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]};display:inline-block;margin-right:.4rem"></span>
          ${d.category}
        </span>
        <span class="top-cat-amount">${formatCurrency(d.total)}</span>
        <span class="top-cat-pct">${total > 0 ? ((d.total/total)*100).toFixed(1) : 0}% of total</span>
      </div>
    `).join("");
  } catch (err) {
    console.error("Top categories error:", err);
  }
}

// ── Render all charts page ────────────────────────────────────────────────
async function renderChartsPage() {
  await Promise.all([
    renderCategoryChart(),
    renderMonthlyChart(),
    renderTopCategories()
  ]);
}
