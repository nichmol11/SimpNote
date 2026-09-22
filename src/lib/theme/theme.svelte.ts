import { getCurrentWindow } from '@tauri-apps/api/window';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'simpnote-theme';

export const themeState = $state({
    preference: 'system' as ThemePreference,
    resolved: 'light' as ResolvedTheme
});

let systemMediaQuery: MediaQueryList | undefined;
let removeSystemListener: (() => void) | undefined;

export function readThemePreference(storage: Storage | undefined = globalThis.localStorage): ThemePreference {
    if (!storage) return 'system';

    const savedPreference = storage.getItem(THEME_STORAGE_KEY);
    return savedPreference === 'light' || savedPreference === 'dark' ? savedPreference : 'system';
}

export function resolveTheme(preference: ThemePreference, isDark: boolean = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false): ResolvedTheme {
    return preference === 'system' ? (isDark ? 'dark' : 'light') : preference;
}

export function applyTheme(resolvedTheme: ResolvedTheme): void {
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = resolvedTheme;
        document.documentElement.style.colorScheme = resolvedTheme;
    }
}

async function syncWindowTheme(preference: ThemePreference): Promise<void> {
    try {
        await getCurrentWindow().setTheme(preference === 'system' ? null : preference);
    } catch {
        // The Tauri window API is unavailable when running the web app.
    }
}

function updateResolvedTheme(): void {
    themeState.resolved = resolveTheme(themeState.preference, systemMediaQuery?.matches);
    applyTheme(themeState.resolved);
}

function subscribeToSystemTheme(): void {
    if (typeof window === 'undefined') return;

    systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
        if (themeState.preference === 'system') {
            themeState.resolved = event.matches ? 'dark' : 'light';
            applyTheme(themeState.resolved);
        }
    };

    systemMediaQuery.addEventListener('change', handleSystemThemeChange);
    removeSystemListener = () => {
        systemMediaQuery?.removeEventListener('change', handleSystemThemeChange);
        systemMediaQuery = undefined;
    };
}

export function setThemePreference(preference: ThemePreference): void {
    themeState.preference = preference;
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, preference);
    updateResolvedTheme();
    void syncWindowTheme(preference);
}

export function initializeTheme(): () => void {
    themeState.preference = readThemePreference();
    subscribeToSystemTheme();
    updateResolvedTheme();
    void syncWindowTheme(themeState.preference);

    return () => {
        removeSystemListener?.();
        removeSystemListener = undefined;
    };
}
