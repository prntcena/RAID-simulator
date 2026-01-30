# RAID Simulator

This project is a RAID simulator that demonstrates various RAID configurations including RAID 0, RAID 1, RAID 5, and RAID 10. It features a server-client architecture that allows users to interact with the RAID systems, simulate crashes, and manage backups.

## Project Structure

```
raid-simulator
├── client
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   ├── RaidController.tsx
│   │   │   └── RaidVisualizer.tsx
│   │   ├── services
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── server
│   ├── src
│   │   ├── controllers
│   │   │   └── raidController.ts
│   │   ├── models
│   │   │   ├── Disk.ts
│   │   │   └── Raid.ts
│   │   ├── routes
│   │   │   └── raidRoutes.ts
│   │   ├── services
│   │   │   └── raidService.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Features

- **RAID Configurations**: Supports RAID 0, RAID 1, RAID 5, and RAID 10.
- **Crash Simulation**: Users can simulate disk failures and observe how the RAID system responds.
- **Disk Replacement/Rebuild**: Replace failed disks and observe rebuild behavior (RAID 1/5/10).
- **Disk Data Viewer**: Read a slice of a specific disk for learning/debugging.

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd raid-simulator
   ```

2. Install server dependencies:
   ```
   cd server
   npm install
   ```

3. Install client dependencies:
   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm start
   ```

2. Start the client:
   ```
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000` to access the simulator.

## Usage

1. Create an array
   - Choose a RAID level and disk count, then click **Create RAID**.
   - Rules enforced by the simulator:
     - RAID 0: minimum 1 disk
     - RAID 1: minimum 2 disks
     - RAID 5: minimum 3 disks
     - RAID 10: minimum 4 disks and an even number of disks

2. Write data
   - Paste a string into the **Write Data** input and click **Write**.

3. Simulate failures and recovery
   - Use **Simulate Crash** to fail a disk by index.
   - Use **Replace Disk** to replace a failed disk.
   - Expected behavior:
     - RAID 0: any single disk failure = data loss
     - RAID 1: can tolerate disk failures as long as one disk remains healthy
     - RAID 5: can tolerate exactly one disk failure; two failures = data loss
     - RAID 10: can tolerate one disk failure per mirrored pair; losing both disks in a pair = data loss

4. Read a specific disk
   - Click **Read Data** on a disk card.
   - This reads a slice of the disk and is meant for learning/debugging.

## Testing Data (Copy/Paste)

The simulator uses a **16KB chunk size** for striping/parity in RAID 0/5/10.
This matters a lot for what you see when reading individual disks.

### Quick copy/paste strings

- **Tiny (fits in one chunk):**
  ```
  The quick brown fox jumps over the lazy dog.
  ```

- **Multi-chunk (good general test):**
  ```
  ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=
  ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=
  ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=
  ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=
  ```

### Exact-size payloads (best for edge cases)

If you want truly deterministic RAID10/RAID5 distribution tests, generate exact byte sizes and send them via the API.

PowerShell examples (Windows):

1) Create a RAID 10 with 8 disks:
```powershell
$base = 'http://localhost:5000/api/raid'
$create = Invoke-RestMethod -Method Post -Uri "$base/raid/create" -ContentType 'application/json' -Body (@{ raidLevel='RAID10'; numberOfDisks=8 } | ConvertTo-Json)
$raidId = $create.raidId
$raidId
```

2) Write exactly 64KB (this should touch all 4 mirrored pairs at least once):
```powershell
$data = 'A' * (64 * 1024)
Invoke-RestMethod -Method Post -Uri "$base/raid/write" -ContentType 'application/json' -Body (@{ raidId=$raidId; data=$data } | ConvertTo-Json)
```

3) Read 64KB starting at offset 0 from disk 0..7 (useful to see striping offsets):
```powershell
0..7 | ForEach-Object {
  $i = $_
  $r = Invoke-RestMethod -Method Get -Uri "$base/raid/read-disk/$raidId/$i?offset=0&length=65536"
  "disk $i => length=$($r.data.Length)"
}
```

Notes:
- If a disk looks “empty”, try reading a later offset like `offset=16384` (16KB) or `offset=32768` (32KB).
- The disk-read endpoint strips `\x00` bytes for display, so binary-looking regions may appear shorter.

## API Notes

Base URL: `http://localhost:5000/api/raid`

- `POST /create` body: `{ raidLevel, numberOfDisks }`
- `POST /write` body: `{ raidId, data }`
- `POST /simulate-crash` body: `{ raidId, diskIndex }`
- `POST /replace-disk` body: `{ raidId, diskIndex }`
- `GET /read-disk/:raidId/:diskIndex?offset=...&length=...`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.