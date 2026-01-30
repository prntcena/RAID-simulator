import { Request, Response } from 'express';
import * as raidService from '../services/raidService';
import { RaidLevel } from '../models/Raid';

export const createRaidArray = async (req: Request, res: Response) => {
    try {
        const { raidLevel, numberOfDisks } = req.body;

        if (!raidLevel || !numberOfDisks) {
            return res.status(400).json({ message: 'raidLevel and numberOfDisks are required' });
        }

        if (!Object.values(RaidLevel).includes(raidLevel)) {
            return res.status(400).json({ message: 'Invalid RAID level' });
        }

        const raidId = await raidService.createRaid(raidLevel, numberOfDisks);
        res.status(201).json({ raidId, message: `RAID ${raidLevel} array created successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error creating RAID array', error: (error as Error).message });
    }
};

export const getRaidStatus = async (req: Request, res: Response) => {
    try {
        const { raidId } = req.params;
        const status = await raidService.getRaidStatus(raidId);
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ message: 'Error getting RAID status', error: (error as Error).message });
    }
};

export const writeToRaid = async (req: Request, res: Response) => {
    try {
        const { raidId, data } = req.body;
        if (!raidId || !data) {
            return res.status(400).json({ message: 'raidId and data are required' });
        }
        await raidService.writeToRaid(raidId, data);
        res.status(200).json({ message: 'Data written successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error writing to RAID array', error: (error as Error).message });
    }
};

export const simulateCrash = async (req: Request, res: Response) => {
    try {
        const { raidId, diskIndex } = req.body;
        if (raidId === undefined || diskIndex === undefined) {
            return res.status(400).json({ message: 'raidId and diskIndex are required' });
        }
        await raidService.failDiskInRaid(raidId, diskIndex);
        const status = await raidService.getRaidStatus(raidId);
        res.status(200).json({ message: `Disk ${diskIndex} in RAID ${raidId} has failed`, status });
    } catch (error) {
        res.status(500).json({ message: 'Error simulating crash', error: (error as Error).message });
    }
};

export const replaceDisk = async (req: Request, res: Response) => {
    try {
        const { raidId, diskIndex } = req.body;
        if (raidId === undefined || diskIndex === undefined) {
            return res.status(400).json({ message: 'raidId and diskIndex are required' });
        }
        await raidService.replaceDiskInRaid(raidId, diskIndex);
        const status = await raidService.getRaidStatus(raidId);
        res.status(200).json({ message: `Disk ${diskIndex} in RAID ${raidId} has been replaced`, status });
    } catch (error) {
        res.status(500).json({ message: 'Error replacing disk', error: (error as Error).message });
    }
};

export const readFromDisk = async (req: Request, res: Response) => {
    try {
        const { raidId, diskIndex } = req.params;

        const offsetRaw = req.query.offset;
        const lengthRaw = req.query.length;

        const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : undefined;
        const length = typeof lengthRaw === 'string' ? parseInt(lengthRaw, 10) : undefined;

        const data = await raidService.readFromDisk(raidId, parseInt(diskIndex, 10), {
            offset: Number.isFinite(offset as number) ? (offset as number) : undefined,
            length: Number.isFinite(length as number) ? (length as number) : undefined,
        });
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ message: 'Error reading from disk', error: (error as Error).message });
    }
};