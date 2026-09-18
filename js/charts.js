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
    this.renderOverallGrowthChart(trees);
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
    if (this.overallGrowthChart) {
      this.overallGrowthChart.destroy();
      this.overallGrowthChart = null;
    }
    this.renderHealthChart(trees);
    this.renderZoneChart(trees);
    this.renderOverallGrowthChart(trees);
  }

  // Render Individual Tree Growth Chart
  renderTreeGrowthChart(tree) {
    const canvas = document.getElementById("chart-tree-growth");
    if (!canvas || typeof Chart === "undefined") return;

    // Combine original state with history
    const historyData = [];
    
    // Add baseline (when tree was added) if we have the data.
    // If not, we just use the history logs.
    if (tree.createdAt && tree.height && tree.dbh) {
      // It's hard to know exactly what height/dbh was at createdAt vs what it is now 
      // without history, but history logs changes.
      // Actually, history logs the new state. 
    }
    
    // Sort history chronologically
    const sortedHistory = [...(tree.history || [])].sort((a,b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    
    // Format labels and data
    const labels = sortedHistory.map(h => {
      const d = new Date(h.updatedAt);
      return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    });
    
    const heights = sortedHistory.map(h => parseFloat(h.height) || 0);
    const dbhs = sortedHistory.map(h => parseFloat(h.dbh) || 0);
    
    const isDarkMode = document.body.classList.contains("dark-theme");
    const textColor = isDarkMode ? "#e2e8f0" : "#334155";
    const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    const data = {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'Height (CM)',
          data: heights,
          backgroundColor: '#3b82f6', // Blue like the user's reference
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'DBH (CM)',
          data: dbhs,
          borderColor: '#f97316', // Orange like the user's reference
          backgroundColor: '#f97316',
          borderWidth: 2,
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    };
    
    // Destroy existing chart instance if it exists on this canvas
    if (window.treeGrowthChartInstance) {
      window.treeGrowthChartInstance.destroy();
    }

    window.treeGrowthChartInstance = new Chart(canvas, {
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Height (m)', color: textColor },
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'DBH (cm)', color: textColor },
            ticks: { color: textColor },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // Render Overall Campus Growth Trend
  renderOverallGrowthChart(trees) {
    const canvas = document.getElementById("chart-overall-growth");
    if (!canvas || typeof Chart === "undefined") return;

    // Aggregate all history data by Month-Year
    const aggregated = {};

    trees.forEach(tree => {
      if (!tree.history) return;
      tree.history.forEach(h => {
        const d = new Date(h.updatedAt);
        const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0'); // e.g. 2024-04
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g. Apr-24
        
        if (!aggregated[key]) {
          aggregated[key] = { label: label, heightSum: 0, dbhSum: 0, count: 0, dateObj: d };
        }
        aggregated[key].heightSum += parseFloat(h.height) || 0;
        aggregated[key].dbhSum += parseFloat(h.dbh) || 0;
        aggregated[key].count += 1;
      });
    });

    // Sort buckets chronologically
    const sortedKeys = Object.keys(aggregated).sort();
    
    const labels = [];
    const avgHeights = [];
    const avgDbhs = [];

    sortedKeys.forEach(k => {
      const bucket = aggregated[k];
      labels.push(bucket.label);
      avgHeights.push((bucket.heightSum / bucket.count).toFixed(2));
      avgDbhs.push((bucket.dbhSum / bucket.count).toFixed(2));
    });

    const isDarkMode = document.body.classList.contains("dark-theme");
    const textColor = isDarkMode ? "#e2e8f0" : "#334155";
    const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    const data = {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'Average Height (m)',
          data: avgHeights,
          backgroundColor: '#3b82f6',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Average DBH (cm)',
          data: avgDbhs,
          borderColor: '#f97316',
          backgroundColor: '#f97316',
          borderWidth: 2,
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    };

    if (this.overallGrowthChart) {
      this.overallGrowthChart.data = data;
      this.overallGrowthChart.options.scales.x.ticks.color = textColor;
      this.overallGrowthChart.options.scales.x.grid.color = gridColor;
      this.overallGrowthChart.options.scales.y.title.color = textColor;
      this.overallGrowthChart.options.scales.y.ticks.color = textColor;
      this.overallGrowthChart.options.scales.y.grid.color = gridColor;
      this.overallGrowthChart.options.scales.y1.title.color = textColor;
      this.overallGrowthChart.options.scales.y1.ticks.color = textColor;
      this.overallGrowthChart.update();
    } else {
      this.overallGrowthChart = new Chart(canvas, {
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor }
            }
          },
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Avg Height (m)', color: textColor },
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Avg DBH (cm)', color: textColor },
              ticks: { color: textColor },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }
  }
}

// Global campusCharts instance
const campusCharts = new CampusChartsController();
