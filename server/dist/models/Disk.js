"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Disk = exports.DiskStatus = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
var DiskStatus;
(function (DiskStatus) {
    DiskStatus["HEALTHY"] = "HEALTHY";
    DiskStatus["FAILED"] = "FAILED";
})(DiskStatus = exports.DiskStatus || (exports.DiskStatus = {}));
const STORAGE_PATH = path.join(__dirname, '..', '..', 'storage');
class Disk {
    constructor(id, size) {
        this.id = id;
        this.size = size;
        this.status = DiskStatus.HEALTHY;
        this.filePath = path.join(STORAGE_PATH, `${this.id}.disk`);
    }
    /**
     * Initializes the disk by creating the storage directory and the disk file.
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.mkdir(STORAGE_PATH, { recursive: true });
                // Create an empty file representing the disk
                yield fs.writeFile(this.filePath, Buffer.alloc(this.size));
                console.log(`Disk ${this.id} initialized with size ${this.size} bytes.`);
            }
            catch (error) {
                console.error(`Error initializing disk ${this.id}:`, error);
                throw new Error(`Failed to initialize disk ${this.id}.`);
            }
        });
    }
    /**
     * Writes data to the disk at a specific offset.
     * @param offset The position to start writing to.
     * @param data The data to write.
     */
    write(offset, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.status === DiskStatus.FAILED) {
                throw new Error(`Disk ${this.id} has failed. Cannot write.`);
            }
            if (offset + data.length > this.size) {
                throw new Error('Write operation exceeds disk size.');
            }
            try {
                const fileHandle = yield fs.open(this.filePath, 'r+');
                yield fileHandle.write(data, 0, data.length, offset);
                yield fileHandle.close();
            }
            catch (error) {
                console.error(`Error writing to disk ${this.id}:`, error);
                this.fail();
                throw new Error(`Error writing to disk ${this.id}.`);
            }
        });
    }
    /**
     * Reads data from the disk.
     * @param offset The position to start reading from.
     * @param length The number of bytes to read.
     */
    read(offset, length) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.status === DiskStatus.FAILED) {
                throw new Error(`Disk ${this.id} has failed. Cannot read.`);
            }
            if (offset + length > this.size) {
                throw new Error('Read operation exceeds disk size.');
            }
            try {
                const fileHandle = yield fs.open(this.filePath, 'r');
                const buffer = Buffer.alloc(length);
                yield fileHandle.read(buffer, 0, length, offset);
                yield fileHandle.close();
                return buffer;
            }
            catch (error) {
                console.error(`Error reading from disk ${this.id}:`, error);
                this.fail();
                throw new Error(`Error reading from disk ${this.id}.`);
            }
        });
    }
    /**
     * Marks the disk as failed.
     */
    fail() {
        this.status = DiskStatus.FAILED;
        console.log(`Disk ${this.id} has failed.`);
    }
    /**
     * Replaces the disk, effectively healing it and restoring its file.
     */
    replace() {
        return __awaiter(this, void 0, void 0, function* () {
            this.status = DiskStatus.HEALTHY;
            // Re-create the empty file
            yield this.initialize();
            console.log(`Disk ${this.id} has been replaced and is now healthy.`);
        });
    }
    /**
     * Gets the current status of the disk.
     */
    getStatus() {
        return {
            id: this.id,
            status: this.status,
            size: this.size,
        };
    }
    /**
     * Cleans up the disk file.
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.unlink(this.filePath);
            }
            catch (error) {
                // Ignore errors if the file doesn't exist
                if (error.code !== 'ENOENT') {
                    console.error(`Error cleaning up disk ${this.id}:`, error);
                }
            }
        });
    }
}
exports.Disk = Disk;
