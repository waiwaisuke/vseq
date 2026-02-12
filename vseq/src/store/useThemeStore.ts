import { create } from 'zustand';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
    mode: ThemeMode;
    resolved: 'dark' | 'light'; // actual applied theme
    setMode: (mode: ThemeMode) => void;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
    if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('vseq-theme') : null) as ThemeMode | null;
const initialMode: ThemeMode = stored || 'dark';

export const useThemeStore = create<ThemeState>((set) => ({
    mode: initialMode,
    resolved: resolveTheme(initialMode),
    setMode: (mode: ThemeMode) => {
        localStorage.setItem('vseq-theme', mode);
        set({ mode, resolved: resolveTheme(mode) });
    },
}));

// Listen for system theme changes
if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const state = useThemeStore.getState();
        if (state.mode === 'system') {
            useThemeStore.setState({ resolved: resolveTheme('system') });
        }
    });
}
