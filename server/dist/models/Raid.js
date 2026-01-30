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
exports.Raid = exports.RaidLevel = void 0;
var RaidLevel;
(function (RaidLevel) {
    RaidLevel["RAID0"] = "RAID0";
    RaidLevel["RAID1"] = "RAID1";
    RaidLevel["RAID5"] = "RAID5";
    RaidLevel["RAID10"] = "RAID10";
})(RaidLevel = exports.RaidLevel || (exports.RaidLevel = {}));
class Raid {
    constructor(id, level, disks) {
        this.id = id;
        this.level = level;
        this.disks = disks;
    }
    /**
     * Handles a disk failure within the array.
     * @param diskIndex The index of the failed disk.
     */
    failDisk(diskIndex) {
        if (diskIndex < 0 || diskIndex >= this.disks.length) {
            throw new Error('Invalid disk index.');
        }
        this.disks[diskIndex].fail();
    }
    /**
     * Replaces a disk and triggers the rebuild process if necessary.
     * @param diskIndex The index of the disk to replace.
     */
    replaceDisk(diskIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            if (diskIndex < 0 || diskIndex >= this.disks.length) {
                throw new Error('Invalid disk index.');
            }
            yield this.disks[diskIndex].replace();
            // Subclasses will override this to handle rebuilding
        });
    }
}
exports.Raid = Raid;
