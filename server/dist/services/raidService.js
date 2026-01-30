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
exports.readFromDisk = exports.replaceDiskInRaid = exports.failDiskInRaid = exports.writeToRaid = exports.getRaidStatus = exports.createRaid = void 0;
const uuid_1 = require("uuid");
const Raid_1 = require("../models/Raid");
const Disk_1 = require("../models/Disk");
const Raid0_1 = require("../models/Raid0");
const Raid1_1 = require("../models/Raid1");
const Raid5_1 = require("../models/Raid5");
const Raid10_1 = require("../models/Raid10");
// In-memory storage for active RAID arrays
const activeRaids = new Map();
const DISK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB for simulation
/**
 * Creates a new RAID array.
 * @param raidLevel The level of the RAID array (e.g., 'RAID0').
 * @param numberOfDisks The number of disks in the array.
 * @returns The ID of the newly created RAID array.
 */
const createRaid = (raidLevel, numberOfDisks) => __awaiter(void 0, void 0, void 0, function* () {
    const raidId = (0, uuid_1.v4)();
    const disks = [];
    for (let i = 0; i < numberOfDisks; i++) {
        const disk = new Disk_1.Disk(`${raidId}-disk${i}`, DISK_SIZE_BYTES);
        yield disk.initialize();
        disks.push(disk);
    }
    let raidArray;
    switch (raidLevel) {
        case Raid_1.RaidLevel.RAID0:
            raidArray = new Raid0_1.Raid0(raidId, disks);
            break;
        case Raid_1.RaidLevel.RAID1: // Handle RAID1 creation
            raidArray = new Raid1_1.Raid1(raidId, disks);
            break;
        case Raid_1.RaidLevel.RAID5: // Handle RAID5 creation
            raidArray = new Raid5_1.Raid5(raidId, disks);
            break;
        case Raid_1.RaidLevel.RAID10: // Handle RAID10 creation
            raidArray = new Raid10_1.Raid10(raidId, disks);
            break;
        // Other RAID levels will be added here
        default:
            throw new Error(`RAID level ${raidLevel} is not supported.`);
    }
    activeRaids.set(raidId, raidArray);
    console.log(`RAID array ${raidId} created with level ${raidLevel} and ${numberOfDisks} disks.`);
    return raidId;
});
exports.createRaid = createRaid;
/**
 * Gets the status of a specific RAID array.
 * @param raidId The ID of the RAID array.
 * @returns The status of the RAID array.
 */
const getRaidStatus = (raidId) => __awaiter(void 0, void 0, void 0, function* () {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    return raidArray.getStatus();
});
exports.getRaidStatus = getRaidStatus;
/**
 * Writes data to a RAID array.
 * @param raidId The ID of the RAID array.
 * @param data The data to write.
 */
const writeToRaid = (raidId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    const buffer = Buffer.from(data, 'utf-8');
    yield raidArray.write(buffer);
});
exports.writeToRaid = writeToRaid;
/**
 * Simulates a disk failure in a RAID array.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to fail.
 */
const failDiskInRaid = (raidId, diskIndex) => __awaiter(void 0, void 0, void 0, function* () {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    raidArray.failDisk(diskIndex);
});
exports.failDiskInRaid = failDiskInRaid;
/**
 * Replaces a failed disk in a RAID array.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to replace.
 */
const replaceDiskInRaid = (raidId, diskIndex) => __awaiter(void 0, void 0, void 0, function* () {
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    yield raidArray.replaceDisk(diskIndex);
});
exports.replaceDiskInRaid = replaceDiskInRaid;
/**
 * Reads a chunk of data from a specific disk for demonstration.
 * @param raidId The ID of the RAID array.
 * @param diskIndex The index of the disk to read from.
 * @returns The data read from the disk as a string.
 */
const readFromDisk = (raidId, diskIndex, options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const raidArray = activeRaids.get(raidId);
    if (!raidArray) {
        throw new Error(`RAID array with ID ${raidId} not found.`);
    }
    const disks = raidArray.disks;
    const disk = disks[diskIndex];
    if (!disk) {
        throw new Error(`Invalid disk index ${diskIndex}.`);
    }
    const offset = Math.max(0, (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : 0);
    // Default to 64KB so you can see multiple stripes, but cap to disk size.
    const requestedLength = (_b = options === null || options === void 0 ? void 0 : options.length) !== null && _b !== void 0 ? _b : 64 * 1024;
    const length = Math.min(Math.max(0, requestedLength), Math.max(0, disk.size - offset));
    // This is a simplified read for demonstration.
    const data = yield disk.read(offset, length);
    // Filter out null bytes for cleaner display
    const printableData = data.toString('utf-8').replace(/\x00/g, '');
    return printableData;
});
exports.readFromDisk = readFromDisk;
