import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    THEME_STORAGE_KEY,
    applyTheme,
    readThemePreference,
    resolveTheme
} from './theme.svelte';

describe('theme service', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.removeProperty('color-scheme');
    });

    it('defaults invalid or missing preferences to system', () => {
        const storage = { getItem: vi.fn(() => 'sepia') } as unknown as Storage;

        expect(readThemePreference(storage)).toBe('system');
        expect(THEME_STORAGE_KEY).toBe('simpnote-theme');
    });

    it('resolves system from the operating system preference', () => {
        expect(resolveTheme('system', false)).toBe('light');
        expect(resolveTheme('system', true)).toBe('dark');
        expect(resolveTheme('light', true)).toBe('light');
        expect(resolveTheme('dark', false)).toBe('dark');
    });

    it('applies the resolved theme to the document root', () => {
        applyTheme('dark');

        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(document.documentElement.style.colorScheme).toBe('dark');
    });
});
