import React, { useState, useEffect } from 'react';
import {
    createRaidArray,
    writeToRaid,
    simulateCrash,
    replaceDisk,
    getRaidStatus,
} from '../services/api';
import { RaidLevel } from '../types';

interface RaidControllerProps {
    setRaidId: (raidId: string | null) => void;
    setRaidStatus: (status: any) => void;
    raidId: string | null;
}

export const RaidController: React.FC<RaidControllerProps> = ({ setRaidId, setRaidStatus, raidId }) => {
    const [diskCount, setDiskCount] = useState(2);
    const [raidLevel, setRaidLevel] = useState<RaidLevel>('RAID0');
    const [dataToWrite, setDataToWrite] = useState('');
    const [diskToFail, setDiskToFail] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const getMinDisks = (level: RaidLevel) => {
        switch (level) {
            case 'RAID0':
                return 2;
            case 'RAID1':
                return 2;
            case 'RAID5':
                return 3;
            case 'RAID10':
                return 4;
            default:
                return 2;
        }
    };

    const handleCreateRaid = async (e: React.FormEvent) => {
        e.preventDefault();
        const minDisks = getMinDisks(raidLevel);
        if (diskCount >= minDisks) {
            setError(null);
            setMessage(null);
            try {
                const response = await createRaidArray({ raidLevel, numberOfDisks: diskCount });
                setRaidId(response.raidId);
                setMessage(response.message);
                const status = await getRaidStatus(response.raidId);
                setRaidStatus(status);
            } catch (err) {
                setError((err as Error).message);
            }
        } else {
            setError(`RAID ${raidLevel.replace('RAID', '')} requires at least ${minDisks} disks.`);
        }
    };

    const handleWriteData = async () => {
        if (!raidId) {
            setError('Create a RAID array first.');
            return;
        }
        setError(null);
        setMessage(null);
        try {
            const response = await writeToRaid(raidId, dataToWrite);
            setMessage(response.message);
            const status = await getRaidStatus(raidId);
            setRaidStatus(status);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleSimulateCrash = async () => {
        if (!raidId) {
            setError('Create a RAID array first.');
            return;
        }
        setError(null);
        setMessage(null);
        try {
            const response = await simulateCrash(raidId, diskToFail);
            setMessage(response.message);
            setRaidStatus(response.status);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleReplaceDisk = async () => {
        if (!raidId) {
            setError('Create a RAID array first.');
            return;
        }
        setError(null);
        setMessage(null);
        try {
            const response = await replaceDisk(raidId, diskToFail);
            setMessage(response.message);
            setRaidStatus(response.status);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    useEffect(() => {
        const minDisks = getMinDisks(raidLevel);
        if (diskCount < minDisks) {
            setDiskCount(minDisks);
        }
    }, [raidLevel, diskCount]);

    return (
        <div className="raid-controller">
            <h2>RAID Controller</h2>

            {error && <div className="message error-message">{error}</div>}
            {message && <div className="message success-message">{message}</div>}

            <form onSubmit={handleCreateRaid} className="control-group">
                <h3>Create RAID Array</h3>
                <div className="form-field">
                    <label>RAID Level:</label>
                    <select value={raidLevel} onChange={(e) => setRaidLevel(e.target.value as RaidLevel)}>
                        <option value="RAID0">RAID 0 (Stripe)</option>
                        <option value="RAID1">RAID 1 (Mirror)</option>
                        <option value="RAID5">RAID 5 (Stripe with Parity)</option>
                        <option value="RAID10">RAID 10 (Stripe of Mirrors)</option>
                    </select>
                </div>
                <div className="control-group">
                    <div className="form-field">
                        <label>Number of Disks:</label>
                        <input
                            type="number"
                            value={diskCount}
                            onChange={(e) => setDiskCount(parseInt(e.target.value, 10))}
                            min={getMinDisks(raidLevel)}
                        />
                    </div>
                    <button type="submit">Create Array</button>
                </div>
            </form>

            {raidId && (
                <>
                    <div className="control-group">
                        <h3>Write Data</h3>
                        <div className="form-field">
                            <input
                                type="text"
                                value={dataToWrite}
                                onChange={(e) => setDataToWrite(e.target.value)}
                                placeholder="Enter data to write"
                            />
                            <button onClick={handleWriteData}>Write</button>
                        </div>
                    </div>

                    <div className="control-group">
                        <h3>Simulate Disk Failure</h3>
                        <div className="form-field">
                            <label>Disk Index to Fail/Replace:</label>
                            <input
                                type="number"
                                value={diskToFail}
                                onChange={(e) => setDiskToFail(parseInt(e.target.value, 10))}
                                min="0"
                            />
                            <button onClick={handleSimulateCrash} className="danger-button">
                                Fail Disk
                            </button>
                            <button onClick={handleReplaceDisk}>Replace Disk</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};