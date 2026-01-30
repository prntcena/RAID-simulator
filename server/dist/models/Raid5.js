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
exports.Raid5 = void 0;
const Raid_1 = require("./Raid");
const Disk_1 = require("./Disk");
const CHUNK_SIZE = 16 * 1024; // 16 KB chunks
class Raid5 extends Raid_1.Raid {
    constructor(id, disks) {
        if (disks.length < 3) {
            throw new Error('RAID 5 requires at least 3 disks.');
        }
        super(id, Raid_1.RaidLevel.RAID5, disks);
        this.writePosition = 0;
    }
    getTotalCapacity() {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }
    getUsableCapacity() {
        var _a;
        // Usable capacity is (N-1) * disk size
        return (this.disks.length - 1) * (((_a = this.disks[0]) === null || _a === void 0 ? void 0 : _a.size) || 0);
    }
    /**
     * Calculates the parity for a set of data chunks.
     */
    calculateParity(chunks) {
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
    write(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disks.filter(d => d.getStatus().status === Disk_1.DiskStatus.HEALTHY).length < this.disks.length) {
                throw new Error('Cannot write to a degraded RAID 5 array in this simulation.');
            }
            if (this.writePosition + data.length > this.getUsableCapacity()) {
                throw new Error('Not enough space in the RAID 5 array.');
            }
            const dataChunks = [];
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const chunk = data.slice(i, i + CHUNK_SIZE);
                const paddedChunk = Buffer.alloc(CHUNK_SIZE);
                chunk.copy(paddedChunk);
                dataChunks.push(paddedChunk);
            }
            const writePromises = [];
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
                    }
                    else {
                        const chunkToWrite = stripeDataChunks[dataChunkIndex++];
                        if (chunkToWrite) {
                            writePromises.push(this.disks[diskIndex].write(offset, chunkToWrite));
                        }
                    }
                }
                this.writePosition += stripeDataChunks.length * CHUNK_SIZE;
            }
            yield Promise.all(writePromises);
        });
    }
    read(length) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Read operation for RAID 5 is not fully implemented in this simulation.');
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
                const stripeChunks = yield Promise.all(readPromises);
                const reconstructedChunk = this.calculateParity(stripeChunks);
                yield newDisk.write(offset, reconstructedChunk);
            }
            console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
        });
    }
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const diskStatuses = this.disks.map(disk => disk.getStatus());
            const healthyCount = diskStatuses.filter(s => s.status === Disk_1.DiskStatus.HEALTHY).length;
            const totalDisks = this.disks.length;
            let raidStatusMessage = 'Unknown';
            if (healthyCount === totalDisks) {
                raidStatusMessage = 'Healthy';
            }
            else if (healthyCount === totalDisks - 1) {
                raidStatusMessage = 'Degraded (Fault Tolerant)';
            }
            else {
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
        });
    }
}
exports.Raid5 = Raid5;
