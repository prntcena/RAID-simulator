import React, { useState, useEffect } from 'react';
import { RaidController } from './components/RaidController';
import { RaidVisualizer } from './components/RaidVisualizer';
import { getRaidStatus } from './services/api';
import './App.css';

const App: React.FC = () => {
    const [raidId, setRaidId] = useState<string | null>(null);
    const [raidStatus, setRaidStatus] = useState<any>(null);

    // Poll for status updates every 3 seconds
    useEffect(() => {
        if (!raidId) return;

        const interval = setInterval(async () => {
            try {
                const status = await getRaidStatus(raidId);
                setRaidStatus(status);
            } catch (error) {
                console.error('Failed to fetch RAID status:', error);
                // Optionally, handle the error in the UI
            }
        }, 3000);

        return () => clearInterval(interval); // Cleanup on component unmount
    }, [raidId]);

    return (
        <div className="app-container">
            <header>
                <h1>RAID Simulator</h1>
            </header>
            <main>
                <RaidController
                    setRaidId={setRaidId}
                    setRaidStatus={setRaidStatus}
                    raidId={raidId}
                />
                <RaidVisualizer raidStatus={raidStatus} raidId={raidId} />
            </main>
        </div>
    );
};

export default App;