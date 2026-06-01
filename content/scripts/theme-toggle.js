const sun = document.querySelector('#icon-sun');
const moon = document.querySelector('#icon-moon');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  sun.style.display = theme === 'dark' ? 'none' : 'block';
  moon.style.display = theme === 'dark' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('#theme-toggle');
  const saved = localStorage.getItem('theme') ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  applyTheme(saved);

  toggle?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });
});