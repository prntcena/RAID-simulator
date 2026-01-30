import { Raid, RaidLevel, RaidStatus } from './Raid';
import { Disk, DiskStatus } from './Disk';

export class Raid1 extends Raid {
    private writePosition: number = 0;

    constructor(id: string, disks: Disk[]) {
        if (disks.length < 2) {
            throw new Error('RAID 1 requires at least 2 disks.');
        }
        super(id, RaidLevel.RAID1, disks);
    }

    public getTotalCapacity(): number {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }

    public getUsableCapacity(): number {
        // In RAID 1, usable capacity is the size of the smallest disk. For simplicity, we assume all disks are the same size.
        return this.disks[0]?.size || 0;
    }

    /**
     * Writes data by mirroring it to all healthy disks.
     */
    public async write(data: Buffer): Promise<void> {
        const healthyDisks = this.disks.filter(d => d.getStatus().status === DiskStatus.HEALTHY);
        if (healthyDisks.length === 0) {
            throw new Error('Cannot write to RAID 1 array: No healthy disks available.');
        }

        if (this.writePosition + data.length > this.getUsableCapacity()) {
            throw new Error('Not enough space in the RAID 1 array.');
        }

        const writePromises = healthyDisks.map(disk => disk.write(this.writePosition, data));
        await Promise.all(writePromises);

        this.writePosition += data.length;
    }

    /**
     * Reads data from the first available healthy disk.
     */
    public async read(length: number): Promise<Buffer> {
        const healthyDisk = this.disks.find(d => d.getStatus().status === DiskStatus.HEALTHY);
        if (!healthyDisk) {
            throw new Error('Cannot read from RAID 1 array: No healthy disks available.');
        }
        // In a real scenario, you might read from the least busy disk. Here, we just take the first one.
        return healthyDisk.read(0, length);
    }

    /**
     * Replaces a disk and initiates a rebuild process to restore redundancy.
     * @param diskIndex The index of the disk to replace.
     */
    public async replaceDisk(diskIndex: number): Promise<void> {
        await super.replaceDisk(diskIndex);
        await this.rebuild(diskIndex);
    }

    /**
     * Copies all data from a healthy disk to the newly replaced disk.
     * @param replacedDiskIndex The index of the disk that was just replaced.
     */
    private async rebuild(replacedDiskIndex: number): Promise<void> {
        const healthyDisk = this.disks.find((d, i) => i !== replacedDiskIndex && d.getStatus().status === DiskStatus.HEALTHY);
        if (!healthyDisk) {
            console.warn(`RAID ${this.id}: Rebuild skipped. No healthy disk found to copy from.`);
            return;
        }

        const newDisk = this.disks[replacedDiskIndex];
        console.log(`RAID ${this.id}: Starting rebuild for Disk ${replacedDiskIndex} from Disk ${this.disks.indexOf(healthyDisk)}.`);

        // In a real system, this would be a chunk-by-chunk copy.
        // For simulation, we read the entire content of the healthy disk and write it to the new one.
        const fullContent = await healthyDisk.read(0, healthyDisk.size);
        await newDisk.write(0, fullContent);

        console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
    }

    public async getStatus(): Promise<RaidStatus> {
        const diskStatuses = this.disks.map(disk => disk.getStatus());
        const healthyCount = diskStatuses.filter(s => s.status === DiskStatus.HEALTHY).length;

        let raidStatusMessage = 'Unknown';
        if (healthyCount === this.disks.length) {
            raidStatusMessage = 'Healthy';
        } else if (healthyCount > 0) {
            raidStatusMessage = 'Degraded (Redundancy Lost)';
        } else {
            raidStatusMessage = 'Failed (All Disks Failed)';
        }

        return {
            id: this.id,
            level: this.level,
            totalCapacity: this.getTotalCapacity(),
            usableCapacity: this.getUsableCapacity(),
            disks: diskStatuses,
            raidStatus: raidStatusMessage,
        };
    }
}
