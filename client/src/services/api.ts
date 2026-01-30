import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/raid';

interface RaidConfig {
    raidLevel: string;
    numberOfDisks: number;
}

export const createRaidArray = async (raidConfig: RaidConfig) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/create`, raidConfig);
        return response.data;
    } catch (error) {
        throw new Error(`Error creating RAID array: ${(error as Error).message}`);
    }
};

export const writeToRaid = async (raidId: string, data: string) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/write`, { raidId, data });
        return response.data;
    } catch (error) {
        throw new Error(`Error writing to RAID array: ${(error as Error).message}`);
    }
};

export const simulateCrash = async (raidId: string, diskIndex: number) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/simulate-crash`, { raidId, diskIndex });
        return response.data;
    } catch (error) {
        throw new Error(`Error simulating crash: ${(error as Error).message}`);
    }
};

export const replaceDisk = async (raidId: string, diskIndex: number) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/replace-disk`, { raidId, diskIndex });
        return response.data;
    } catch (error) {
        throw new Error(`Error replacing disk: ${(error as Error).message}`);
    }
};

export const getRaidStatus = async (raidId: string) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/status/${raidId}`);
        return response.data;
    } catch (error) {
        throw new Error(`Error retrieving RAID status: ${(error as Error).message}`);
    }
};

export const readFromDisk = async (raidId: string, diskIndex: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/read-disk/${raidId}/${diskIndex}`);
        return response.data;
    } catch (error) {
        throw new Error(`Error reading from disk: ${(error as Error).message}`);
    }
};
