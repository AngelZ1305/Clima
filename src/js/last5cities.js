async function searchFromHistory(city) {
  document.getElementById("city-input").value = city;
  await window.searchCity(city);
}

function saveCity(city) {
  const key = "lastCities";

  let cities = JSON.parse(localStorage.getItem(key)) || [];

  city = city.trim();

  cities = cities.filter(c => c.toLowerCase() !== city.toLowerCase());

  cities.unshift(city);

  cities = cities.slice(0, 5);

  localStorage.setItem(key, JSON.stringify(cities));
}

function renderLastCities() {
  const container = document.getElementById("last-places");

  const cities = JSON.parse(localStorage.getItem("lastCities")) || [];

  if (cities.length === 0) {
    container.classList.add("hidden");
    return;
  }

  const list = container.querySelector("div");

  list.innerHTML = "";

  cities.forEach(city => {
    const button = document.createElement("button");

    button.textContent = city;
    button.className = "px-3 py-1 bg-white/30 hover:bg-white/20 border border-white/30 rounded-full text-sm transition";

    button.addEventListener("click", async () => {
  await window.searchCity(city);
});

    list.appendChild(button);
  });

  container.classList.remove("hidden");
}


document.addEventListener("DOMContentLoaded", () => {
  renderLastCities();
});

window.saveCity = saveCity;
window.renderLastCities = renderLastCities;