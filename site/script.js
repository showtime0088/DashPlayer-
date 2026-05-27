const root = document.documentElement;
const button = document.querySelector(".theme-toggle");
const icon = document.querySelector(".theme-icon");
const storedTheme = localStorage.getItem("dashplayer-site-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

function setTheme(theme) {
  root.dataset.theme = theme;
  icon.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("dashplayer-site-theme", theme);
}

setTheme(storedTheme || (prefersDark ? "dark" : "light"));

button.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});
