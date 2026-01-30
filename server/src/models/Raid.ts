import { Disk } from './Disk';

export enum RaidLevel {
    RAID0 = 'RAID0',
    RAID1 = 'RAID1',
    RAID5 = 'RAID5',
    RAID10 = 'RAID10',
}

export interface RaidStatus {
    id: string;
    level: RaidLevel;
    totalCapacity: number;
    usableCapacity: number;
    disks: { id: string; status: string; size: number }[];
    raidStatus?: string;
}

export abstract class Raid {
    public readonly id: string;
    public readonly level: RaidLevel;
    protected disks: Disk[];

    constructor(id: string, level: RaidLevel, disks: Disk[]) {
        this.id = id;
        this.level = level;
        this.disks = disks;
    }

    /**
     * Writes data to the RAID array.
     * @param data The data to write.
     */
    public abstract write(data: Buffer): Promise<void>;

    /**
     * Reads data from the RAID array.
     * @param length The number of bytes to read.
     */
    public abstract read(length: number): Promise<Buffer>;

    /**
     * Gets the status of the RAID array.
     */
    public abstract getStatus(): Promise<RaidStatus>;

    /**
     * Gets the total capacity of the array.
     */
    public abstract getTotalCapacity(): number;

    /**
     * Gets the usable capacity of the array.
     */
    public abstract getUsableCapacity(): number;

    /**
     * Handles a disk failure within the array.
     * @param diskIndex The index of the failed disk.
     */
    public failDisk(diskIndex: number): void {
        if (diskIndex < 0 || diskIndex >= this.disks.length) {
            throw new Error('Invalid disk index.');
        }
        this.disks[diskIndex].fail();
    }

    /**
     * Replaces a disk and triggers the rebuild process if necessary.
     * @param diskIndex The index of the disk to replace.
     */
    public async replaceDisk(diskIndex: number): Promise<void> {
        if (diskIndex < 0 || diskIndex >= this.disks.length) {
            throw new Error('Invalid disk index.');
        }
        await this.disks[diskIndex].replace();
        // Subclasses will override this to handle rebuilding
    }
}