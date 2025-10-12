// Global variables
let currentChart;
let metalData = {}; // Store fetched data
let currencyData = {};
let historicalData = {}; // Will be populated with mock

// Sample mock data for demo (enhanced for completeness)
const sampleMetalData = {
    success: true,
    timestamp: Date.now(),
    gold: { usd: 2050.50, inr: 171500, eur: 1890, gbp: 1590, jpy: 308000 },
    silver: { usd: 25.20, inr: 2100, eur: 23.20, gbp: 19.60, jpy: 3790 },
    platinum: { usd: 950.00, inr: 79300, eur: 875, gbp: 737, jpy: 142800 },
    palladium: { usd: 1000.00, inr: 83500, eur: 921, gbp: 776, jpy: 150300 }
};

const sampleCurrencyData = {
    base: 'USD',
    date: new Date().toISOString().split('T')[0],
    rates: {
        USD: 1.00,
        EUR: 0.92,
        GBP: 0.78,
        JPY: 150.00,
        INR: 83.50,
        CAD: 1.35,
        AUD: 1.50,
        CHF: 0.88
    }
};

// Mock historical data (monthly averages in USD per oz for gold/silver/platinum, 2019-2023)
function generateMockHistoricalData() {
    const years = [2019, 2020, 2021, 2022, 2023];
    const metals = ['gold', 'silver', 'platinum'];
    const data = {};

    metals.forEach(metal => {
        data[metal] = {};
        years.forEach(year => {
            // Generate 12 monthly values with realistic trends (e.g., gold rose post-2020)
            const basePrice = metal === 'gold' ? (1200 + (year - 2019) * 150) : 
                              metal === 'silver' ? (15 + (year - 2019) * 3) : 
                              (900 + (year - 2019) * 50);
            data[metal][year] = Array.from({length: 12}, (_, i) => 
                Math.round(basePrice + Math.sin(i / 2) * 50 + (year > 2020 ? 100 : 0) * 2)
            );
        });
    });
    return data;
}

// API Keys (replace with yours for live data)
const METALS_API_KEY = 'YOUR_METALS_API_KEY'; // Get free from metals-api.com
const CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'; // Free, no key

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    historicalData = generateMockHistoricalData();
    showPage('home');
    updateLiveTime();
    setInterval(updateLiveTime, 1000);
    fetchLiveRates();
    setInterval(fetchLiveRates, 60000); // Auto-refresh every 60s
    fetchCurrencyData();
    setupEventListeners();
});

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'live-rates') fetchLiveRates();
    if (pageId === 'currency') fetchCurrencyData();
    if (pageId === 'historical') updateChart();
    performSearch(); // Re-apply search on page change
}

function toggleMenu() {
    const menu = document.querySelector('.nav-menu');
    menu.classList.toggle('active');
}

// Live Time
function updateLiveTime() {
    const now = new Date();
    document.getElementById('liveTime').textContent = `Live: ${now.toLocaleString()}`;
}

// Fetch Live Rates
async function fetchLiveRates() {
    try {
        if (METALS_API_KEY === 'YOUR_METALS_API_KEY') {
            console.log('Using sample metal data (add API key for live)');
            metalData = sampleMetalData;
        } else {
            // Real Metals-API call (adjust symbols for metals: XAU=gold, XAG=silver, etc.)
            const response = await fetch(`https://metals-api.com/api/latest?access_key=${METALS_API_KEY}&base=USD&symbols=XAU,XAG,XPT,XPD`);
            if (!response.ok) throw new Error('API Error');
            const apiData = await response.json();
            // Map API response to our format (API returns rates like {XAU: 2050})
            metalData = {
                success: true,
                timestamp: apiData.date,
                gold: { usd: apiData.rates.XAU, /* Convert to other currencies using currencyData */ },
                silver: { usd: apiData.rates.XAG },
                platinum: { usd: apiData.rates.XPT },
                palladium: { usd: apiData.rates.XPD }
            };
            // Fetch currency rates to convert (simplified; in prod, do one call)
            await fetchCurrencyData();
            convertToCurrencies(metalData);
        }
        populateLiveRates();
        populateHomeOverview();
        updateGainersLosers();
        document.getElementById('lastUpdate').textContent = new Date(metalData.timestamp).toLocaleString();
    } catch (error) {
        console.error('Metal API Error:', error);
        metalData = sampleMetalData;
        populateLiveRates();
        populateHomeOverview();
        updateGainersLosers();
    }
}

// Convert metal prices to other currencies using currencyData
function convertToCurrencies(data) {
    const currencies = ['inr', 'eur', 'gbp', 'jpy'];
    ['gold', 'silver', 'platinum', 'palladium'].forEach(metal => {
        currencies.forEach(curr => {
            data[metal][curr] = Math.round(data[metal].usd * currencyData.rates[curr.toUpperCase()]);
        });
    });
}

// Populate Live Rates Page
function populateLiveRates() {
    const grid = document.getElementById('ratesGrid');
    grid.innerHTML = '';
    const metals = ['gold', 'silver', 'platinum', 'palladium'];
    const currencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY'];

    metals.forEach(metal => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${metal.charAt(0).toUpperCase() + metal.slice(1)}</h3>
            <div class="rate-item"><strong>Per Gram:</strong></div>
            ${currencies.map(curr => `<div class="rate-item">${curr}: ${Math.round(metalData[metal][curr.toLowerCase()] / 31.1)} ${curr}</div>`).join('')}
            <div class="rate-item"><strong>Per 10g:</strong></div>
            ${currencies.map(curr => `<div class="rate-item">${curr}: ${Math.round(metalData[metal][curr.toLowerCase()] / 3.11)} ${curr}</div>`).join('')}
            <div class="rate-item"><strong>Per Ounce:</strong></div>
            ${currencies.map(curr => `<div class="rate-item">${curr}: ${metalData[metal][curr.toLowerCase()]} ${curr}</div>`).join('')}
        `;
        grid.appendChild(card);
    });
}

// Populate Home Overview (simplified gold/silver per gram/10g/oz in USD)
function populateHomeOverview() {
    document.getElementById('goldOverview').innerHTML = `
        <div>Per Gram: $${Math.round(metalData.gold.usd / 31.1)}</div>
        <div>Per 10g: $${Math.round(metalData.gold.usd / 3.11)}</div>
        <div>Per Ounce: $${metalData.gold.usd}</div>
    `;
    document.getElementById('silverOverview').innerHTML = `
        <div>Per Gram: $${Math.round(metalData.silver.usd / 31.1)}</div>
        <div>Per 10g: $${Math.round(metalData.silver.usd / 3.11)}</div>
        <div>Per Ounce: $${metalData.silver.usd}</div>
    `;
}

// Top Gainers/Losers (mock changes based on sample; in prod, track previous data)
function updateGainersLosers() {
    // Simulate 24h changes (positive for gold/platinum, negative for silver/palladium)
    const changes = [
        { name: 'Gold', change: '+2.5%' },
        { name: 'Platinum', change: '+1.2%' },
        { name: 'Silver', change: '-0.8%' },
        { name: 'Palladium', change: '-1.5%' }
    ];
    const gainers = changes.filter(c => c.change.startsWith('+')).slice(0, 2);
    const losers = changes.filter(c => c.change.startsWith('-')).slice(0, 2);
    
    document.getElementById('gainersLosers').innerHTML = `
        <div><strong>Top Gainers:</strong> ${gainers.map(g => `${g.name}: ${g.change}`).join(', ')}</div>
        <div><strong>Top Losers:</strong> ${losers.map(l => `${l.name}: ${l.change}`).join(', ')}</div>
    `;
}

// Fetch Currency Data
async function fetchCurrencyData() {
    try {
        const response = await fetch(CURRENCY_API_URL);
        if (!response.ok) throw new Error('API Error');
        currencyData = await response.json();
    } catch (error) {
        console.error('Currency API Error:', error);
        currencyData = sampleCurrencyData;
    }
    populateCurrencyTable();
    if (metalData.success) convertToCurrencies(metalData); // Re-convert if metals loaded first
}

// Populate Currency Table
function populateCurrencyTable() {
    const tbody = document.querySelector('#currencyTable tbody');
    tbody.innerHTML = '';
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD', 'CHF'];
    const goldUsd = metalData.gold ? metalData.gold.usd : 2050; // Fallback

    currencies.forEach(curr => {
        const row = document.createElement('tr');
        const rate = currencyData.rates[curr];
        const goldEquivalent = Math.round(goldUsd * rate);
        row.innerHTML = `
            <td>${curr}</td>
            <td>${rate.toFixed(4)}</td>
            <td>${goldEquivalent} ${curr}</td>
        `;
        tbody.appendChild(row);
    });
}

// Historical Chart with Chart.js
function updateChart() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    const metal = document.getElementById('metalSelect').value;
    const yearFilter = document.getElementById('yearSelect').value;

    // Destroy previous chart
    if (currentChart) currentChart.destroy();

    let labels = [];
    let dataPoints = [];
    if (yearFilter === 'all') {
        // Average yearly prices for all years
        const years = [2019, 2020, 2021, 2022, 2023];
        labels = years.map(y => `Year ${y}`);
        dataPoints = years.map(y => {
            const monthly = historicalData[metal][y];
            return Math.round(monthly.reduce((a, b) => a + b, 0) / monthly.length);
        });
    } else {
        // Monthly for selected year
        const monthly = historicalData[metal][parseInt(yearFilter)];
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dataPoints = monthly;
    }

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${metal.charAt(0).toUpperCase() + metal.slice(1)} Price (USD/oz)`,
                data: dataPoints,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } },
            elements: { point: { radius: 4 } }
        }
    });
}

// Compare Years
function compareYears() {
    const year1 = parseInt(document.getElementById('compareYear1').value);
    const year2 = parseInt(document.getElementById('compareYear2').value);
    const metal = document.getElementById('metalSelect').value;

    if (year1 === year2) {
        document.getElementById('compareResult').textContent = 'Select different years!';
        return;
    }

    const avg1 = Math.round(historicalData[metal][year1].reduce((a, b) => a + b, 0) / 12);
    const avg2 = Math.round(historicalData[metal][year2].reduce((a, b) => a + b, 0) / 12);
    const difference = avg2 - avg1;
    const percentChange = ((difference / avg1) * 100).toFixed(1);

    document.getElementById('compareResult').innerHTML = `
        Average ${metal} in ${year1}: $${avg1}<br>
        Average ${metal} in ${year2}: $${avg2}<br>
        Difference: ${difference > 0 ? '+' : ''}$${Math.abs(difference)} (${percentChange}%)
    `;
}

// Search Functionality (global, filters cards/table rows)
function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.card, #currencyTable tr');
    const currentPage = document.querySelector('.page.active').id;

    cards.forEach(item => {
        let text = '';
        if (currentPage === 'live-rates' || currentPage === 'home') {
            text = item.textContent.toLowerCase();
        } else if (currentPage === 'currency') {
            text = item.textContent.toLowerCase();
        }
        // For historical, search doesn't apply (charts), but could add if needed

        if (text.includes(query)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Already handled onchange for selects in HTML
    document.getElementById('searchInput').addEventListener('input', performSearch);
}

// Initial loads
updateChart(); // Load default chart
populateCurrencyTable(); // Load with sample if API fails