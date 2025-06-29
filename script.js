const apiEndpoint = 'api_get.php'; // Your PHP proxy file

let labels = [];
let systemAvailability = [];
let targetAvailability = [];

let chart;
let barColors = [];

// DOM references
const avgEl = document.querySelector('.metric-card:nth-child(1) .metric-value');
const complianceEl = document.querySelector('.metric-card:nth-child(2) .metric-value');
const peakEl = document.querySelector('.metric-card:nth-child(3) .metric-value');
const searchResults = document.getElementById('searchResults');

// Fetch data from API and initialize dashboard
fetch(apiEndpoint)
  .then(res => res.json())
  .then(json => {
    const data = json.data.sys_availability_details;

    // Reverse for chronological order
    data.reverse();

    labels = data.map(d => formatLabel(d.month));
    systemAvailability = data.map(d => parseFloat(d.sys_availability));
    targetAvailability = data.map(d => parseFloat(d.target_sys_availability));

    updateMetrics();
    renderChart();
    setInitialDates();
  })
  .catch(err => {
    console.error("API Fetch Error:", err);
    searchResults.innerHTML = `<div class="result-card"><p>Failed to load data.</p></div>`;
  });

// Format YYYY-MM-DD to Mon-YYYY
function formatLabel(date) {
  const d = new Date(date);
  return d.toLocaleString('default', { month: 'short' }) + '-' + d.getFullYear();
}

// Update dynamic metric cards
function updateMetrics() {
  const total = systemAvailability.length;
  const avg = (systemAvailability.reduce((a, b) => a + b, 0) / total).toFixed(3);
  const peak = Math.max(...systemAvailability).toFixed(3);
  const compliantMonths = systemAvailability.filter((val, i) => val >= targetAvailability[i]).length;
  const compliance = ((compliantMonths / total) * 100).toFixed(1);

  avgEl.textContent = `${avg}%`;
  complianceEl.textContent = `${compliance}%`;
  peakEl.textContent = `${peak}%`;

  document.querySelector('.metric-card:nth-child(2) .performance-indicator span:last-child').textContent =
    `${compliantMonths} of ${total} months met target`;
  document.querySelector('.metric-card:nth-child(1) .performance-indicator span:last-child').textContent =
    `${(avg - 98.5 >= 0 ? '+' : '') + (avg - 98.5).toFixed(2)}% above target`;
  document.querySelector('.metric-card:nth-child(3) .performance-indicator span:last-child').textContent =
    `Achieved in ${labels[systemAvailability.indexOf(parseFloat(peak))]}`;
}

function renderChart() {
  const ctx = document.getElementById('availabilityChart').getContext('2d');
  barColors = Array(labels.length).fill('rgba(74, 107, 255, 0.7)');

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'System Availability',
          data: systemAvailability,
          backgroundColor: barColors,
          borderRadius: 5
        },
        {
          label: 'Target Availability',
          data: targetAvailability,
          type: 'line',
          borderColor: 'orange',
          borderWidth: 3,
          pointBackgroundColor: 'orange',
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: context => {
              return `${context.dataset.label}: ${context.raw.toFixed(3)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 98,
          max: 100,
          ticks: {
            callback: value => `${value}%`
          }
        }
      }
    }
  });
}

// FILTER SYSTEM

const monthPicker = document.getElementById('monthPicker');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const searchModeToggle = document.getElementById('searchModeToggle');
let searchMode = 'month';

searchModeToggle.addEventListener('click', e => {
  if (e.target.classList.contains('mode-btn')) {
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    searchMode = e.target.dataset.mode;

    document.getElementById('monthSearchGroup').style.display = searchMode === 'month' ? 'flex' : 'none';
    document.getElementById('rangeSearchGroup').style.display = searchMode === 'range' ? 'flex' : 'none';
    document.getElementById('endDateGroup').style.display = searchMode === 'range' ? 'flex' : 'none';
  }
});

document.getElementById('applyFilter').addEventListener('click', () => {
  if (searchMode === 'month') {
    const month = formatLabel(monthPicker.value + "-01");
    const index = labels.indexOf(month);
    if (index === -1) return showError("Month not found");
    barColors = Array(labels.length).fill('rgba(74, 107, 255, 0.7)');
    barColors[index] = 'rgba(255, 87, 34, 0.9)';
    chart.data.datasets[0].backgroundColor = barColors;
    chart.update();
    showMonthInfo(index);
  } else {
    const start = formatLabel(startDate.value + "-01");
    const end = formatLabel(endDate.value + "-01");
    const startIdx = labels.indexOf(start);
    const endIdx = labels.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return showError("Invalid range");

    const rangeLabels = labels.slice(startIdx, endIdx + 1);
    const rangeSystem = systemAvailability.slice(startIdx, endIdx + 1);
    const rangeTarget = targetAvailability.slice(startIdx, endIdx + 1);

    chart.data.labels = rangeLabels;
    chart.data.datasets[0].data = rangeSystem;
    chart.data.datasets[1].data = rangeTarget;
    chart.data.datasets[0].backgroundColor = Array(rangeLabels.length).fill('rgba(74, 107, 255, 0.7)');
    chart.update();

    const avgSystem = (rangeSystem.reduce((a, b) => a + b, 0) / rangeSystem.length).toFixed(3);
    const avgTarget = (rangeTarget.reduce((a, b) => a + b, 0) / rangeTarget.length).toFixed(3);
    const peak = Math.max(...rangeSystem).toFixed(3);
    const low = Math.min(...rangeSystem).toFixed(3);

    searchResults.innerHTML = `
      <div class="result-card">
        <div class="result-header"><span>Range: ${start} - ${end}</span></div>
        <div class="result-values">
          <p>Average Availability: <strong>${avgSystem}%</strong></p>
          <p>Average Target: <strong>${avgTarget}%</strong></p>
          <p>Highest: <strong>${peak}%</strong>, Lowest: <strong>${low}%</strong></p>
        </div>
      </div>
    `;
    searchResults.classList.add('active');
  }
});

document.getElementById('resetFilter').addEventListener('click', () => {
  chart.data.labels = labels;
  chart.data.datasets[0].data = systemAvailability;
  chart.data.datasets[1].data = targetAvailability;
  chart.data.datasets[0].backgroundColor = Array(labels.length).fill('rgba(74, 107, 255, 0.7)');
  chart.update();
  searchResults.innerHTML = '';
  searchResults.classList.remove('active');
});

function showMonthInfo(index) {
  const label = labels[index];
  const sys = systemAvailability[index].toFixed(3);
  const tgt = targetAvailability[index].toFixed(3);
  const diff = (sys - tgt).toFixed(3);

  searchResults.innerHTML = `
    <div class="result-card">
      <div class="result-header"><span>${label}</span></div>
      <div class="result-values">
        <p>System: <strong>${sys}%</strong></p>
        <p>Target: <strong>${tgt}%</strong></p>
        <p>Performance: <strong style="color:${diff >= 0 ? '#00c853' : '#ff5252'}">${diff >= 0 ? '+' : ''}${diff}%</strong></p>
      </div>
    </div>
  `;
  searchResults.classList.add('active');
}

function showError(msg) {
  searchResults.innerHTML = `<div class="result-card"><p>${msg}</p></div>`;
  searchResults.classList.add('active');
}

