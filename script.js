const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const weatherDisplay = document.getElementById('weather-display');
const loadingSpinner = document.getElementById('loading');

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
const localTimeElem = document.getElementById('localTime');

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
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);

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

        displayWeather(data);

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
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);

        if (!response.ok) {
            throw new Error('Could not fetch weather data');
        }

        const data = await response.json();
        displayWeather(data);

    } catch (error) {
        showError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
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
    windSpeedElem.textContent = `${data.wind.speed} m/s`;

    // Set Icon
    const iconCode = data.weather[0].icon;
    weatherIconElem.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // Update Background
    updateBackground(data.weather[0].main);

    // Show display
    weatherDisplay.classList.remove('hidden');
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
    weatherDisplay.innerHTML = `<p style="color: #ffcccc; font-weight: bold; margin-top: 20px;">${message}</p>`;
    weatherDisplay.classList.remove('hidden');
}