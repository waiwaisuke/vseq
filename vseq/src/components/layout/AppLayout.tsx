import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FileList } from './FileList';
import { ResizablePanel } from './ResizablePanel';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
    return (
        <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden relative flex flex-col">
                    <ResizablePanel defaultTopHeight={30} minTopHeight={15} minBottomHeight={30}>
                        <FileList />
                        {children}
                    </ResizablePanel>
                </main>
            </div>
        </div>
    );
};
