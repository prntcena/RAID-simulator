import { v4 as uuidv4 } from 'uuid';
import { Raid, RaidLevel, RaidStatus } from '../models/Raid';
import { Disk } from '../models/Disk';
import { Raid0 } from '../models/Raid0';
import { Raid1 } from '../models/Raid1';
import { Raid5 } from '../models/Raid5';
import { Raid10 } from '../models/Raid10';

// In-memory storage for active RAID arrays
const activeRaids: Map<string, Raid> = new Map();

const DISK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB for simulation

/**
 * Creates a new RAID array.
 * @param raidLevel The level of the RAID array (e.g., 'RAID0').
 * @param numberOfDisks The number of disks in the array.
 * @returns The ID of the newly created RAID array.
 */
export const createRaid = async (
    raidLevel: RaidLevel,
    numberOfDisks: number
): Promise<string> => {
    const raidId = uuidv4();
    const disks: Disk[] = [];

    for (let i = 0; i < numberOfDisks; i++) {
        const disk = new Disk(`${raidId}-disk${i}`, DISK_SIZE_BYTES);
        await disk.initialize();
        disks.push(disk);
    }

    let raidArray: Raid;

    switch (raidLevel) {
        case RaidLevel.RAID0:
            raidArray = new Raid0(raidId, disks);
            break;
        case RaidLevel.RAID1: // Handle RAID1 creation
            raidArray = new Raid1(raidId, disks);
            break;
        case RaidLevel.RAID5: // Handle RAID5 creation
            raidArray = new Raid5(raidId, disks);
            break;
        case RaidLevel.RAID10: // Handle RAID10 creation
            raidArray = new Raid10(raidId, disks);
            break;
        // Other RAID levels will be added here
        default:
            throw new Error(`RAID level ${raidLevel} is not supported.`);
    }

    activeRaids.set(raidId, raidArray);
    console.log(`RAID array ${raidId} created with level ${raidLevel} and ${numberOfDisks} disks.`);
    return raidId;
};

/**
 * Gets the status of a specific RAID array.
 * @param raidId The ID of the RAID array.
 * @returns The status of the RAID array.
 */
export const getRaidStatus = async (raidId: string): Promise<RaidStatus> => {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    return raidArray.getStatus();
};

/**
 * Writes data to a RAID array.
 * @param raidId The ID of the RAID array.
 * @param data The data to write.
 */
export const writeToRaid = async (raidId: string, data: string): Promise<void> => {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    const buffer = Buffer.from(data, 'utf-8');
    await raidArray.write(buffer);
};

/**
 * Simulates a disk failure in a RAID array.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to fail.
 */
export const failDiskInRaid = async (raidId: string, diskIndex: number): Promise<void> => {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    raidArray.failDisk(diskIndex);
};

/**
 * Replaces a failed disk in a RAID array.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to replace.
 */
export const replaceDiskInRaid = async (raidId: string, diskIndex: number): Promise<void> => {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    await raidArray.replaceDisk(diskIndex);
};

/**
 * Reads a chunk of data from a specific disk for demonstration.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to read from.
 * @returns The data read from the disk as a string.
 */
export const readFromDisk = async (
    raidId: string,
    diskIndex: number,
    options?: { offset?: number; length?: number }
): Promise<string> => {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }

    const disks = (raidArray as any).disks as Disk[];
    const disk = disks[diskIndex];
    if (!disk) {
        throw new Error(`Invalid disk index ${diskIndex}.`);
    }

    const offset = Math.max(0, options?.offset ?? 0);
    // Default to 64KB so you can see multiple stripes, but cap to disk size.
    const requestedLength = options?.length ?? 64 * 1024;
    const length = Math.min(Math.max(0, requestedLength), Math.max(0, disk.size - offset));

    // This is a simplified read for demonstration.
    const data = await disk.read(offset, length);

    // Filter out null bytes for cleaner display
    const printableData = data.toString('utf-8').replace(/\x00/g, '');
    return printableData;
};