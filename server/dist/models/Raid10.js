"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Raid10 = void 0;
const Raid_1 = require("./Raid");
const Disk_1 = require("./Disk");
const CHUNK_SIZE = 16 * 1024; // 16 KB chunks
class Raid10 extends Raid_1.Raid {
    constructor(id, disks) {
        if (disks.length < 4 || disks.length % 2 !== 0) {
            throw new Error('RAID 10 requires an even number of disks, with a minimum of 4.');
        }
        super(id, Raid_1.RaidLevel.RAID10, disks);
        this.pairs = [];
        this.writePosition = 0;
        this.createPairs();
    }
    createPairs() {
        for (let i = 0; i < this.disks.length; i += 2) {
            this.pairs.push({ disks: [this.disks[i], this.disks[i + 1]] });
        }
    }
    getTotalCapacity() {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }
    getUsableCapacity() {
        // Usable capacity is half the total capacity
        return this.getTotalCapacity() / 2;
    }
    write(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.writePosition + data.length > this.getUsableCapacity()) {
                throw new Error('Not enough space in the RAID 10 array.');
            }
            const dataChunks = [];
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const chunk = data.slice(i, i + CHUNK_SIZE);
                const paddedChunk = Buffer.alloc(CHUNK_SIZE);
                chunk.copy(paddedChunk);
                dataChunks.push(paddedChunk);
            }
            const writePromises = [];
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
            yield Promise.all(writePromises);
        });
    }
    read(length) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Read operation for RAID 10 is not fully implemented in this simulation.');
        });
    }
    replaceDisk(diskIndex) {
        const _super = Object.create(null, {
            replaceDisk: { get: () => super.replaceDisk }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.replaceDisk.call(this, diskIndex);
            yield this.rebuild(diskIndex);
        });
    }
    rebuild(replacedDiskIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            const pairIndex = Math.floor(replacedDiskIndex / 2);
            const pair = this.pairs[pairIndex];
            const sourceDiskIndex = replacedDiskIndex % 2 === 0 ? 1 : 0;
            const sourceDisk = pair.disks[sourceDiskIndex];
            const newDisk = pair.disks[replacedDiskIndex % 2];
            if (sourceDisk.getStatus().status !== Disk_1.DiskStatus.HEALTHY) {
                console.error(`RAID ${this.id}: Rebuild failed. Source disk in pair is not healthy.`);
                return;
            }
            console.log(`RAID ${this.id}: Starting rebuild for Disk ${replacedDiskIndex}.`);
            const totalSize = newDisk.size;
            for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
                const data = yield sourceDisk.read(offset, CHUNK_SIZE);
                yield newDisk.write(offset, data);
            }
            console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
        });
    }
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const diskStatuses = this.disks.map(disk => disk.getStatus());
            let isHealthy = true;
            let isDegraded = false;
            for (const pair of this.pairs) {
                const healthyCount = pair.disks.filter(d => d.getStatus().status === Disk_1.DiskStatus.HEALTHY).length;
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
            }
            else if (isHealthy && isDegraded) {
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
        });
    }
}
exports.Raid10 = Raid10;
