# RAID Simulator Architecture

This document outlines the architecture of the RAID Simulator project, which is built using a modern client-server model with TypeScript.

## 1. Overview

The application is composed of two main parts:

-   **Server (Backend):** A Node.js/Express application responsible for all the core RAID logic, data storage, and state management.
-   **Client (Frontend):** A React single-page application (SPA) that provides a user interface to interact with and visualize the RAID simulation.

The two parts are decoupled and communicate via a RESTful API.

## Architecture Diagram

```mermaid
flowchart LR
    subgraph Browser[Client (React + TypeScript)]
        UI[RaidController / RaidVisualizer]
        APIClient[services/api.ts (axios)]
        UI --> APIClient
    end

    subgraph Node[Server (Node.js + Express + TypeScript)]
        Routes[routes/raidRoutes.ts]
        Controller[controllers/raidController.ts]
        Service[services/raidService.ts]

        subgraph Models[models/]
            RaidBase[Raid.ts (abstract)]
            R0[Raid0.ts]
            R1[Raid1.ts]
            R5[Raid5.ts]
            R10[Raid10.ts]
            Disk[Disk.ts]
        end

        Routes --> Controller --> Service
        Service --> RaidBase
        RaidBase --> R0
        RaidBase --> R1
        RaidBase --> R5
        RaidBase --> R10
        R0 --> Disk
        R1 --> Disk
        R5 --> Disk
        R10 --> Disk
    end

    subgraph FS[Filesystem]
        Storage[server/storage/*.disk]
    end

    APIClient -- HTTP --> Routes
    Disk -- read/write --> Storage

    %% Common endpoints
    Routes -.-> E1[POST /api/raid/create]
    Routes -.-> E2[POST /api/raid/write]
    Routes -.-> E3[POST /api/raid/simulate-crash]
    Routes -.-> E4[POST /api/raid/replace-disk]
    Routes -.-> E5[GET /api/raid/status/:raidId]
    Routes -.-> E6[GET /api/raid/read-disk/:raidId/:diskIndex?offset&length]
```

## 2. Server Architecture

The server is the brain of the simulation. It handles the low-level details of how RAID arrays are created, written to, and how they respond to failures.

### Components

-   **`server.ts`**: The main entry point for the Express server. It initializes middleware and wires up the API routes.
-   **`models/`**: Contains the core data structures.
-   **`models/`**: Contains the core data structures.
    -   **`Disk.ts`**: A class representing a single physical disk. It will manage a corresponding file on the filesystem (e.g., `disk-1.bin`) and track its status (e.g., `HEALTHY`, `FAILED`).
    -   **`Raid.ts`**: An abstract base class that defines the common interface for all RAID levels (`read`, `write`, `getStatus`). Concrete classes like `Raid0`, `Raid1`, `Raid5`, and `Raid10` will implement this interface.
-   **`services/raidService.ts`**: This is the core logic layer. It manages all active RAID arrays and contains the implementation for:
    -   Creating new RAID arrays.
    -   Calculating data distribution (striping, mirroring, parity).
    -   Simulating disk failures and data recovery.
-   **`controllers/raidController.ts`**: This is the API layer. It translates incoming HTTP requests from the client into calls to the `raidService`. It handles request validation and formats the responses.
-   **`routes/raidRoutes.ts`**: Defines the API endpoints (e.g., `POST /api/raid/create`) and maps them to the appropriate controller functions.

## 3. Client Architecture

The client is a React application built with TypeScript that runs in the user's browser. Its only job is to provide a UI and communicate with the server.

### Components

-   **`App.tsx`**: The root component of the application, which will manage the main layout and state.
-   **`components/`**: Reusable React components.
    -   **`RaidController.tsx`**: Contains the UI elements (forms, buttons) for creating RAID arrays, writing data, and triggering failures.
    -   **`RaidVisualizer.tsx`**: A component dedicated to visually representing the state of the RAID array, including all disks and their status.
-   **`services/api.ts`**: A module that centralizes all communication with the server's API. It exports functions (e.g., `createRaidArray`, `simulateCrash`) that encapsulate the `axios` or `fetch` calls.

## 4. API Contract

The client and server communicate over the following REST API endpoints:

-   **`POST /api/raid/create`**:
    -   **Request Body**: `{ raidLevel: 'RAID0' | 'RAID1' | 'RAID5' | 'RAID10', numberOfDisks: number }`
    -   **Response**: `{ raidId: string, message: string }`
-   **`GET /api/raid/status/:raidId`**:
    -   **Response**: An object containing the detailed status of the RAID array, including disk health, data distribution, and capacity.
-   **`POST /api/raid/write`**:
    -   **Request Body**: `{ raidId: string, data: string }`
    -   **Response**: `{ message: string }`
-   **`POST /api/raid/simulate-crash`**:
    -   **Request Body**: `{ raidId: string, diskIndex: number }`
    -   **Response**: `{ message: string, status: object }`
-   **`POST /api/raid/replace-disk`**:
-   **`POST /api/raid/replace-disk`**:
    -   **Request Body**: `{ raidId: string, diskIndex: number }`
    -   **Response**: `{ message: string, status: object }`

-   **`GET /api/raid/read-disk/:raidId/:diskIndex`**:
        -   **Query Params (optional)**: `offset` (bytes), `length` (bytes)
        -   **Response**: `{ data: string }` (UTF-8 decoded, null bytes stripped for display)
        -   **Notes**:
                -   This is a debugging/teaching endpoint to view raw disk contents.
                -   Default read length is 64KB.

## 5. Simulation Notes (Important for Testing)

### Chunking / Stripe Size

The simulator uses a fixed chunk size of **16KB** for striping/parity operations in RAID 0/5/10.

This affects what you see when reading individual disks:

- **RAID 10 example (8 disks = 4 mirrored pairs):**
    - If you write **less than 16KB**, only the first mirrored pair (Disk 0 + Disk 1) will receive data.
    - To see data distributed across all pairs, write at least `pairs * chunkSize` (e.g., `4 * 16KB = 64KB`).

### Disk Files

Disks are simulated as files under `server/storage/` named like:

`<raidId>-disk<index>.disk`

This architecture provides a clear separation of concerns and mimics how modern, real-world web applications are built.
