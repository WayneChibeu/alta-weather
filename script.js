const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const weatherDisplay = document.getElementById('weather-display');
const loadingSpinner = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// Use key from config.js
const apiKey = CONFIG.API_KEY;

// UI Elements for data
const cityNameElem = document.getElementById('cityName');
const weatherIconElem = document.getElementById('weatherIcon');
const tempElem = document.getElementById('temperature');
const descElem = document.getElementById('description');
const feelsLikeElem = document.getElementById('feelsLike');
const humidityElem = document.getElementById('humidity');
const windSpeedElem = document.getElementById('windSpeed');
const sunriseElem = document.getElementById('sunrise');
const sunsetElem = document.getElementById('sunset');
const localTimeElem = document.getElementById('localTime');
const unitToggle = document.getElementById('unitToggle');

// State
let currentUnit = localStorage.getItem('preferredUnit') || 'metric'; // 'metric' (C) or 'imperial' (F)
let currentCity = localStorage.getItem('lastCity') || '';

// Initialize
updateUnitButton();
if (currentCity) {
    getWeather(currentCity);
}

// Event Listeners
unitToggle.addEventListener('click', () => {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('preferredUnit', currentUnit);
    updateUnitButton();

    // Refresh weather if a city is already displayed
    if (cityNameElem.textContent && currentCity) {
        getWeather(currentCity);
    }
});

function updateUnitButton() {
    unitToggle.textContent = currentUnit === 'metric' ? '°C' : '°F';
}

// Add Enter key support
cityInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        const city = cityInput.value;
        if (city) getWeather(city);
    }
});

searchBtn.addEventListener('click', () => {
    const city = cityInput.value;
    if (city) getWeather(city);
});

async function getWeather(city) {
    // Show loading, hide previous results or errors
    loadingSpinner.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${currentUnit}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found');
            } else if (response.status === 401) {
                throw new Error('Invalid API Key. If you just created it, please wait 10-15 minutes for it to activate.');
            } else {
                throw new Error(`Error: ${response.statusText}`);
            }
        }

        const data = await response.json();

        // 1. Display Current Weather
        displayWeather(data);

        // 2. Fetch and Display Forecast
        // Note: We need a separate call because the endpoints are different.
        getForecast(city);

    } catch (error) {
        showError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Locate Me Button Logic
locateBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        loadingSpinner.classList.remove('hidden');
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeatherByCoords(lat, lon);
        }, error => {
            showError("Unable to retrieve your location. Please allow access.");
            loadingSpinner.classList.add('hidden');
        });
    } else {
        showError("Geolocation is not supported by your browser");
    }
});

async function getWeatherByCoords(lat, lon) {
    // Show loading, hide previous results or errors
    loadingSpinner.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);

        if (!response.ok) {
            throw new Error('Could not fetch weather data');
        }

        const data = await response.json();

        // Save geo city name if possible, or just don't save "lastCity" for geo to avoid confusion
        // Typically we want saved city to be readable. 
        // For now, let's update currentCity so toggle works
        currentCity = data.name;
        localStorage.setItem('lastCity', currentCity);

        currentCity = data.name;
        localStorage.setItem('lastCity', currentCity);

        displayWeather(data);
        getForecastByCoords(lat, lon); // New call

    } catch (error) {
        showError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}



// Forecast Logic
async function getForecast(city) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${currentUnit}`);
        if (!response.ok) return; // Silent fail for forecast if weather worked
        const data = await response.json();
        displayForecast(data);
    } catch (error) {
        console.error("Forecast Error:", error);
    }
}

async function getForecastByCoords(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);
        if (!response.ok) return;
        const data = await response.json();
        displayForecast(data);
    } catch (error) {
        console.error("Forecast Error:", error);
    }
}

function displayForecast(data) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear old
    forecastContainer.classList.remove('hidden');

    // Filter: OpenWeatherMap returns 40 items (every 3 hours).
    // Strategy: Take one reading per day (e.g., closest to 12:00 PM).
    // Or simpler: Just take the first reading of each distinct day that isn't TODAY.

    // Group by Day
    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });

        // If we haven't stored this day yet, store it.
        // This naturally picks the earliest available slot for next days, 
        // ensuring we get 5 distinct days.
        if (!dailyData[date]) {
            dailyData[date] = item;
        }
    });

    // Convert object to array and skip "Today" (if present in the first slot) if needed.
    // Actually, usually the API returns "Today" as first items.
    // Let's filter to ensure we show 5 days.

    const days = Object.keys(dailyData);
    // Limit to 5
    const next5Days = days.slice(0, 5);

    next5Days.forEach(day => {
        const item = dailyData[day];

        const card = document.createElement('div');
        card.classList.add('forecast-card');

        card.innerHTML = `
            <div class="forecast-day">${day}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="Icon">
            <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
        `;

        forecastContainer.appendChild(card);
    });
}

function calculateLocalTime(timezoneOffset) {
    // Current UTC time in milliseconds
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

    // City's time = UTC + timezoneOffset (in seconds, so * 1000)
    const cityTime = new Date(utcTime + (timezoneOffset * 1000));

    // Format: 10:30 AM
    return cityTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function displayWeather(data) {
    // Populate data
    cityNameElem.textContent = `${data.name}, ${data.sys.country}`;

    // Local Time
    const timeString = calculateLocalTime(data.timezone);
    localTimeElem.textContent = `Local Time: ${timeString}`;

    tempElem.textContent = `${Math.round(data.main.temp)}°`;
    descElem.textContent = data.weather[0].description;
    feelsLikeElem.textContent = `${Math.round(data.main.feels_like)}°`;
    humidityElem.textContent = `${data.main.humidity}%`;

    // AI Outfit Recommendation
    const outfit = getOutfitRecommendation(data.main.temp, data.weather[0].main);
    const outfitElem = document.getElementById('outfit-recommendation');
    const outfitText = document.getElementById('outfitText');

    outfitText.textContent = outfit;
    outfitElem.classList.remove('hidden');

    // Severe Weather Alerts
    const alertMessage = checkSevereWeather(data);
    const alertBanner = document.getElementById('severe-alert');
    if (alertMessage) {
        alertBanner.textContent = alertMessage;
        alertBanner.classList.remove('hidden');
    } else {
        alertBanner.classList.add('hidden');
    }

    // Wind speed unit depends on system
    const windUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
    windSpeedElem.textContent = `${data.wind.speed} ${windUnit}`;

    // Sunrise & Sunset
    // Offset is in seconds, timestamps are in seconds. We need milliseconds for Date.
    // Logic: Unix Time + Offset + UTC correction is tricky.
    // Simpler: Create a date object with the timestamp * 1000 and formatted with the timezone.

    // Helper to format time with timezone
    const formatTimeObj = (timestamp, timezoneOffset) => {
        const date = new Date((timestamp + timezoneOffset) * 1000);
        // Note: The timestamp from API is UTC.
        // Actually, simpler method:
        // 1. Get UTC time in ms: timestamp * 1000
        // 2. Add offset * 1000
        // 3. Create new Date (but this gives "local" time of the browser with the shifted value)
        // 4. Use .toUTCString() then slice? No.

        // Correct way using the calculateLocalTime logic we already have:
        // We essentially want `calculateLocalTime` but for a specific timestamp (not "now").

        const utcMs = timestamp * 1000;
        const localMs = utcMs + (new Date().getTimezoneOffset() * 60000) + (timezoneOffset * 1000);
        const localDate = new Date(localMs);
        return localDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    sunriseElem.textContent = formatTimeObj(data.sys.sunrise, data.timezone);
    sunsetElem.textContent = formatTimeObj(data.sys.sunset, data.timezone);

    // Set Icon
    const iconCode = data.weather[0].icon;
    weatherIconElem.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // Update Background
    updateBackground(data.weather[0].main);

    // Show display
    weatherDisplay.classList.remove('hidden');
}

function getOutfitRecommendation(temp, weatherMain) {
    // Normalize logic to Celsius
    let tempC = temp;
    if (currentUnit === 'imperial') {
        tempC = (temp - 32) * (5 / 9);
    }

    const condition = weatherMain.toLowerCase();
    let suggestion = "";

    // Temperature Logic
    if (tempC < 5) {
        suggestion = "Heavy Coat & Scarf 🧣";
    } else if (tempC >= 5 && tempC < 15) {
        suggestion = "Jacket or Hoodie 🧥";
    } else if (tempC >= 15 && tempC < 22) {
        suggestion = "T-shirt & Jeans 👕";
    } else {
        suggestion = "Shorts & Shades 🕶️";
    }

    // Weather Condition Logic Overrides
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm')) {
        suggestion += " + Umbrella ☂️";
    } else if (condition.includes('snow')) {
        suggestion = "Winter Gear & Boots 👢"; // Override for snow
    }

    return suggestion;
}

function checkSevereWeather(data) {
    const tempK = data.main.temp;
    // API returns Kelvin, Metric=Celsius, Imperial=Fahrenheit depending on query.
    // Wait, the API returns units based on 'units' param.
    // If currentUnit is metric, temp is C. If imperial, temp is F.
    // We need standard comparison. Let's convert to Celsius for checks.

    let tempC = data.main.temp;
    if (currentUnit === 'imperial') {
        tempC = (data.main.temp - 32) * 5 / 9;
    }

    const windSpeed = data.wind.speed;
    // Wind: Metric=m/s, Imperial=mph.
    // Threshold: 15 m/s or ~33 mph.
    // If imperial, 33 mph. If metric, 15 m/s.

    let isHighWind = false;
    if (currentUnit === 'metric' && windSpeed > 15) isHighWind = true;
    if (currentUnit === 'imperial' && windSpeed > 33) isHighWind = true;

    const condition = data.weather[0].main.toLowerCase();

    // Checks
    if (condition === 'thunderstorm') return "⚠️ STORM ALERT: Stay indoors!";
    if (isHighWind) return "⚠️ HIGH WIND WARNING: Secure loose objects.";
    if (tempC > 35) return "⚠️ EXTREME HEAT: Stay hydrated.";
    if (tempC < 0) return "⚠️ FREEZING: Watch for ice.";

    return null; // No alerts
}

function updateBackground(weatherMain) {
    const weather = weatherMain.toLowerCase();
    let imageUrl = '';

    // Unsplash Image URLs for different weathers
    switch (weather) {
        case 'clear':
            // Sunny / Clear Sky
            imageUrl = 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1974&auto=format&fit=crop';
            break;
        case 'clouds':
            // Cloudy
            imageUrl = 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1951&auto=format&fit=crop';
            break;
        case 'rain':
        case 'drizzle':
            // Rain
            imageUrl = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1974&auto=format&fit=crop';
            break;
        case 'thunderstorm':
            // Thunderstorm
            imageUrl = 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1974&auto=format&fit=crop';
            break;
        case 'snow':
            // Snow
            imageUrl = 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?q=80&w=2070&auto=format&fit=crop';
            break;
        case 'mist':
        case 'fog':
        case 'haze':
            // Fog/Mist
            imageUrl = 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=1932&auto=format&fit=crop';
            break;
        default:
            // Default
            imageUrl = 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1974&auto=format&fit=crop';
            break;
    }

    document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${imageUrl}')`;
}

function showError(message) {
    errorMessage.innerHTML = `<p>${message}</p>`;
    errorMessage.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
}