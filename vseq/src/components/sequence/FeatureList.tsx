import type { SequenceData } from '../../types';

interface FeatureListProps {
    data: SequenceData;
}

export const FeatureList = ({ data }: FeatureListProps) => {
    const { features } = data;

    if (features.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                No features found.
            </div>
        );
    }

    return (
        <div className="overflow-auto h-full p-4">
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800 text-gray-400 uppercase font-medium">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Type</th>
                        <th className="px-4 py-3">Name / Label</th>
                        <th className="px-4 py-3">Start</th>
                        <th className="px-4 py-3">End</th>
                        <th className="px-4 py-3">Strand</th>
                        <th className="px-4 py-3 rounded-tr-lg">Length</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {features.map((feature) => (
                        <tr key={feature.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-blue-400">{feature.type}</td>
                            <td className="px-4 py-3">{feature.label || feature.name}</td>
                            <td className="px-4 py-3 font-mono">{feature.start}</td>
                            <td className="px-4 py-3 font-mono">{feature.end}</td>
                            <td className="px-4 py-3">
                                {feature.strand === 1 ? (
                                    <span className="text-green-400">Forward</span>
                                ) : (
                                    <span className="text-red-400">Reverse</span>
                                )}
                            </td>
                            <td className="px-4 py-3 font-mono">{feature.end - feature.start + 1} bp</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
