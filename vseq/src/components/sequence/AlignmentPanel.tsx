import { useState, useMemo } from 'react';
import { GitCompare } from 'lucide-react';
import { globalAlign, localAlign } from '../../lib/alignment';
import type { AlignmentResult } from '../../lib/alignment';

interface AlignmentPanelProps {
    sequence: string;
}

const CHUNK_SIZE = 60;

export const AlignmentPanel = ({ sequence }: AlignmentPanelProps) => {
    const [seq2Input, setSeq2Input] = useState('');
    const [mode, setMode] = useState<'global' | 'local'>('local');
    const [gapOpen, setGapOpen] = useState(-5);
    const [gapExtend, setGapExtend] = useState(-1);
    const [matchScore, setMatchScore] = useState(2);
    const [mismatchScore, setMismatchScore] = useState(-1);

    const seq2 = useMemo(() =>
        seq2Input.toUpperCase().replace(/[^ATGCNRYKMSWBDHV]/g, '').replace(/\s/g, '')
    , [seq2Input]);

    // Limit alignment to reasonable sizes
    const canAlign = seq2.length >= 5 && seq2.length <= 10000 && sequence.length <= 50000;

    const result: AlignmentResult | null = useMemo(() => {
        if (!canAlign || seq2.length === 0) return null;
        // Use a subset of seq1 if it's very long (for performance)
        const s1 = sequence.length > 5000 ? sequence.slice(0, 5000) : sequence;
        const s2 = seq2;
        try {
            return mode === 'global'
                ? globalAlign(s1.toUpperCase(), s2)
                : localAlign(s1.toUpperCase(), s2);
        } catch {
            return null;
        }
    }, [sequence, seq2, mode, canAlign]);

    // Split alignment into lines for display
    const alignmentLines = useMemo(() => {
        if (!result) return [];
        const lines: { seq1: string; match: string; seq2: string; pos1: number; pos2: number }[] = [];
        for (let i = 0; i < result.length; i += CHUNK_SIZE) {
            lines.push({
                seq1: result.alignedSeq1.slice(i, i + CHUNK_SIZE),
                match: result.matchLine.slice(i, i + CHUNK_SIZE),
                seq2: result.alignedSeq2.slice(i, i + CHUNK_SIZE),
                pos1: result.startSeq1 + i + 1,
                pos2: result.startSeq2 + i + 1,
            });
        }
        return lines;
    }, [result]);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <GitCompare size={16} className="text-indigo-400" />
                    <h3 className="font-medium text-gray-200">Pairwise Alignment</h3>
                </div>
                <div className="text-xs text-gray-400">
                    Seq1: current sequence ({sequence.length} bp) • Seq2: {seq2.length > 0 ? `${seq2.length} bp` : 'paste below'}
                </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2">
                <div className="text-xs text-gray-400">Paste sequence to align against</div>
                <textarea
                    value={seq2Input}
                    onChange={e => setSeq2Input(e.target.value)}
                    placeholder="Paste DNA sequence here (FASTA header will be stripped)..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500 h-20 resize-none"
                />

                {/* Mode and parameters */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Mode:</span>
                        {(['local', 'global'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-2 py-0.5 rounded text-xs ${mode === m
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {m === 'local' ? 'Local (SW)' : 'Global (NW)'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Match:</span>
                        <input type="number" value={matchScore} onChange={e => setMatchScore(+e.target.value)}
                            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200 text-center" />
                        <span>Mismatch:</span>
                        <input type="number" value={mismatchScore} onChange={e => setMismatchScore(+e.target.value)}
                            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200 text-center" />
                        <span>Gap:</span>
                        <input type="number" value={gapOpen} onChange={e => setGapOpen(+e.target.value)}
                            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200 text-center" />
                        <input type="number" value={gapExtend} onChange={e => setGapExtend(+e.target.value)}
                            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-200 text-center" />
                    </div>
                </div>
            </div>

            {/* Results */}
            {result ? (
                <>
                    {/* Stats */}
                    <div className="px-4 py-2 border-b border-gray-800 flex gap-4 text-xs text-gray-400">
                        <span>Score: <b className="text-gray-200">{result.score}</b></span>
                        <span>Identity: <b className="text-gray-200">{(result.identity * 100).toFixed(1)}%</b></span>
                        <span>Gaps: <b className="text-gray-200">{result.gaps}</b></span>
                        <span>Length: <b className="text-gray-200">{result.length}</b></span>
                    </div>

                    {/* Alignment display */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <pre className="text-xs font-mono leading-5">
                            {alignmentLines.map((line, i) => (
                                <div key={i} className="mb-2">
                                    <div>
                                        <span className="text-gray-600 w-8 inline-block text-right mr-2">{line.pos1}</span>
                                        {line.seq1.split('').map((c, j) => (
                                            <span key={j} className={c === '-' ? 'text-gray-600' : line.match[j] === '|' ? 'text-green-400' : 'text-red-400'}>
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="text-gray-600 w-8 inline-block text-right mr-2"></span>
                                        {line.match.split('').map((c, j) => (
                                            <span key={j} className={c === '|' ? 'text-green-600' : c === '.' ? 'text-yellow-600' : 'text-transparent'}>
                                                {c === '|' ? '|' : c === '.' ? ':' : ' '}
                                            </span>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="text-gray-600 w-8 inline-block text-right mr-2">{line.pos2}</span>
                                        {line.seq2.split('').map((c, j) => (
                                            <span key={j} className={c === '-' ? 'text-gray-600' : line.match[j] === '|' ? 'text-green-400' : 'text-red-400'}>
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </pre>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    {seq2.length === 0
                        ? 'Paste a sequence above to align'
                        : !canAlign
                            ? 'Sequences too long for browser alignment (max 10kb query, 50kb subject)'
                            : 'Computing alignment...'}
                </div>
            )}
        </div>
    );
};
