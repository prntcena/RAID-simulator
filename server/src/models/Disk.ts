import * as fs from 'fs/promises';
import * as path from 'path';

export enum DiskStatus {
    HEALTHY = 'HEALTHY',
    FAILED = 'FAILED',
}

const STORAGE_PATH = path.join(__dirname, '..', '..', 'storage');

export class Disk {
    public readonly id: string;
    public readonly size: number; // in bytes
    private status: DiskStatus;
    private readonly filePath: string;

    constructor(id: string, size: number) {
        this.id = id;
        this.size = size;
        this.status = DiskStatus.HEALTHY;
        this.filePath = path.join(STORAGE_PATH, `${this.id}.disk`);
    }

    /**
     * Initializes the disk by creating the storage directory and the disk file.
     */
    public async initialize(): Promise<void> {
        try {
            await fs.mkdir(STORAGE_PATH, { recursive: true });
            // Create an empty file representing the disk
            await fs.writeFile(this.filePath, Buffer.alloc(this.size));
            console.log(`Disk ${this.id} initialized with size ${this.size} bytes.`);
        } catch (error) {
            console.error(`Error initializing disk ${this.id}:`, error);
            throw new Error(`Failed to initialize disk ${this.id}.`);
        }
    }

    /**
     * Writes data to the disk at a specific offset.
     * @param offset The position to start writing to.
     * @param data The data to write.
     */
    public async write(offset: number, data: Buffer): Promise<void> {
        if (this.status === DiskStatus.FAILED) {
            throw new Error(`Disk ${this.id} has failed. Cannot write.`);
        }
        if (offset + data.length > this.size) {
            throw new Error('Write operation exceeds disk size.');
        }

        try {
            const fileHandle = await fs.open(this.filePath, 'r+');
            await fileHandle.write(data, 0, data.length, offset);
            await fileHandle.close();
        } catch (error) {
            console.error(`Error writing to disk ${this.id}:`, error);
            this.fail();
            throw new Error(`Error writing to disk ${this.id}.`);
        }
    }

    /**
     * Reads data from the disk.
     * @param offset The position to start reading from.
     * @param length The number of bytes to read.
     */
    public async read(offset: number, length: number): Promise<Buffer> {
        if (this.status === DiskStatus.FAILED) {
            throw new Error(`Disk ${this.id} has failed. Cannot read.`);
        }
        if (offset + length > this.size) {
            throw new Error('Read operation exceeds disk size.');
        }

        try {
            const fileHandle = await fs.open(this.filePath, 'r');
            const buffer = Buffer.alloc(length);
            await fileHandle.read(buffer, 0, length, offset);
            await fileHandle.close();
            return buffer;
        } catch (error) {
            console.error(`Error reading from disk ${this.id}:`, error);
            this.fail();
            throw new Error(`Error reading from disk ${this.id}.`);
        }
    }

    /**
     * Marks the disk as failed.
     */
    public fail(): void {
        this.status = DiskStatus.FAILED;
        console.log(`Disk ${this.id} has failed.`);
    }

    /**
     * Replaces the disk, effectively healing it and restoring its file.
     */
    public async replace(): Promise<void> {
        this.status = DiskStatus.HEALTHY;
        // Re-create the empty file
        await this.initialize();
        console.log(`Disk ${this.id} has been replaced and is now healthy.`);
    }

    /**
     * Gets the current status of the disk.
     */
    public getStatus(): { id: string; status: DiskStatus; size: number } {
        return {
            id: this.id,
            status: this.status,
            size: this.size,
        };
    }

    /**
     * Cleans up the disk file.
     */
    public async cleanup(): Promise<void> {
        try {
            await fs.unlink(this.filePath);
        } catch (error: any) {
            // Ignore errors if the file doesn't exist
            if (error.code !== 'ENOENT') {
                console.error(`Error cleaning up disk ${this.id}:`, error);
            }
        }
    }
}