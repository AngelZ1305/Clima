const favBtn = document.getElementById("fav-btn");
const heart = favBtn.querySelector("svg");

function getFavorites() {
  return JSON.parse(localStorage.getItem("favoriteCities")) || [];
}

function saveFavorites(favs) {
  localStorage.setItem("favoriteCities", JSON.stringify(favs));
}

function updateHeartUI(isFav) {
  if (isFav) {
    heart.setAttribute("fill", "currentColor");
    favBtn.classList.add("text-red-500");
  } else {
    heart.setAttribute("fill", "none");
    favBtn.classList.remove("text-red-500");
  }
}

function renderFavoriteCities() {
  const container = document.getElementById("favorite-places");
  const list = document.getElementById("favorite-places-list");

  const favorites = getFavorites();

  list.innerHTML = "";

  if (favorites.length === 0) {
    container.classList.add("hidden");
    return;
  }

  favorites.forEach(city => {
    const button = document.createElement("button");

    button.textContent = city;
    button.className =
      "px-3 py-1 bg-red-500/80 hover:bg-red-500/100 border border-red-400/30 rounded-full text-sm transition";

    button.addEventListener("click", async () => {
  await window.searchCity(city);
});

    list.appendChild(button);
  });

  container.classList.remove("hidden");
}

favBtn.addEventListener("click", () => {
  const city = document.getElementById("city-name").textContent;
  if (!city) return;

  let favorites = getFavorites();

  const isAlreadyFav = favorites.includes(city);

  if (isAlreadyFav) {
    favorites = favorites.filter(c => c !== city);
    updateHeartUI(false);
  } else {
    favorites.push(city);
    updateHeartUI(true);
  }

  saveFavorites(favorites);
  renderFavoriteCities();
});