type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function loadTheme(): Theme {
    const saved = localStorage.getItem('speedtiers-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return getSystemTheme();
}

let current: Theme = loadTheme();

function apply(): void {
    document.documentElement.setAttribute('data-theme', current);
}

export function initTheme(): void {
    apply();
}

export function toggleTheme(): void {
    current = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('speedtiers-theme', current);
    apply();
}

export function getThemeLabel(): string {
    return current === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
}
