/**
 * Visual theme (per device, not synced). The value lives on <html data-theme>
 * and in localStorage; themes.css maps each id to token overrides.
 */
export const THEMES = [
    { id: "classic", label: "Classic", description: "Lime on black", swatch: ["#080808", "#a3e635"] },
    { id: "chalk", label: "Chalk", description: "Graphite and cobalt", swatch: ["#13151a", "#6b8cf5"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "recomp88-theme";
export const DEFAULT_THEME: ThemeId = "classic";

const isThemeId = (value: unknown): value is ThemeId =>
    THEMES.some((t) => t.id === value);

export function getStoredTheme(): ThemeId {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
        const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeId(raw) ? raw : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

export function applyTheme(theme: ThemeId) {
    document.documentElement.dataset.theme = theme;
    const canvas = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", canvas || "#080808");
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Private mode / storage blocked: theme still applies for this visit.
    }
}

/**
 * Inline <head> script: sets data-theme before first paint so the splash and
 * app never flash the wrong theme.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var ok=${JSON.stringify(THEMES.map((t) => t.id))};document.documentElement.dataset.theme=ok.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_THEME)};}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;
