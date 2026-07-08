# PeerShare — P2P File Sharing Network

PeerShare is a high-performance, secure peer-to-peer file-sharing platform that connects devices directly in the browser. Users queue files, generate a temporary room session with cryptographic credentials (accessed via URL, QR code, or local 4-digit pairing), and stream data directly to connected peers using WebRTC `RTCDataChannel`. A lightweight Node.js/Express WebSocket server coordinates the initial SDP handshake and ICE candidate traversal, after which all data transfers happen entirely serverless and direct.

This repository is a monorepo containing both the modular Express signaling backend and the React + Vite frontend.

---

## Table of contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Modules & Internals](#modules--internals)
- [Authentication & Security](#authentication--security)
- [Scripts Reference](#scripts-reference)
- [Coding Conventions](#coding-conventions)
- [Troubleshooting](#troubleshooting)

---

## Key Features

- **Direct P2P Data Streaming:** Zero-intermediary transfers using WebRTC `RTCDataChannel` for maximum privacy and native bandwidth speeds.
- **OPFS-Powered Multi-Threading:** Offloads receiver file assembly to dedicated Web Workers writing directly to the Origin Private File System (OPFS), enabling stable, low-overhead 1GB+ transfers without browser tab crashes.
- **Custom Backpressure Flow Control:** Implements a sliding-window chunk acknowledgment protocol to regulate queue buffering and prevent browser memory exhaustion.
- **HMAC SHA-256 Room Authentication:** The signaling server issues cryptographic session tokens (`senderToken` and `receiverToken`) to restrict connection establishment to authorized peers.
- **Local Nearby Sharing:** Easily discover and connect to devices on the same network using short, temporary 4-digit pairing codes.
- **Real-Time Analytics:** Interactive SVG charts and progressive metrics tracking throughput rates, transfer progress, and active transport paths (Direct P2P vs. TURN Relay).
- **Premium User Interface:** Responsive, custom-tailored dark/light mode glassmorphic UI built with React 19 and Tailwind CSS.

---

## Tech Stack

| Area | Technology |
| :--- | :--- |
| **Runtime** | Node.js 18 or 20 (LTS) |
| **Frontend Framework** | React 19 (Vite, Tailwind CSS, React Router 7) |
| **Backend Framework** | Express 5 + ws (WebSocket) |
| **Auth / Cryptography** | Web Crypto API / Node `crypto` (HMAC SHA-256 Tokens) |
| **Signaling Protocol** | WebSockets (via `ws` library) |
| **P2P Web Standard** | WebRTC (RTCDataChannel, RTCPeerConnection) |
| **Browser Storage** | OPFS (Origin Private File System) |

---

## Architecture

```
          HTTPS / WSS (Signaling Setup Only)
        ┌───────────────────────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────┐                     ┌──────────────┐
│  Peer A      │                     │  Peer B      │
│  (Sender)    │                     │  (Receiver)  │
└──────┬───────┘                     └──────┬───────┘
       │                                    │
       └────────────────────────────────────┘
             WebRTC DataChannel (Direct P2P)
```

1. **Signaling & Handshake:** Peers connect via WebSockets using secure HMAC tokens. They exchange SDP offers/answers and ICE candidates.
2. **Direct Connection:** Once connected, the WebSocket signaling connection is idle. All actual file chunks stream directly between peers.
3. **Multi-Threaded Offloading:**
   - **Sender:** A `transferWorker` handles slicing files and piping data into the WebRTC channel.
   - **Receiver:** A `writerWorker` writes incoming chunks directly to OPFS in a background thread to prevent UI thread locks.
4. **Flow Control:** Custom acknowledgment control packets prevent the sender from flooding the receiver's WebRTC buffer.

---

## Prerequisites

- **Node.js** v18.x or v20.x and **npm** installed.
- Modern web browser with WebRTC and OPFS support (Chrome, Firefox, Safari, Edge).
- Optional: TURN relay credentials if sharing across symmetric NAT/firewalled networks.

---

## Getting Started

### 1. Clone and Install
Clone the repository and install dependencies at the root level:
```bash
git clone <repo-url> p2p_file_share
cd p2p_file_share
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory (refer to the [Environment Variables](#environment-variables) section below).

### 3. Verify Signaling Server Health
Once the server is running, query the root health endpoint to see system metrics and active connections:
```bash
curl http://localhost:3001/
```

---

## Environment Variables

### Signaling Backend (`server/src/config/index.js`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | no | `development` | Environment mode (`development` \| `production`). |
| `PORT` | no | `3001` | Signaling backend server port. |
| `SESSION_SECRET` | yes | `dev-session-secret-change-me` | Secret key used to sign and check room HMAC tokens. |
| `SESSION_TTL_MS` | no | `900000` (15m) | Lifespan of a room session in milliseconds. |
| `ROOM_MAX_PEERS` | no | `2` | Maximum allowable peers per room. |
| `SIGNAL_RATE_LIMIT_PER_SEC` | no | `45` | Max socket signaling frames allowed per client per second. |
| `SESSION_CLEANUP_MS` | no | `20000` (20s) | Lifecycle cleanup interval for expired sessions. |
| `MAX_SIGNAL_PAYLOAD_BYTES` | no | `30720` (30KB) | Safety boundary for WebSocket frame size. |

### Client Frontend (`client/src/pages/SendFile.jsx` & `ReceiveFile.jsx`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SIGNALING_URL` | no | *Inferred from host* | WebSocket address for signaling. |
| `VITE_STUN_URL` | no | `stun:stun.l.google.com:19302` | Primary STUN server. |
| `VITE_TURN_URL` | no | *Built-in relay* | TURN relay fallback server URI. |
| `VITE_TURN_USERNAME` | no | *Built-in username* | Authentication username for TURN relay. |
| `VITE_TURN_CREDENTIAL` | no | *Built-in password* | Authentication password/secret for TURN. |

---

## Running the App

Run both frontend and backend concurrently in development mode from the root directory:
```bash
npm run dev
```

Alternatively, run them separately:
```bash
npm run dev:client   # Starts React development server (Vite)
npm run dev:server   # Starts Express backend (watch mode)
```

For production deployment:
```bash
npm run build        # Compiles client static assets to client/dist
npm run start        # Launches backend to serve client build and signaling
# Or combine them:
npm run prod
```

---

## Modules & Internals

### Backend Signaling
- **`roomManager`:** Tracks active rooms, peers inside rooms, and room lifetimes. Cleans up inactive rooms automatically.
- **`tokenService`:** Generates cryptographic HMAC token pairs (`senderToken`/`receiverToken`) using SHA-256 for signaling authentication.
- **`connectionHandler`:** Handles incoming WebSockets, enforces IP & message rate-limits, and relays WebRTC SDP/ICE signaling between peers.

### Frontend WebRTC & Processing
- **`connectionManager`:** Handles `RTCPeerConnection` instantiation, ICE candidate accumulation, and track/channel setup.
- **`dataChannelHandler`:** Subscribes to events on the WebRTC data channel, routes message traffic, and manages raw incoming chunks.
- **`fileSender`:** Slices files into chunks and sends them sequentially, checking the data channel's `bufferedAmount` to apply backpressure.
- **`fileWriter`:** Directs the receiver-side chunk persistence flow, interacting with background writing threads.
- **`writerWorker`:** A dedicated Web Worker utilizing the Origin Private File System (OPFS) to write binary file chunks directly to disk in a separate thread. This keeps the browser UI smooth and responsive even during 50+ MB/s transfers.
- **`hashWorker`:** An isolated Web Worker utilizing the Web Crypto API to calculate the SHA-256 checksum of the completed file to verify integrity.
- **`transferWorker`:** Coordinates background thread tasks for active transfers and handles high-volume channel streaming.
- **`resumeStore`:** Tracks partially downloaded chunks in IndexedDB to enable peer connection resumption without starting over.
- **`routeMonitor`:** Periodically inspects connection statistics to check if the connection is running Direct (Local/STUN) or relayed (TURN).

---

## Authentication & Security

1. **HMAC Protection:** Rooms cannot be joined simply by guessable IDs. Joining requires a custom signed HMAC token. When a user requests a room, the server signs the Room ID and Role with its `SESSION_SECRET` and generates separate sender and receiver tokens.
2. **Verification on Connect:** Sockets connecting to the signaling WebSocket must supply their room credentials. Sockets are validated against the signature on the server; mismatching sockets are closed immediately.
3. **Signal Rate Limiting:** Each socket is limited to **45 signaling messages per second**. Exceeding this rate-limit triggers immediate server disconnection.
4. **Data Isolation:** All file transfer data bypasses the signaling server entirely. Once signaling completes, data is fully end-to-end peer-encrypted and transferred directly between user browsers.

---

## Scripts Reference

| Script | Cwd | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | Root | Runs backend server and client Vite server simultaneously. |
| `npm run dev:client` | Root | Boots client Vite dev server. |
| `npm run dev:server` | Root | Boots Express signaling server in watch mode. |
| `npm run build` | Root | Bundles React client for production inside `client/dist`. |
| `npm run start` | Root | Starts the Node.js production server. |
| `npm run prod` | Root | Sequential wrapper to build and start production server. |
| `npm run lint` | Root | Runs ESLint syntax and style analysis on the client project. |

---

## Coding Conventions

- **Modular Components:** Single-responsibility file layouts for WebRTC handlers and UI components.
- **Offloaded CPU Work:** Keep intensive tasks (hashing, writing, parsing chunks) off the main thread using dedicated Web Workers.
- **Strict Signaling Schema:** Validate all websocket message payloads strictly to prevent exploits or excess memory consumption.
- **Defensive Error Handling:** Handle connection drops gracefully on the client by keeping transfer metadata for potential resumption.

---

## Troubleshooting

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| WebSocket connection fails | Incorrect target port or host configuration | Verify `VITE_SIGNALING_URL` matches your local server port (usually `ws://localhost:3001`). |
| Disconnects after initial connect | Exceeded signaling limits | Ensure client is not looping SDP offers/answers. Connections are capped at 45 messages/sec. |
| Stuck at "Waiting for peer..." | Missing peer or token mismatch | Check if the link contains the correct `token` query parameters. Re-generate session if tokens expired (default 15m). |
| Direct P2P connection fails | Symmetric NATs or strict firewalls | Double-check that TURN details are configured under Advanced Settings to allow relay traversal. |
