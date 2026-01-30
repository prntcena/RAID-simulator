import { Raid, RaidLevel, RaidStatus } from './Raid';
import { Disk, DiskStatus } from './Disk';

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks

interface MirroredPair {
    disks: [Disk, Disk];
}

export class Raid10 extends Raid {
    private pairs: MirroredPair[] = [];
    private writePosition: number = 0;

    constructor(id: string, disks: Disk[]) {
        if (disks.length < 4 || disks.length % 2 !== 0) {
            throw new Error('RAID 10 requires an even number of disks, with a minimum of 4.');
        }
        super(id, RaidLevel.RAID10, disks);
        this.createPairs();
    }

    private createPairs() {
        for (let i = 0; i < this.disks.length; i += 2) {
            this.pairs.push({ disks: [this.disks[i], this.disks[i + 1]] });
        }
    }

    public getTotalCapacity(): number {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }

    public getUsableCapacity(): number {
        // Usable capacity is half the total capacity
        return this.getTotalCapacity() / 2;
    }

    public async write(data: Buffer): Promise<void> {
        if (this.writePosition + data.length > this.getUsableCapacity()) {
            throw new Error('Not enough space in the RAID 10 array.');
        }

        const dataChunks: Buffer[] = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const paddedChunk = Buffer.alloc(CHUNK_SIZE);
            chunk.copy(paddedChunk);
            dataChunks.push(paddedChunk);
        }

        const writePromises: Promise<void>[] = [];
        const startingChunkIndex = this.writePosition / CHUNK_SIZE;

        for (let i = 0; i < dataChunks.length; i++) {
            const chunk = dataChunks[i];
            const currentChunkIndex = startingChunkIndex + i;

            // Determine which mirrored pair to write to (striping)
            const pairIndex = currentChunkIndex % this.pairs.length;
            const pair = this.pairs[pairIndex];
            
            // Determine the offset within the disks of that pair
            const stripeIndex = Math.floor(currentChunkIndex / this.pairs.length);
            const offset = stripeIndex * CHUNK_SIZE;

            // Write to both disks in the mirrored pair
            writePromises.push(pair.disks[0].write(offset, chunk));
            writePromises.push(pair.disks[1].write(offset, chunk));
        }

        this.writePosition += dataChunks.length * CHUNK_SIZE;
        await Promise.all(writePromises);
    }

    public async read(length: number): Promise<Buffer> {
        throw new Error('Read operation for RAID 10 is not fully implemented in this simulation.');
    }

    public async replaceDisk(diskIndex: number): Promise<void> {
        await super.replaceDisk(diskIndex);
        await this.rebuild(diskIndex);
    }

    private async rebuild(replacedDiskIndex: number): Promise<void> {
        const pairIndex = Math.floor(replacedDiskIndex / 2);
        const pair = this.pairs[pairIndex];
        const sourceDiskIndex = replacedDiskIndex % 2 === 0 ? 1 : 0;
        const sourceDisk = pair.disks[sourceDiskIndex];
        const newDisk = pair.disks[replacedDiskIndex % 2];

        if (sourceDisk.getStatus().status !== DiskStatus.HEALTHY) {
            console.error(`RAID ${this.id}: Rebuild failed. Source disk in pair is not healthy.`);
            return;
        }

        console.log(`RAID ${this.id}: Starting rebuild for Disk ${replacedDiskIndex}.`);
        
        const totalSize = newDisk.size;
        for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
            const data = await sourceDisk.read(offset, CHUNK_SIZE);
            await newDisk.write(offset, data);
        }

        console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
    }

    public async getStatus(): Promise<RaidStatus> {
        const diskStatuses = this.disks.map(disk => disk.getStatus());
        let isHealthy = true;
        let isDegraded = false;

        for (const pair of this.pairs) {
            const healthyCount = pair.disks.filter(d => d.getStatus().status === DiskStatus.HEALTHY).length;
            if (healthyCount === 0) {
                isHealthy = false;
                isDegraded = false; // Data loss
                break;
            }
            if (healthyCount === 1) {
                isDegraded = true;
            }
        }

        let raidStatusMessage = 'Failed (Data Loss)';
        if (isHealthy && !isDegraded) {
            raidStatusMessage = 'Healthy';
        } else if (isHealthy && isDegraded) {
            raidStatusMessage = 'Degraded (Fault Tolerant)';
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
