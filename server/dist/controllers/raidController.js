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
exports.readFromDisk = exports.replaceDisk = exports.simulateCrash = exports.writeToRaid = exports.getRaidStatus = exports.createRaidArray = void 0;
const raidService = __importStar(require("../services/raidService"));
const Raid_1 = require("../models/Raid");
const createRaidArray = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidLevel, numberOfDisks } = req.body;
        if (!raidLevel || !numberOfDisks) {
            return res.status(400).json({ message: 'raidLevel and numberOfDisks are required' });
        }
        if (!Object.values(Raid_1.RaidLevel).includes(raidLevel)) {
            return res.status(400).json({ message: 'Invalid RAID level' });
        }
        const raidId = yield raidService.createRaid(raidLevel, numberOfDisks);
        res.status(201).json({ raidId, message: `RAID ${raidLevel} array created successfully` });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating RAID array', error: error.message });
    }
});
exports.createRaidArray = createRaidArray;
const getRaidStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidId } = req.params;
        const status = yield raidService.getRaidStatus(raidId);
        res.status(200).json(status);
    }
    catch (error) {
        res.status(500).json({ message: 'Error getting RAID status', error: error.message });
    }
});
exports.getRaidStatus = getRaidStatus;
const writeToRaid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidId, data } = req.body;
        if (!raidId || !data) {
            return res.status(400).json({ message: 'raidId and data are required' });
        }
        yield raidService.writeToRaid(raidId, data);
        res.status(200).json({ message: 'Data written successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error writing to RAID array', error: error.message });
    }
});
exports.writeToRaid = writeToRaid;
const simulateCrash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidId, diskIndex } = req.body;
        if (raidId === undefined || diskIndex === undefined) {
            return res.status(400).json({ message: 'raidId and diskIndex are required' });
        }
        yield raidService.failDiskInRaid(raidId, diskIndex);
        const status = yield raidService.getRaidStatus(raidId);
        res.status(200).json({ message: `Disk ${diskIndex} in RAID ${raidId} has failed`, status });
    }
    catch (error) {
        res.status(500).json({ message: 'Error simulating crash', error: error.message });
    }
});
exports.simulateCrash = simulateCrash;
const replaceDisk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidId, diskIndex } = req.body;
        if (raidId === undefined || diskIndex === undefined) {
            return res.status(400).json({ message: 'raidId and diskIndex are required' });
        }
        yield raidService.replaceDiskInRaid(raidId, diskIndex);
        const status = yield raidService.getRaidStatus(raidId);
        res.status(200).json({ message: `Disk ${diskIndex} in RAID ${raidId} has been replaced`, status });
    }
    catch (error) {
        res.status(500).json({ message: 'Error replacing disk', error: error.message });
    }
});
exports.replaceDisk = replaceDisk;
const readFromDisk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { raidId, diskIndex } = req.params;
        const offsetRaw = req.query.offset;
        const lengthRaw = req.query.length;
        const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : undefined;
        const length = typeof lengthRaw === 'string' ? parseInt(lengthRaw, 10) : undefined;
        const data = yield raidService.readFromDisk(raidId, parseInt(diskIndex, 10), {
            offset: Number.isFinite(offset) ? offset : undefined,
            length: Number.isFinite(length) ? length : undefined,
        });
        res.status(200).json({ data });
    }
    catch (error) {
        res.status(500).json({ message: 'Error reading from disk', error: error.message });
    }
});
exports.readFromDisk = readFromDisk;
