// filter elements
const countryFilter = document.getElementById("countryfilter");
const yearFilter = document.getElementById("yearfilter");

// App State
const state = {
  rawData: [],
  filteredData: [],
  filters: {
    country: "All",
    year: "All"
  },
  isLoading: true,
  hasError: false
};

// loading state
function showLoading() {
  const insights = document.querySelectorAll('.insights-value');
  insights.forEach(el => {
    el.innerHTML = '<span class="loading-spinner"></span>';
  });
  
  document.getElementById("dataList").innerHTML = '<tr><td colspan="5" class="loading-message">Loading data...</td></tr>';
  document.getElementById("chartContainer").innerHTML = '<div class="loading-message">Loading chart...</div>';
}

//  error state
function showError(message) {
  const container = document.querySelector('.insights-container');
  container.innerHTML = `<div class="error-message">${message}</div>`;
  document.getElementById("dataList").innerHTML = `<tr><td colspan="5" class="error-message">${message}</td></tr>`;
}

// empty state
function showEmptyState() {
  document.getElementById("dataList").innerHTML = '<tr><td colspan="5" class="empty-state">No data matches your filters. Try adjusting your selection.</td></tr>';
  
  const insights = document.querySelectorAll('.insights-value');
  insights.forEach(el => {
    el.textContent = '--';
  });
  
  document.getElementById("chartContainer").innerHTML = '<div class="empty-state">No data to display</div>';
}

// reset filters 
function addResetButton() {
  const filterSection = document.querySelector('#filter h2');
  const resetBtn = document.createElement('button');
  resetBtn.id = 'resetFilters';
  resetBtn.className = 'reset-btn';
  resetBtn.innerHTML = '↻ Reset Filters';
  resetBtn.style.display = 'none';
  
  resetBtn.addEventListener('click', () => {
    state.filters.country = "All";
    state.filters.year = "All";
    countryFilter.value = "All";
    yearFilter.value = "All";
    applyFilters();
  });
  
  filterSection.appendChild(resetBtn);
}

// rest button display thing
function updateResetButton() {
  const resetBtn = document.getElementById('resetFilters');
  if (state.filters.country !== "All" || state.filters.year !== "All") {
    resetBtn.style.display = 'inline-block';
  } else {
    resetBtn.style.display = 'none';
  }
}

// Initialize
showLoading();
addResetButton();

// Fetch data from the json file
fetch("data.json")
  .then(res => {
    if (!res.ok) throw new Error('Failed to load data');
    return res.json();
  })
  .then(data => {
    state.rawData = data;
    state.isLoading = false;
    applyFilters();
  })
  .catch(err => {
    console.error(err);
    state.hasError = true;
    state.isLoading = false;
    showError('Failed to load data. Please refresh the page.');
  });

// Apply filters
function applyFilters() {
  let result = [...state.rawData];

  // Country filter
  if (state.filters.country !== "All") {
    result = result.filter(item => item.country === state.filters.country);
  }

  // Year filter
  if (state.filters.year !== "All") {
    result = result.filter(item => item.year == state.filters.year);
  }

  state.filteredData = result;
  
  // Update reset button
  updateResetButton();
  
  // Handle empty results
  if (result.length === 0) {
    showEmptyState();
    return;
  }
  
  renderTable(result);
  updateInsights(result);
  updateTrend(result);
  updateSummary(result);
  renderChart(result);
}

// Render table with context info
function renderTable(data) {
  const tbody = document.getElementById("dataList");
  tbody.innerHTML = "";

  data.forEach(item => {
    const row = document.createElement("tr");
    
    // Add visual indicator for change
    const changeValue = parseFloat(item.change_from_previous_year);
    let changeClass = '';
    let changeSymbol = '';
    
    if (changeValue > 0) {
      changeClass = 'change-up';
      changeSymbol = '▲';
    } else if (changeValue < 0) {
      changeClass = 'change-down';
      changeSymbol = '▼';
    } else {
      changeClass = 'change-neutral';
      changeSymbol = '−';
    }

    row.innerHTML = `
      <td>${item.country}</td>
      <td>${item.year}</td>
      <td><strong>${item.inflation_rate}%</strong></td>
      <td class="${changeClass}">${changeSymbol} ${item.change_from_previous_year}%</td>
      <td class="source-cell">${item.source}</td>
    `;

    tbody.appendChild(row);
  });
}

function updateInsights(data) {
  // If no data
  if (data.length === 0) {
    document.getElementById("current-rate").textContent = "--";
    document.getElementById("highest-rate").textContent = "--";
    document.getElementById("lowest-rate").textContent = "--";
    document.getElementById("average-rate").textContent = "--";
    return;
  }

  // Get inflation values
  const rates = data.map(item => item.inflation_rate);

  // Highest
  const highest = Math.max(...rates);
  const highestItem = data.find(item => item.inflation_rate === highest);

  // Lowest
  const lowest = Math.min(...rates);
  const lowestItem = data.find(item => item.inflation_rate === lowest);

  // Average
  const average = rates.reduce((sum, val) => sum + val, 0) / rates.length;

  // Current (latest year)
  const latest = data.reduce((prev, curr) =>
    curr.year > prev.year ? curr : prev
  );

  // Update UI with context
  document.getElementById("current-rate").innerHTML = 
    `${latest.inflation_rate.toFixed(2)}% <span class="context-info">${latest.country}, ${latest.year}</span>`;

  document.getElementById("highest-rate").innerHTML = 
    `${highest.toFixed(2)}% <span class="context-info">${highestItem.country}, ${highestItem.year}</span>`;

  document.getElementById("lowest-rate").innerHTML = 
    `${lowest.toFixed(2)}% <span class="context-info">${lowestItem.country}, ${lowestItem.year}</span>`;

  document.getElementById("average-rate").innerHTML = 
    `${average.toFixed(2)}%`;
}

function updateTrend(data) {
  const trendBox = document.getElementById("trend");

  // If no data
  if (data.length === 0) {
    trendBox.textContent = "--";
    return;
  }

  // If all countries selected - show message
  if (state.filters.country === "All") {
    trendBox.innerHTML = '<span class="helper-text">Select a specific country</span>';
    return;
  }

  // Filter selected country
  const countryData = data.filter(
    item => item.country === state.filters.country
  );

  // Need at least 2 data points
  if (countryData.length < 2) {
    trendBox.innerHTML = '<span class="helper-text">Need multiple years</span>';
    return;
  }

  // Sort by year
  countryData.sort((a, b) => a.year - b.year);

  // Get first & last
  const first = countryData[0].inflation_rate;
  const last = countryData[countryData.length - 1].inflation_rate;

  let trendText = "";
  let trendClass = "";

  if (last > first) {
    trendText = "Rising";
    trendClass = "trend-up";
  } else if (last < first) {
    trendText = "Falling";
    trendClass = "trend-down";
  } else {
    trendText = "Stable";
    trendClass = "trend-neutral";
  }

  // Display with visual indicator
  trendBox.innerHTML = 
    `<span class="${trendClass}">${trendText}</span> <span class="trend-range">${first}% → ${last}%</span>`;
}

function updateSummary(data) {
  const box = document.getElementById("summary");

  if (data.length === 0) {
    box.textContent = "--";
    return;
  }

  if (state.filters.country === "All") {
    box.innerHTML = '<span class="helper-text">Select a specific country for detailed summary</span>';
    return;
  }

  const countryData = data.filter(
    item => item.country === state.filters.country
  );

  if (countryData.length < 2) {
    box.innerHTML = '<span class="helper-text">Need multiple years for summary</span>';
    return;
  }

  countryData.sort((a, b) => a.year - b.year);

  const first = countryData[0];
  const last = countryData[countryData.length - 1];

  let peak = countryData[0];
  countryData.forEach(item => {
    if (item.inflation_rate > peak.inflation_rate) {
      peak = item;
    }
  });

  let direction = last.inflation_rate > first.inflation_rate ? "rose" : "fell";

  box.textContent =
    `${state.filters.country}'s inflation ${direction} from ${first.inflation_rate}% in ${first.year} to ${last.inflation_rate}% in ${last.year}, peaking at ${peak.inflation_rate}% in ${peak.year}.`;
}

function renderChart(data) {
  const container = document.getElementById("chartContainer");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state">No data to display</div>';
    return;
  }

  if (state.filters.country === "All") {
    container.innerHTML = '<div class="helper-text">Select a specific country to view trend chart</div>';
    return;
  }

  // Filter selected country
  const countryData = data.filter(
    item => item.country === state.filters.country
  );

  // Sort by year
  countryData.sort((a, b) => a.year - b.year);

  // Find max for scaling
  const max = Math.max(...countryData.map(item => item.inflation_rate));
  const min = Math.min(...countryData.map(item => item.inflation_rate));

  // Add Y-axis labels
  const yAxis = document.createElement("div");
  yAxis.className = "y-axis";
  
  const yMax = document.createElement("span");
  yMax.className = "y-label";
  yMax.textContent = max.toFixed(1) + "%";
  
  const yMid = document.createElement("span");
  yMid.className = "y-label";
  yMid.textContent = ((max + min) / 2).toFixed(1) + "%";
  
  const yMin = document.createElement("span");
  yMin.className = "y-label";
  yMin.textContent = min.toFixed(1) + "%";
  
  yAxis.appendChild(yMax);
  yAxis.appendChild(yMid);
  yAxis.appendChild(yMin);
  container.appendChild(yAxis);

  // Create bars container
  const barsContainer = document.createElement("div");
  barsContainer.className = "bars-container";

  countryData.forEach((item, index) => {
    const barWrapper = document.createElement("div");
    barWrapper.className = "bar-wrapper";

    const bar = document.createElement("div");
    bar.classList.add("bar");

    // Scale height (min 20px for visibility)
    const height = Math.max(20, (item.inflation_rate / max) * 180);
    bar.style.height = height + "px";
    
    // Add tooltip
    bar.setAttribute('data-tooltip', `${item.year}: ${item.inflation_rate}%`);
    
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = item.inflation_rate + "%";
    bar.appendChild(value);

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.year;

    barWrapper.appendChild(bar);
    barWrapper.appendChild(label);
    barsContainer.appendChild(barWrapper);
    
    // Add animation delay
    bar.style.animationDelay = `${index * 0.1}s`;
  });

  container.appendChild(barsContainer);
}

// Filter listeners
countryFilter.addEventListener("change", e => {
  state.filters.country = e.target.value;
  applyFilters();
});

yearFilter.addEventListener("change", e => {
  state.filters.year = e.target.value;
  applyFilters();
});