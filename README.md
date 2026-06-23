# PeerShare — P2P File Sharing Network

Backend and frontend for PeerShare, a secure peer-to-peer file-sharing platform that connects devices directly in the browser. Users queue files, generate a temporary room session and token (link or QR code), and stream data directly to connected peers using WebRTC DataChannels. The lightweight WebSocket server coordinates the initial SDP handshake and ICE candidate traversal.

This repository is a modular monorepo containing both the Nest-like modular Express signaling backend and the React + Vite frontend.

New here? This README gets you from a fresh clone to a running, tested application.

## Table of contents
- Tech stack
- Architecture
- Prerequisites
- Getting started
- Environment variables
- Running the app
- Project structure
- Modules
- Authentication & authorization
- Testing
- Scripts reference
- Coding conventions
- Troubleshooting

## Tech stack
| Area | Technology |
| :--- | :--- |
| Runtime | Node.js 20 (LTS) |
| Frontend Framework | React 19 (Vite, Tailwind CSS) |
| Backend Framework | Express + ws (WebSocket) |
| Auth / Security | HMAC SHA-256 Tokens |
| Signaling Protocol | WebSockets (via `ws` library) |
| P2P Web Standard | WebRTC (RTCDataChannel, RTCPeerConnection) |

## Architecture
```
          HTTPS / WSS (Signaling)
       ┌─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  Peer A      │          │  Peer B      │
│  (Sender)    │          │  (Receiver)  │
└──────┬───────┘          └──────┬───────┘
       │                         │
       └─────────────────────────┘
          WebRTC DataChannel (P2P)
```

Modular monolith design. 
- The backend is separated into clean services and controllers inside `server/src/`.
- The frontend is built as a Single Page Application (SPA) with a modular WebRTC service inside `client/src/services/webrtc/`.
- All peer signaling traffic flows through WebSockets temporarily. Once SDP offers and answers are matched, traffic routes directly P2P.
- WebRTC stats determine connection status (Direct vs TURN Relay).
- Flow-control (backpressure) prevents browser memory exhaustion by waiting for acknowledgments.

## Prerequisites
- Node.js 18.x or 20.x and npm.
- Web browser with modern WebRTC support (Chrome, Firefox, Safari, Edge).
- Optional: TURN relay credentials if sharing across symmetric NAT networks.

## Getting started
### 1. Clone and install
```bash
git clone <repo-url> p2p_file_share
cd p2p_file_share
npm install
```

### 2. Create your env files
Create a `.env` file in the root or set environment variables directly.

### 3. Verify health
```bash
curl http://localhost:3001/health
```

## Environment variables
Configuration is read from standard environment variables (or `.env` files).

### Core & Signaling
| Variable | Required | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | yes | `development` \| `production`. Controls static asset serving and logs. |
| `PORT` | no | HTTP and WebSocket port (default `3001`). |
| `SESSION_SECRET` | yes | Secret key used to sign and check HMAC tokens. |
| `SESSION_TTL_MS` | no | Lifespan of a session in milliseconds (default `900000` / 15m). |
| `ROOM_MAX_PEERS` | no | Maximum peers per room (default `2`). |
| `SIGNAL_RATE_LIMIT_PER_SEC` | no | Maximum signaling packets a client can send per second (default `45`). |

### Frontend Variables
| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_SIGNALING_URL` | no | WebSocket endpoint client uses to connect (default inferred from host). |
| `VITE_STUN_URL` | no | STUN server for NAT traversal (default Google public STUN). |
| `VITE_TURN_URL` | no | TURN server address. |
| `VITE_TURN_USERNAME` | no | TURN auth username. |
| `VITE_TURN_CREDENTIAL` | no | TURN auth password/credential. |

## Running the app
```bash
npm run dev      # run backend and frontend simultaneously with watch mode
npm run start    # start production server
npm run build    # compile production assets for deployment
```
Base URL: `http://localhost:5173` (Frontend) / `http://localhost:3001` (Backend)

## Project structure
```
p2p_file_share/
├── package.json
├── client/                  # Frontend React SPA
│   ├── src/
│   │   ├── main.jsx         # SPA entry point
│   │   ├── App.jsx          # Route manager & global layout
│   │   ├── components/      # Navbar, BrandMark, DropZone, ProgressBar
│   │   ├── pages/           # Home, SendFile, ReceiveFile, HowItWorks
│   │   └── services/webrtc/ # Modular WebRTC service controllers
├── server/                  # Backend signaling & static host
│   ├── index.js             # Server bootloader
│   ├── src/
│   │   ├── app.js           # Express app instance
│   │   ├── routes.js        # REST endpoints
│   │   ├── config/          # Configurations & constraints
│   │   ├── controllers/     # Route logic callback
│   │   ├── services/        # HMAC Token and Room registry
│   │   └── websocket/       # WS signaling server & rate-limiter
```

## Modules
### Backend Modules
| Module | Responsibility |
| :--- | :--- |
| `config` | Manages environment defaults, rate-limits, and session durations. |
| `tokenService` | Handles SHA-256 HMAC cryptographic token generation and verification. |
| `roomManager` | Manages room life cycles, cleanups, and active connection limits. |
| `sessionController` | Responds to session creation requests and issues security tokens. |
| `connectionHandler` | Enforces rate-limiting and relays SDP/ICE signals between peers. |

### Frontend Modules
| Module | Responsibility |
| :--- | :--- |
| `connectionManager` | Manages RTCPeerConnection creation and ICE gathering. |
| `dataChannelHandler` | Listens to data channel events, file chunks, and control packets. |
| `fileSender` | Slices files into binary chunks and sends them with flow-control backpressure. |
| `routeMonitor` | Inspects connection candidate pairs to log connection types (Direct vs Relay). |

## Authentication & authorization
- **Tokens**: Custom SHA-256 HMAC signed tokens. The server generates a unique token pair (`senderToken` and `receiverToken`) for every room.
- **Verification**: The WebSocket connection handler extracts the room ID and token from the query parameters, verifies them against the secret, and closes unauthorized sockets immediately.
- **Rate-Limiting**: A sliding-window rate-limiter counts signaling packets. Clients sending more than 45 messages per second are disconnected automatically to protect infrastructure resources.

## Testing
The application uses Jest for unit tests on the frontend.
```bash
npm run test     # Run all unit tests
```
## Scripts reference
| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Runs backend signaling and Vite dev server simultaneously. |
| `npm run build` | Builds client static distribution assets. |
| `npm run start` | Boots node backend to server signaling and serve client build. |
| `npm run lint` | Runs ESLint syntax and format checks. |

## Coding conventions
- Monolith module pattern on the server; file-per-module on the client.
- Strict validation of signaling message payloads (e.g. rejecting overly large candidate payloads).
- Keep tests DB-free and server-free using mocks.

## Troubleshooting
| Symptom | Fix |
| :--- | :--- |
| WebSocket connection fails | Ensure `VITE_SIGNALING_URL` matches backend port (`ws://localhost:3001` or correct hostname). |
| Rate-limited / Sockets closing | You are sending too many signal requests. Sockets are capped at 45 messages/sec. |
| Direct P2P connection fails | Symmetric NATs may block direct routing. Configure TURN relay server details under Advanced Settings. |
