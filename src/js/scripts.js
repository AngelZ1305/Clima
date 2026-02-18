const API_KEY = "3baed4308bc2593914a81b9df2a123a8";
const suggestionMap = new Map();
const form = document.getElementById("weather-form");
const input = document.getElementById("city-input");
const datalist = document.getElementById("city-suggestions");

const cb = {
    state: "CLOSED",
    failures: 0,
    maxFailures: 3,
    openUntil: 0,
    openMs: 10_000,
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchCB(url, {
    retries = 2,
    timeoutMs = 10_000,
    baseDelayMs = 400,
} = {}) {

    if (!navigator.onLine) {
        throw new Error("OFFLINE");
    }

    if (cb.state === "OPEN") {
        if (Date.now() < cb.openUntil) {
            throw new Error("Circuit OPEN: servicio temporalmente bloqueado");

        }

        cb.state = "CLOSED";
        clearServiceUnavailable();
        cb.failures = 0;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, { signal: controller.signal });

            const serviceFail = (res.status >= 500 || res.status === 429);

            if (!res.ok && serviceFail) throw new Error(`HTTP ${res.status}`);

            cb.failures = 0;
            clearServiceUnavailable();
            return res;

        } catch (e) {
            cb.failures++;

            if (cb.failures >= cb.maxFailures) {
                cb.state = "OPEN";
                cb.openUntil = Date.now() + cb.openMs;
                showServiceUnavailable("El servicio no está disponible momentáneamente. Intenta de nuevo en unos segundos.");
                throw new Error("Circuit OPEN: servicio temporalmente bloqueado");
            }

            if (attempt === retries) throw e;

            await sleep(baseDelayMs * (attempt + 1));

        } finally {
            clearTimeout(id);
        }
    }
}

function showServiceUnavailable(message = "El servicio no está disponible momentáneamente. Intenta de nuevo en unos segundos.") {
    const el = document.getElementById("service-error");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
}

function clearServiceUnavailable() {
    const el = document.getElementById("service-error");
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
}

getWeather(29.072967, -110.955919)
    .then((data) => {
        renderWeather(data);
        renderFavoriteCities();
    })
    .catch((err) => {
        if (!err.message.includes("OpenWeather error 404")) {
            showServiceUnavailable("El servicio no está disponible momentáneamente. Intenta de nuevo en unos segundos.");
        }
    });


async function getWeather(lat, lon) {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "es");
    url.searchParams.set("appid", API_KEY);

    const res = await fetchCB(url, { retries: 2, timeoutMs: 8000 });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeather error ${res.status}: ${text}`);
    }

    return res.json();
}

async function getWeatherByCity(city) {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("q", city);
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "es");
    url.searchParams.set("appid", API_KEY);

    const res = await fetchCB(url, { retries: 2, timeoutMs: 8000 });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeather error ${res.status}: ${text}`);
    }

    return res.json();
}

async function getCitySuggestions(query) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`;
    const res = await fetchCB(url, { retries: 2, timeoutMs: 8000 });
    return res.json();
}

function renderWeather(data) {
    const iconCode = data.weather[0].icon;
    const activitySection = document.getElementById("activities");
    const activityText = document.getElementById("activity-text");

    document.getElementById("city-name").textContent = data.name;
    document.getElementById("temperature").textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById("description").textContent = data.weather[0].description;
    document.getElementById("humidity").textContent = `Humedad: ${data.main.humidity}%`;
    document.getElementById("wind").textContent = `Viento: ${data.wind.speed} m/s`;

    const icon = document.getElementById("weather-icon");
    icon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    icon.alt = data.weather[0].description;

    document.getElementById("weather-result").classList.remove("hidden");

    const suggestion = getActivitySuggestion(
        data.weather[0].description,
        data.main.temp
    );

    activityText.textContent = suggestion;
    activitySection.classList.remove("hidden");
    const favorites = JSON.parse(localStorage.getItem("favoriteCities")) || [];
    const isFav = favorites.includes(data.name);
    window.updateHeartUI?.(isFav);
}

function getActivitySuggestion(description, temp) {
    description = description.toLowerCase();

    if (description.includes("lluvia")) {
        return "Perfecto para ver una película en casa ";
    }

    if (description.includes("nubes") || description.includes("nuboso")) {
        return "Ideal para ir a un café o leer un libro en casa";
    }

    if (description.includes("cielo claro") || description.includes("soleado")) {
        if (temp > 30) {
            return "Hace calor, ve por algo fresco o nada un rato";
        }
        return "Buen día para salir a  hacer ejercicio al aire libre";
    }

    if (description.includes("nieve")) {
        return "Día perfecto para quedarte en casa";
    }

    return "Un buen momento para hacer algo productivo";
}


function showError(message) {
    const errorEl = document.getElementById("form-error");
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function clearError() {
    const errorEl = document.getElementById("form-error");
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}



input.addEventListener("input", async (e) => {
    const query = e.target.value.trim();

    if (query.length < 2) {
        datalist.innerHTML = "";
        suggestionMap.clear();
        return;
    }

    try {
        const results = await getCitySuggestions(query);

        datalist.innerHTML = "";
        suggestionMap.clear();

        results.forEach((city) => {
            const label = `${city.name}, ${city.country}`;

            suggestionMap.set(label, { lat: city.lat, lon: city.lon });

            const option = document.createElement("option");
            option.value = label;
            datalist.appendChild(option);
        });
    } catch (err) {
        if (!err.message.includes("OpenWeather error 404")) {
            showServiceUnavailable("El servicio no está disponible momentáneamente. Intenta de nuevo en unos segundos.");
        }
    }
});



form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await window.searchCity(input.value);
});
document.addEventListener("DOMContentLoaded", () => {
    renderFavoriteCities();
});



window.searchCity = async function searchCity(cityRaw) {
    const city = cityRaw.trim();
    if (!city) { showError("Debes ingresar una ciudad."); return; }

    clearError();

    try {
        const picked = suggestionMap.get(city);
        const todayData = picked
            ? await getWeather(picked.lat, picked.lon)
            : await getWeatherByCity(city);

        renderWeather(todayData);
        saveCity(todayData.name);
        renderLastCities();

        await window.updateForecastByCity?.(todayData.name);

    } catch (error) {
        if (error.message.includes("OpenWeather error 404")) {
            showError("La ciudad no fue encontrada.");
            return;
        }
        showServiceUnavailable("El servicio no está disponible momentáneamente. Intenta de nuevo en unos segundos.");
    }
};



window.saveCity?.(todayData.name);
window.renderLastCities?.();