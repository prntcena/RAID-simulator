import { Raid, RaidLevel, RaidStatus } from './Raid';
import { Disk, DiskStatus } from './Disk';

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks

export class Raid5 extends Raid {
    private writePosition: number = 0;

    constructor(id: string, disks: Disk[]) {
        if (disks.length < 3) {
            throw new Error('RAID 5 requires at least 3 disks.');
        }
        super(id, RaidLevel.RAID5, disks);
    }

    public getTotalCapacity(): number {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }

    public getUsableCapacity(): number {
        // Usable capacity is (N-1) * disk size
        return (this.disks.length - 1) * (this.disks[0]?.size || 0);
    }

    /**
     * Calculates the parity for a set of data chunks.
     */
    private calculateParity(chunks: Buffer[]): Buffer {
        const parity = Buffer.alloc(CHUNK_SIZE);
        for (const chunk of chunks) {
            for (let i = 0; i < CHUNK_SIZE; i++) {
                parity[i] ^= chunk[i] || 0;
            }
        }
        return parity;
    }

    /**
     * Writes data by striping it across disks with distributed parity.
     */
    public async write(data: Buffer): Promise<void> {
        if (this.disks.filter(d => d.getStatus().status === DiskStatus.HEALTHY).length < this.disks.length) {
            throw new Error('Cannot write to a degraded RAID 5 array in this simulation.');
        }

        if (this.writePosition + data.length > this.getUsableCapacity()) {
            throw new Error('Not enough space in the RAID 5 array.');
        }

        const dataChunks: Buffer[] = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const paddedChunk = Buffer.alloc(CHUNK_SIZE);
            chunk.copy(paddedChunk);
            dataChunks.push(paddedChunk);
        }

        const writePromises: Promise<void>[] = [];
        const chunksPerStripe = this.disks.length - 1;

        for (let i = 0; i < dataChunks.length; i += chunksPerStripe) {
            const stripeDataChunks = dataChunks.slice(i, i + chunksPerStripe);
            const parityChunk = this.calculateParity(stripeDataChunks);

            const stripeIndex = Math.floor(this.writePosition / (chunksPerStripe * CHUNK_SIZE));
            const parityDiskIndex = (this.disks.length - 1) - (stripeIndex % this.disks.length);
            
            const offset = stripeIndex * CHUNK_SIZE;
            let dataChunkIndex = 0;

            for (let diskIndex = 0; diskIndex < this.disks.length; diskIndex++) {
                if (diskIndex === parityDiskIndex) {
                    writePromises.push(this.disks[diskIndex].write(offset, parityChunk));
                } else {
                    const chunkToWrite = stripeDataChunks[dataChunkIndex++];
                    if (chunkToWrite) {
                        writePromises.push(this.disks[diskIndex].write(offset, chunkToWrite));
                    }
                }
            }
            this.writePosition += stripeDataChunks.length * CHUNK_SIZE;
        }

        await Promise.all(writePromises);
    }

    public async read(length: number): Promise<Buffer> {
        throw new Error('Read operation for RAID 5 is not fully implemented in this simulation.');
    }

    public async replaceDisk(diskIndex: number): Promise<void> {
        await super.replaceDisk(diskIndex);
        await this.rebuild(diskIndex);
    }

    private async rebuild(replacedDiskIndex: number): Promise<void> {
        const healthyDisks = this.disks.filter((_, i) => i !== replacedDiskIndex);
        if (healthyDisks.length < this.disks.length - 1) {
            console.warn(`RAID ${this.id}: Rebuild failed. Not enough healthy disks.`);
            return;
        }

        console.log(`RAID ${this.id}: Starting rebuild for Disk ${replacedDiskIndex}.`);
        const newDisk = this.disks[replacedDiskIndex];
        const stripeCount = Math.floor(this.getUsableCapacity() / ((this.disks.length - 1) * CHUNK_SIZE));

        for (let stripeIndex = 0; stripeIndex < stripeCount; stripeIndex++) {
            const offset = stripeIndex * CHUNK_SIZE;
            const parityDiskIndex = (this.disks.length - 1) - (stripeIndex % this.disks.length);

            const readPromises = healthyDisks.map(disk => disk.read(offset, CHUNK_SIZE));
            const stripeChunks = await Promise.all(readPromises);
            
            const reconstructedChunk = this.calculateParity(stripeChunks);
            await newDisk.write(offset, reconstructedChunk);
        }

        console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
    }

    public async getStatus(): Promise<RaidStatus> {
        const diskStatuses = this.disks.map(disk => disk.getStatus());
        const healthyCount = diskStatuses.filter(s => s.status === DiskStatus.HEALTHY).length;
        const totalDisks = this.disks.length;

        let raidStatusMessage = 'Unknown';
        if (healthyCount === totalDisks) {
            raidStatusMessage = 'Healthy';
        } else if (healthyCount === totalDisks - 1) {
            raidStatusMessage = 'Degraded (Fault Tolerant)';
        } else {
            raidStatusMessage = 'Failed (Data Loss)';
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
