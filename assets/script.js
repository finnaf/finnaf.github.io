const root = document.documentElement;
const btn = document.getElementById('theme-toggle');
const icon = document.getElementById('theme-icon');

// on load: apply saved preference, or fall back to system preference
const saved = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initial = saved || (prefersDark ? 'dark' : 'light');
root.setAttribute('data-theme', initial);
icon.textContent = initial === 'dark' ? '☀︎' : '☾';

btn.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  icon.textContent = next === 'dark' ? '☀︎' : '☾';
});