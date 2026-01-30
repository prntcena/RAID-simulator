import { Router } from 'express';
import {
    createRaidArray,
    getRaidStatus,
    writeToRaid,
    simulateCrash,
    replaceDisk,
    readFromDisk,
} from '../controllers/raidController';

const router = Router();

router.post('/create', createRaidArray);
router.get('/status/:raidId', getRaidStatus);
router.post('/write', writeToRaid);
router.post('/simulate-crash', simulateCrash);
router.post('/replace-disk', replaceDisk);
router.get('/read-disk/:raidId/:diskIndex', readFromDisk);

export default router;