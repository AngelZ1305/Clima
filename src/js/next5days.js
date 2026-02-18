const API_KEY1 = "3baed4308bc2593914a81b9df2a123a8";

async function getForecastByCity(city) {
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("q", city);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");
  url.searchParams.set("appid", API_KEY1);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenWeather error ${res.status}: ${text}`);
  }
  return res.json();
}

window.updateForecastByCity = async function updateForecastByCity(cityName) {
  const forecastData = await getForecastByCity(cityName);
  const days = pick5Days(forecastData);
  setupForecastCarousel(days);
};

window.updateForecastByCity = async function updateForecastByCity(cityName) {
  const forecastData = await getForecastByCity(cityName);
  const days = pick5Days(forecastData);
  setupForecastCarousel(days);
};

function pick5Days(forecastData) {
  const list = forecastData.list;

  const byDate = new Map();
  for (const item of list) {
    const date = item.dt_txt.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(item);
  }

  const days = [];
  for (const [date, items] of byDate.entries()) {
    const targetHour = 12;

    let best = items[0];
    let bestDiff = 999;

    for (const it of items) {
      const hour = Number(it.dt_txt.slice(11, 13));
      const diff = Math.abs(hour - targetHour);
      if (diff < bestDiff) {
        best = it;
        bestDiff = diff;
      }
    }

    days.push({
      dateISO: date,
      temp: Math.round(best.main.temp),
      desc: best.weather?.[0]?.description ?? "",
      icon: best.weather?.[0]?.icon ?? "01d",
    });
  }

  days.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return days.slice(0, 5);
}

function renderCarousel(days, activeIndex) {
  const container = document.getElementById("forecast-carousel");
  const hint = document.getElementById("forecast-hint");
  container.innerHTML = "";

  const n = days.length;
  if (!n) return;

  const prevIndex = (activeIndex - 1 + n) % n;
  const nextIndex = (activeIndex + 1) % n;

  const three = [
    { item: days[prevIndex], size: "side", label: "Anterior" },
    { item: days[activeIndex], size: "center", label: "Seleccionado" },
    { item: days[nextIndex], size: "side", label: "Siguiente" },
  ];

  for (const { item, size } of three) {
    const dateStr = new Date(item.dateISO + "T00:00:00").toLocaleDateString("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

    const base = "w-full rounded-3xl backdrop-blur border border-white/20 text-white text-center transition";
    const center = "bg-white/25 shadow-2xl scale-[1.03]";
    const side = "bg-white/15 shadow-lg opacity-90";

    container.insertAdjacentHTML(
      "beforeend",
      `
      <article class="${base} ${size === "center" ? center : side}">
        <p class="text-sm text-white/80 my-5">${dateStr}</p>

        <div class="flex items-center justify-center mt-3">
          <img
            src="https://openweathermap.org/img/wn/${item.icon}@2x.png"
            alt="${item.desc}"
          />
        </div>

        <p>${item.temp}°C</p>
        <p class="text-center capitalize text-white/90 text-sm mx-auto">${item.desc}</p>
      </article>
      `
    );
  }

  hint.textContent = `Mostrando ${activeIndex + 1} de ${n}. Usa las flechas para moverte.`;
}

function setupForecastCarousel(days) {
  let index = 0;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayIdx = days.findIndex(d => d.dateISO === todayISO);
  if (todayIdx !== -1) index = todayIdx;

  renderCarousel(days, index);

  document.getElementById("prev-day").onclick = () => {
    index = (index - 1 + days.length) % days.length;
    renderCarousel(days, index);
  };

  document.getElementById("next-day").onclick = () => {
    index = (index + 1) % days.length;
    renderCarousel(days, index);
  };
}



document.addEventListener("DOMContentLoaded", async () => {
  try {
    const city = document.getElementById("city-input").value.trim() || "Hermosillo";

    const data = await getForecastByCity(city);
    const days = pick5Days(data);
    setupForecastCarousel(days);

  } catch (err) {
    if (!err.message.includes("OpenWeather error 404")) {
      console.error(err);
    }
  }
});

