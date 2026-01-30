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
exports.Raid1 = void 0;
const Raid_1 = require("./Raid");
const Disk_1 = require("./Disk");
class Raid1 extends Raid_1.Raid {
    constructor(id, disks) {
        if (disks.length < 2) {
            throw new Error('RAID 1 requires at least 2 disks.');
        }
        super(id, Raid_1.RaidLevel.RAID1, disks);
        this.writePosition = 0;
    }
    getTotalCapacity() {
        return this.disks.reduce((sum, disk) => sum + disk.size, 0);
    }
    getUsableCapacity() {
        var _a;
        // In RAID 1, usable capacity is the size of the smallest disk. For simplicity, we assume all disks are the same size.
        return ((_a = this.disks[0]) === null || _a === void 0 ? void 0 : _a.size) || 0;
    }
    /**
     * Writes data by mirroring it to all healthy disks.
     */
    write(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const healthyDisks = this.disks.filter(d => d.getStatus().status === Disk_1.DiskStatus.HEALTHY);
            if (healthyDisks.length === 0) {
                throw new Error('Cannot write to RAID 1 array: No healthy disks available.');
            }
            if (this.writePosition + data.length > this.getUsableCapacity()) {
                throw new Error('Not enough space in the RAID 1 array.');
            }
            const writePromises = healthyDisks.map(disk => disk.write(this.writePosition, data));
            yield Promise.all(writePromises);
            this.writePosition += data.length;
        });
    }
    /**
     * Reads data from the first available healthy disk.
     */
    read(length) {
        return __awaiter(this, void 0, void 0, function* () {
            const healthyDisk = this.disks.find(d => d.getStatus().status === Disk_1.DiskStatus.HEALTHY);
            if (!healthyDisk) {
                throw new Error('Cannot read from RAID 1 array: No healthy disks available.');
            }
            // In a real scenario, you might read from the least busy disk. Here, we just take the first one.
            return healthyDisk.read(0, length);
        });
    }
    /**
     * Replaces a disk and initiates a rebuild process to restore redundancy.
     * @param diskIndex The index of the disk to replace.
     */
    replaceDisk(diskIndex) {
        const _super = Object.create(null, {
            replaceDisk: { get: () => super.replaceDisk }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.replaceDisk.call(this, diskIndex);
            yield this.rebuild(diskIndex);
        });
    }
    /**
     * Copies all data from a healthy disk to the newly replaced disk.
     * @param replacedDiskIndex The index of the disk that was just replaced.
     */
    rebuild(replacedDiskIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            const healthyDisk = this.disks.find((d, i) => i !== replacedDiskIndex && d.getStatus().status === Disk_1.DiskStatus.HEALTHY);
            if (!healthyDisk) {
                console.warn(`RAID ${this.id}: Rebuild skipped. No healthy disk found to copy from.`);
                return;
            }
            const newDisk = this.disks[replacedDiskIndex];
            console.log(`RAID ${this.id}: Starting rebuild for Disk ${replacedDiskIndex} from Disk ${this.disks.indexOf(healthyDisk)}.`);
            // In a real system, this would be a chunk-by-chunk copy.
            // For simulation, we read the entire content of the healthy disk and write it to the new one.
            const fullContent = yield healthyDisk.read(0, healthyDisk.size);
            yield newDisk.write(0, fullContent);
            console.log(`RAID ${this.id}: Rebuild for Disk ${replacedDiskIndex} completed.`);
        });
    }
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const diskStatuses = this.disks.map(disk => disk.getStatus());
            const healthyCount = diskStatuses.filter(s => s.status === Disk_1.DiskStatus.HEALTHY).length;
            let raidStatusMessage = 'Unknown';
            if (healthyCount === this.disks.length) {
                raidStatusMessage = 'Healthy';
            }
            else if (healthyCount > 0) {
                raidStatusMessage = 'Degraded (Redundancy Lost)';
            }
            else {
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
        });
    }
}
exports.Raid1 = Raid1;
