const audio = document.getElementById("audioPlayer");
const stationList = document.getElementById("stationList");
const playPauseBtn = document.querySelector(".controls .control-btn:nth-child(2)");
const currentStationInfo = document.getElementById("currentStationInfo");
let currentIndex = parseInt(localStorage.getItem("lastStation")) || 0;
let favoriteStations = JSON.parse(localStorage.getItem("favoriteStations")) || [];
let currentTab = localStorage.getItem("lastTab") || "techno";
let isPlaying = localStorage.getItem("isPlaying") === "true";
let stationLists = {};
let stationItems;
let hasReloaded = false; // Додаємо прапорець для уникнення повторного перезавантаження

// Завантаження станцій із JSON
fetch('stations.json')
  .then(response => response.json())
  .then(data => {
    stationLists = data;
    switchTab(currentTab);
  })
  .catch(error => console.error("Помилка завантаження станцій:", error));

// Теми
const themes = {
  dark: { bodyBg: "#121212", containerBg: "linear-gradient(135deg, #1e1e1e, #2a2a4a)", accent: "#00C4FF", text: "#fff" },
  light: { bodyBg: "#f0f0f0", containerBg: "#fff", accent: "#007BFF", text: "#000" },
  neon: { bodyBg: "#0a0a1a", containerBg: "linear-gradient(135deg, #1a1a2e, #2e2e4a)", accent: "#00ffcc", text: "#fff" },
  cyberpunk: { bodyBg: "#0a0a1a", containerBg: "linear-gradient(135deg, #1a1a2e, #2e2e4a)", accent: "#ff00ff", text: "#fff", textShadow: "0 0 5px #ff00ff" }
};
let currentTheme = localStorage.getItem("selectedTheme") || "dark";

// Налаштування Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((registration) => {
    setInterval(() => {
      registration.update();
    }, 5 * 60 * 1000); // Перевірка оновлень кожні 5 хвилин

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !hasReloaded) {
          // Автоматичне оновлення сторінки лише один раз
          hasReloaded = true;
          window.location.reload();
        }
      });
    });

    // Перевірка оновлень при завантаженні
    navigator.serviceWorker.ready.then((reg) => {
      reg.active.postMessage({ type: 'CHECK_UPDATE' });
    });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_AVAILABLE' && !hasReloaded) {
      // Автоматичне оновлення сторінки лише один раз
      hasReloaded = true;
      window.location.reload();
    }
  });
}

function applyTheme(theme) {
  document.body.style.background = themes[theme].bodyBg;
  document.querySelector(".container").style.background = themes[theme].containerBg;
  document.querySelector("h1").style.color = themes[theme].accent;
  document.querySelectorAll(".station-list, .control-btn, .theme-toggle, .current-station-info, .tab-btn").forEach(el => {
    el.style.background = themes[theme].containerBg;
    el.style.borderColor = themes[theme].accent;
    el.style.color = themes[theme].text;
    if (themes[theme].textShadow) el.style.textShadow = themes[theme].textShadow;
  });
  document.querySelectorAll(".station-item").forEach(el => {
    el.style.background = themes[theme].containerBg;
    el.style.borderColor = themes[theme].text;
    el.style.color = themes[theme].text;
  });
  document.querySelector(".controls-container").style.background = themes[theme].containerBg;
  document.querySelector(".controls-container").style.borderColor = themes[theme].accent;
  currentTheme = theme;
  localStorage.setItem("selectedTheme", theme);
}

function toggleTheme() {
  const themesOrder = ["dark", "light", "neon", "cyberpunk"];
  const nextTheme = themesOrder[(themesOrder.indexOf(currentTheme) + 1) % 4];
  applyTheme(nextTheme);
}

function switchTab(tab) {
  if (!["techno", "trance", "ukraine"].includes(tab)) tab = "techno";
  currentTab = tab;
  if (localStorage.getItem("lastTab") === tab) {
    currentIndex = parseInt(localStorage.getItem("lastStation")) || 0;
  } else {
    currentIndex = 0;
  }
  localStorage.setItem("currentTab", tab);
  localStorage.setItem("lastTab", tab);
  updateStationList();
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add("active");
  changeStation(currentIndex);
}

function updateStationList() {
  const stations = stationLists[currentTab];
  stationList.innerHTML = '';

  const favoriteList = favoriteStations
    .map(name => stations.find(station => station.name === name))
    .filter(station => station);
  const nonFavoriteList = stations.filter(station => !favoriteStations.includes(station.name));

  const sortedStations = [...favoriteList, ...nonFavoriteList];

  sortedStations.forEach((station, index) => {
    const item = document.createElement("div");
    item.className = `station-item ${index === currentIndex ? 'selected' : ''}`;
    item.dataset.value = station.value;
    item.dataset.name = station.name;
    item.dataset.genre = station.genre;
    item.dataset.country = station.country;
    item.innerHTML = `${station.emoji} ${station.name}<button class="favorite-btn${favoriteStations.includes(station.name) ? ' favorited' : ''}">★</button>`;
    item.addEventListener("click", () => changeStation(index));
    item.querySelector(".favorite-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(station.name);
    });
    stationList.appendChild(item);
  });

  stationItems = stationList.querySelectorAll(".station-item");
}

function toggleFavorite(stationName) {
  if (favoriteStations.includes(stationName)) {
    favoriteStations = favoriteStations.filter(name => name !== stationName);
  } else {
    favoriteStations.unshift(stationName);
  }
  localStorage.setItem("favoriteStations", JSON.stringify(favoriteStations));
  updateStationList();
}

function changeStation(index) {
  stationItems.forEach(item => item.classList.remove("selected"));
  stationItems[index].classList.add("selected");
  currentIndex = index;
  currentTab = document.querySelector(".tab-btn.active").getAttribute("onclick").match(/switchTab\('(.+)'\)/)[1];
  localStorage.setItem("lastStation", index);
  localStorage.setItem("lastTab", currentTab);
  audio.src = stationItems[index].dataset.value;
  updateCurrentStationInfo(stationItems[index]);
  if (audio.paused) {
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "paused");
  } else {
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "running");
  }
  if (isPlaying) {
    audio.play().catch(error => console.error("Помилка відтворення:", error));
  }
}

function updateCurrentStationInfo(item) {
  currentStationInfo.querySelector(".station-name").textContent = item.dataset.name;
  currentStationInfo.querySelector(".station-genre").textContent = `жанр: ${item.dataset.genre}`;
  currentStationInfo.querySelector(".station-country").textContent = `країна: ${item.dataset.country}`;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.dataset.name,
      artist: `${item.dataset.genre} | ${item.dataset.country}`,
      album: 'Радіо Музика'
    });
  }
}

function prevStation() {
  currentIndex = (currentIndex > 0) ? currentIndex - 1 : stationItems.length - 1;
  changeStation(currentIndex);
}

function nextStation() {
  currentIndex = (currentIndex < stationItems.length - 1) ? currentIndex + 1 : 0;
  changeStation(currentIndex);
}

function togglePlayPause() {
  if (audio.paused) {
    audio.play().catch(error => console.error("Помилка відтворення:", error));
    playPauseBtn.textContent = "⏸";
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "running");
    isPlaying = true;
  } else {
    audio.pause();
    playPauseBtn.textContent = "▶";
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "paused");
    isPlaying = false;
  }
  localStorage.setItem("isPlaying", isPlaying);
}

function handleBluetoothConnection(event) {
  if (event.type === "connect" && navigator.bluetooth && currentIndex >= 0) {
    audio.src = stationItems[currentIndex].dataset.value;
    audio.play().catch(error => console.error("Помилка відтворення:", error));
    isPlaying = true;
    localStorage.setItem("isPlaying", isPlaying);
    playPauseBtn.textContent = "⏸";
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "running");
  } else if (event.type === "disconnect") {
    audio.pause();
    isPlaying = false;
    localStorage.setItem("isPlaying", isPlaying);
    playPauseBtn.textContent = "▶";
    document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "paused");
    alert("Bluetooth відключено. Відтворення призупинено.");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") prevStation();
  if (e.key === "ArrowRight") nextStation();
  if (e.key === " ") {
    e.preventDefault();
    togglePlayPause();
  }
});

if (navigator.bluetooth) {
  navigator.bluetooth.addEventListener('connect', handleBluetoothConnection);
  navigator.bluetooth.addEventListener('disconnect', handleBluetoothConnection);
}

navigator.mediaSession.setActionHandler("previoustrack", () => prevStation());
navigator.mediaSession.setActionHandler("nexttrack", () => nextStation());
navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());

applyTheme(currentTheme);
window.addEventListener("blur", () => {
  if (document.hidden) {
    localStorage.setItem("lastStation", currentIndex);
    localStorage.setItem("lastTab", currentTab);
  }
});
window.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.bluetooth) {
    handleBluetoothConnection({ type: "connect" });
  }
});

audio.addEventListener("playing", () => {
  playPauseBtn.textContent = "⏸";
  document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "running");
  isPlaying = true;
  localStorage.setItem("isPlaying", isPlaying);
});
audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "▶";
  document.querySelectorAll(".wave-bar").forEach(bar => bar.style.animationPlayState = "paused");
  isPlaying = false;
  localStorage.setItem("isPlaying", isPlaying);
});
audio.addEventListener("error", () => console.error("Помилка трансляції"));
audio.volume = 0.5;

const volumeSlider = document.getElementById("volumeSlider");
volumeSlider.addEventListener("input", (e) => {
  audio.volume = e.target.value;
});

document.addEventListener("DOMContentLoaded", () => {
  currentTab = localStorage.getItem("lastTab") || "techno";
  switchTab(currentTab);
  if (isPlaying) {
    audio.play().catch(error => console.error("Помилка автовідтворення:", error));
  }
});