import { Raid, RaidLevel, RaidStatus } from './Raid';
import { Disk, DiskStatus } from './Disk';

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks for striping

export class Raid0 extends Raid {
    private writePosition: number = 0; // Tracks the logical end of the data across the array

    constructor(id: string, disks: Disk[]) {
        if (disks.length < 1) {
            throw new Error('RAID 0 requires at least 1 disk.');
        }
        super(id, RaidLevel.RAID0, disks);
    }

    public getTotalCapacity(): number {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }

    public getUsableCapacity(): number {
        // In RAID 0, all disk space is usable.
        return this.getTotalCapacity();
    }

    /**
     * Writes data by striping it across all available disks.
     * If any disk has failed, the write operation will fail.
     */
    public async write(data: Buffer): Promise<void> {
        if (this.disks.some(d => d.getStatus().status === DiskStatus.FAILED)) {
            throw new Error('Cannot write to RAID 0 array with a failed disk.');
        }

        if (this.writePosition + data.length > this.getUsableCapacity()) {
            throw new Error('Not enough space in the RAID 0 array.');
        }

        const dataChunks: Buffer[] = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            dataChunks.push(data.slice(i, i + CHUNK_SIZE));
        }

        const writePromises: Promise<void>[] = [];
        let currentLogicalPosition = this.writePosition;

        for (const chunk of dataChunks) {
            const stripeNumber = Math.floor(currentLogicalPosition / CHUNK_SIZE);
            const diskIndex = stripeNumber % this.disks.length;
            const offsetInDisk = Math.floor(stripeNumber / this.disks.length) * CHUNK_SIZE;

            const disk = this.disks[diskIndex];
            // Pad the chunk if it's smaller than CHUNK_SIZE
            const chunkToWrite = Buffer.alloc(CHUNK_SIZE);
            chunk.copy(chunkToWrite);

            writePromises.push(disk.write(offsetInDisk, chunkToWrite));

            currentLogicalPosition += chunk.length; // Advance by actual chunk length
        }

        await Promise.all(writePromises);
        this.writePosition = currentLogicalPosition;
    }

    /**
     * Reading from a RAID 0 array is complex and for this simulation,
     * we focus on demonstrating the write and failure characteristics.
     * A real implementation would require reassembling stripes.
     */
    public async read(length: number): Promise<Buffer> {
        // A full read implementation would be the reverse of write.
        // For this simulation, we'll throw an error to indicate it's not the focus.
        throw new Error('Read operation for RAID 0 is not fully implemented in this simulation.');
    }

    /**
     * Gets the status of the RAID 0 array.
     * The array is considered healthy only if all disks are healthy.
     */
    public async getStatus(): Promise<RaidStatus> {
        const diskStatuses = this.disks.map(disk => disk.getStatus());
        const isHealthy = diskStatuses.every(s => s.status === DiskStatus.HEALTHY);

        return {
            id: this.id,
            level: this.level,
            totalCapacity: this.getTotalCapacity(),
            usableCapacity: this.getUsableCapacity(),
            disks: diskStatuses,
            // Add a specific status message for the UI
            raidStatus: isHealthy ? 'Healthy' : 'DEGRADED - DATA LOSS',
        };
    }
}
