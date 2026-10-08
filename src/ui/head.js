// <head> pieces shared by the console and login shells.

// Sets data-theme before first paint. Same rules as src/ui/console/theme.js.
export const THEME_BOOT = `<script>(function(){var p='auto';try{p=localStorage.getItem('emby_theme')||'auto'}catch(e){}var l=p==='light'||(p!=='dark'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=l?'light':'dark'})()</script>`;

export const FAVICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%23e5a440'/%3E%3Cpath d='M6 15h3l2-6 2 8 2-4h3' fill='none' stroke='%23141619' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E">`;
