const toggle = document.querySelector('#theme-toggle');

// stores preference (TODO integrate)
const saved = localStorage.getItem('theme') ?? 
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

document.documentElement.dataset.theme = saved;

toggle.addEventListener('change', () => {
  const theme = toggle.checked ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
});