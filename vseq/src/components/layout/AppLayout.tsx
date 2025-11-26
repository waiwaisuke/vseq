import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

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
                    {children}
                </main>
            </div>
        </div>
    );
};
