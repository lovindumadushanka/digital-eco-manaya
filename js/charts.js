// charts.js - Campus Analytics & Ecological Charts

class CampusChartsController {
  constructor() {
    this.healthChart = null;
    this.zoneChart = null;
  }

  // Update all dashboard cards and Chart.js graphs
  updateAnalytics(trees) {
    if (!trees) return;

    this.updateSummaryCards(trees);
    this.renderHealthChart(trees);
    this.renderZoneChart(trees);
  }

  // Top metric counters
  updateSummaryCards(trees) {
    const totalCount = trees.length;
    
    // Health breakdown
    const thrivingCount = trees.filter((t) => (t.healthStatus || "").toLowerCase() === "thriving").length;
    const healthyCount = trees.filter((t) => (t.healthStatus || "").toLowerCase() === "healthy").length;
    const goodConditionCount = thrivingCount + healthyCount;
    const healthPercent = totalCount > 0 ? Math.round((goodConditionCount / totalCount) * 100) : 0;

    // Unique species count
    const uniqueSpecies = new Set(trees.map((t) => (t.scientificName || t.commonName || "").trim().toLowerCase())).size;

    // Carbon offset total
    const totalCarbonKg = trees.reduce((acc, t) => acc + (parseFloat(t.carbonOffsetKg) || 0), 0);
    const carbonFormatted = totalCarbonKg >= 1000 
      ? (totalCarbonKg / 1000).toFixed(2) + " t" 
      : Math.round(totalCarbonKg) + " kg";

    // Update DOM elements
    const elTotal = document.getElementById("metric-total-trees");
    const elHealth = document.getElementById("metric-health-ratio");
    const elSpecies = document.getElementById("metric-species-count");
    const elCarbon = document.getElementById("metric-carbon-offset");

    if (elTotal) elTotal.textContent = totalCount;
    if (elHealth) elHealth.textContent = `${healthPercent}%`;
    if (elSpecies) elSpecies.textContent = uniqueSpecies;
    if (elCarbon) elCarbon.textContent = carbonFormatted;
  }

  // Health Donut Chart
  renderHealthChart(trees) {
    const canvas = document.getElementById("chart-health-status");
    if (!canvas || typeof Chart === "undefined") return;

    const counts = {
      Thriving: 0,
      Healthy: 0,
      "Needs Care": 0,
      Critical: 0
    };

    trees.forEach((t) => {
      const status = t.healthStatus || "Healthy";
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts["Healthy"]++;
      }
    });

    const isDarkMode = document.body.classList.contains("dark-theme");
    const textColor = isDarkMode ? "#e2e8f0" : "#334155";

    const data = {
      labels: ["Thriving (ඉතා සරු)", "Healthy (නිරෝගී)", "Needs Care (අවධානය අවශ්‍ය)", "Critical (අවදානම්)"],
      datasets: [
        {
          data: [counts.Thriving, counts.Healthy, counts["Needs Care"], counts.Critical],
          backgroundColor: ["#10b981", "#22c55e", "#f59e0b", "#ef4444"],
          borderColor: isDarkMode ? "#1e293b" : "#ffffff",
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    };

    if (this.healthChart) {
      this.healthChart.data = data;
      this.healthChart.options.plugins.legend.labels.color = textColor;
      this.healthChart.update();
    } else {
      this.healthChart = new Chart(canvas, {
        type: "doughnut",
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: textColor,
                boxWidth: 12,
                padding: 12,
                font: { family: "'Outfit', 'Inter', sans-serif", size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((val / total) * 100) : 0;
                  return ` ${context.label}: ${val} trees (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  // Zone Distribution Bar Chart
  renderZoneChart(trees) {
    const canvas = document.getElementById("chart-zone-distribution");
    if (!canvas || typeof Chart === "undefined") return;

    const zoneCounts = {};
    trees.forEach((t) => {
      const zone = t.zone || "General Campus";
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });

    const isDarkMode = document.body.classList.contains("dark-theme");
    const textColor = isDarkMode ? "#e2e8f0" : "#334155";
    const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    const labels = Object.keys(zoneCounts);
    const values = Object.values(zoneCounts);

    const data = {
      labels: labels,
      datasets: [
        {
          label: "Number of Trees (පැල ගණන)",
          data: values,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          hoverBackgroundColor: "#10b981",
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    };

    if (this.zoneChart) {
      this.zoneChart.data = data;
      this.zoneChart.options.scales.x.ticks.color = textColor;
      this.zoneChart.options.scales.y.ticks.color = textColor;
      this.zoneChart.options.scales.x.grid.color = gridColor;
      this.zoneChart.options.scales.y.grid.color = gridColor;
      this.zoneChart.update();
    } else {
      this.zoneChart = new Chart(canvas, {
        type: "bar",
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } },
              grid: { color: gridColor }
            },
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: textColor, font: { family: "'Inter', sans-serif", size: 11 } },
              grid: { color: gridColor }
            }
          }
        }
      });
    }
  }

  // Refresh chart themes when dark/light mode is switched
  refreshTheme(trees) {
    if (this.healthChart) {
      this.healthChart.destroy();
      this.healthChart = null;
    }
    if (this.zoneChart) {
      this.zoneChart.destroy();
      this.zoneChart = null;
    }
    this.renderHealthChart(trees);
    this.renderZoneChart(trees);
  }
}

// Global campusCharts instance
const campusCharts = new CampusChartsController();
