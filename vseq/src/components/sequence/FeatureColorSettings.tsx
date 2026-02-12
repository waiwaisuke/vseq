import { useState, useEffect } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import {
    DEFAULT_FEATURE_COLORS,
    getCustomColors,
    setCustomColor,
    resetCustomColor,
} from '../../lib/featureColors';

interface FeatureColorSettingsProps {
    featureTypes: string[];
    onColorsChanged: () => void;
}

export const FeatureColorSettings = ({ featureTypes, onColorsChanged }: FeatureColorSettingsProps) => {
    const [customColors, setCustomColors] = useState<Record<string, string>>(getCustomColors());

    // All known types: union of defaults and actual types in the file
    const allTypes = [...new Set([
        ...Object.keys(DEFAULT_FEATURE_COLORS),
        ...featureTypes,
    ])].sort();

    const handleColorChange = (type: string, color: string) => {
        setCustomColor(type, color);
        setCustomColors(prev => ({ ...prev, [type]: color }));
        onColorsChanged();
    };

    const handleReset = (type: string) => {
        resetCustomColor(type);
        setCustomColors(prev => {
            const next = { ...prev };
            delete next[type];
            return next;
        });
        onColorsChanged();
    };

    const getEffective = (type: string) =>
        customColors[type] || DEFAULT_FEATURE_COLORS[type] || '#6b7280';

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <Palette size={16} className="text-pink-400" />
                    <h3 className="font-medium text-gray-200">Feature Colors</h3>
                </div>
                <div className="text-xs text-gray-400">
                    Customize display colors for each feature type
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {allTypes.map(type => {
                    const isCustom = type in customColors;
                    return (
                        <div key={type} className="flex items-center px-4 py-2 border-b border-gray-800/30 hover:bg-gray-800/30">
                            <div
                                className="w-5 h-5 rounded border border-gray-600 mr-3 cursor-pointer relative overflow-hidden"
                                style={{ backgroundColor: getEffective(type) }}
                            >
                                <input
                                    type="color"
                                    value={getEffective(type)}
                                    onChange={e => handleColorChange(type, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </div>
                            <span className="text-sm text-gray-200 flex-1">{type}</span>
                            <span className="text-xs font-mono text-gray-500 mr-2">{getEffective(type)}</span>
                            {isCustom && (
                                <button
                                    onClick={() => handleReset(type)}
                                    className="text-gray-500 hover:text-gray-300"
                                    title="Reset to default"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
