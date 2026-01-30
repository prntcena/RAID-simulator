import React from 'react';
import { readFromDisk } from '../services/api';

// Define the props for the component
interface RaidVisualizerProps {
    raidStatus: any; // The status object from the server
    raidId: string | null;
}

export const RaidVisualizer: React.FC<RaidVisualizerProps> = ({ raidStatus, raidId }) => {
    if (!raidStatus) {
        return <div className="raid-visualizer">
            <p>No RAID array configured. Use the controller to create one.</p>
        </div>;
    }

    const { level, totalCapacity, usableCapacity, disks, raidStatus: overallStatus } = raidStatus;

    const handleReadFromDisk = async (diskIndex: number) => {
        if (!raidId) {
            alert('RAID ID is not available.');
            return;
        }
        try {
            const response = await readFromDisk(raidId, diskIndex);
            // Show the data in a simple alert. An empty string means no printable data was found.
            alert(`Data on Disk ${diskIndex}:\n\n"${response.data || '(empty)'}"`);
        } catch (error) {
            alert(`Could not read from disk: ${(error as Error).message}`);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="raid-visualizer">
            <h2>RAID Status</h2>
            <div className="raid-summary">
                <p><strong>ID:</strong> {raidId}</p>
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Overall Status:</strong> <span className={`status-${overallStatus?.toLowerCase().replace(/ /g, '-')}`}>{overallStatus}</span></p>
                <p><strong>Total Capacity:</strong> {formatBytes(totalCapacity)}</p>
                <p><strong>Usable Capacity:</strong> {formatBytes(usableCapacity)}</p>
            </div>
            <h3>Disks</h3>
            <div className="disks-container">
                {disks.map((disk: any, index: number) => (
                    <div key={disk.id} className={`disk-card status-${disk.status.toLowerCase()}`}>
                        <div className="disk-header">Disk {index}</div>
                        <div className="disk-body">
                            <p><strong>ID:</strong> {disk.id.split('-').slice(-1)[0]}</p>
                            <p><strong>Status:</strong> {disk.status}</p>
                            <p><strong>Size:</strong> {formatBytes(disk.size)}</p>
                            <button className="read-button" onClick={() => handleReadFromDisk(index)}>Read Data</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};