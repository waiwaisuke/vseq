import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ResizablePanelProps {
    children: [React.ReactNode, React.ReactNode];
    defaultTopHeight?: number; // Percentage (0-100)
    minTopHeight?: number; // Percentage
    minBottomHeight?: number; // Percentage
}

export const ResizablePanel = ({
    children,
    defaultTopHeight = 30,
    minTopHeight = 15,
    minBottomHeight = 20
}: ResizablePanelProps) => {
    const [topHeight, setTopHeight] = useState(defaultTopHeight);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const mouseY = e.clientY - containerRect.top;

        // Calculate new top height as percentage
        let newTopHeight = (mouseY / containerHeight) * 100;

        // Apply constraints
        newTopHeight = Math.max(minTopHeight, Math.min(100 - minBottomHeight, newTopHeight));

        setTopHeight(newTopHeight);
    }, [isDragging, minTopHeight, minBottomHeight]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className="flex flex-col h-full">
            {/* Top Panel */}
            <div style={{ height: `${topHeight}%` }} className="overflow-hidden">
                {children[0]}
            </div>

            {/* Divider */}
            <div
                onMouseDown={handleMouseDown}
                className={`
                    h-1 bg-gray-800 cursor-ns-resize flex items-center justify-center
                    hover:bg-blue-600/30 transition-colors duration-150
                    ${isDragging ? 'bg-blue-600/50' : ''}
                `}
            >
                <div className="h-0.5 w-12 bg-gray-600 rounded-full" />
            </div>

            {/* Bottom Panel */}
            <div style={{ height: `${100 - topHeight}%` }} className="overflow-hidden flex-1">
                {children[1]}
            </div>
        </div>
    );
};
