import { Beaker, Settings, User, Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const TopBar = () => {
    const { mode, setMode } = useThemeStore();

    const cycleTheme = () => {
        const modes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
        const idx = modes.indexOf(mode);
        setMode(modes[(idx + 1) % modes.length]);
    };

    return (
        <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Beaker size={18} className="text-white" />
                </div>
                <span className="font-bold text-lg text-gray-100 tracking-tight">VSEQ</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={cycleTheme}
                    className="text-gray-400 hover:text-white transition-colors"
                    title={`Theme: ${mode}`}
                >
                    {mode === 'dark' ? <Moon size={18} /> : mode === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                    <Settings size={18} />
                </button>
                <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                    <User size={16} />
                </button>
            </div>
        </div>
    );
};
