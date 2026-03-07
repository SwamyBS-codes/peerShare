# P2P File Sharing Network (React + Vite + Node + WebRTC)

This project includes:

- `client/`: React + Vite frontend
- `server/`: Node.js signaling server (WebSocket + Express)

## How it works

- Sender picks a file and creates a temporary session.
- App generates a unique share link and QR code with a receiver token.
- Receiver opens the link (or scans QR) and joins in browser.
- Signaling messages (SDP + ICE) are relayed via Node server only.
- File data is transferred directly peer-to-peer over WebRTC DataChannel.
- Sender must keep the sharing page open during transfer.

## Run

Open two terminals in the project root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Then open two browser tabs at:

- `http://localhost:5173`

Sender flow:

- Choose **Sender**, click **Create Session**.
- Share generated link or QR with receiver.
- Keep sender page open and click **Send File** after receiver connects.

Receiver flow:

- Open shared link (auto-joins as receiver) or scan QR.
- Wait for sender to transfer file, then download.

## Notes

- Default signaling URL is `ws://localhost:3001`.
- This starter uses a public STUN server (`stun:stun.l.google.com:19302`).
- If transfer fails across strict NAT/firewalls, configure TURN in the UI before joining a room.
- Server does not store files; it only relays signaling events.
- Sessions are temporary, token-protected, rate-limited, and limited to 2 peers (sender + receiver).

## TURN setup

Before clicking **Join Room**, fill these fields in both peers:

- `TURN URL`: Example `turn:your-turn-host:3478` (or `turns:...` for TLS)
- `TURN Username`: Provided by your TURN service
- `TURN Credential`: Provided by your TURN service

The app uses STUN by default and adds TURN automatically when all TURN fields are filled.

## Environment defaults (optional)

You can auto-fill signaling and ICE fields from Vite env variables:

1. Copy [client/.env.example](client/.env.example) to `client/.env`
2. Set values for your environment
3. Restart the client dev server

Supported variables:

- `VITE_SIGNALING_URL`
- `VITE_DEFAULT_ROOM_ID`
- `VITE_STUN_URL`
- `VITE_TURN_URL`
- `VITE_TURN_USERNAME`
- `VITE_TURN_CREDENTIAL`

## Server hardening settings

You can configure these on the signaling server environment:

- `SESSION_SECRET`: secret for signed sender/receiver session tokens.
- `SESSION_TTL_MS`: session expiration window (default 15 minutes).
- `ROOM_MAX_PEERS`: max peers per room (default 2).
- `SIGNAL_RATE_LIMIT_PER_SEC`: max signaling messages per peer per second.
- `MAX_SIGNAL_PAYLOAD_BYTES`: max signaling message payload bytes.
- `SESSION_CLEANUP_MS`: how often expired sessions are cleaned up.

When a session expires or room policy is violated, clients receive a signaling error and can create or join a new session.

Nearby 4-digit mode allows receiver join without token for local quick-share UX. Standard link mode uses signed sender/receiver tokens.

## Deploy

This repo now supports single-service deployment: Node server hosts API + WebSocket and serves the built React frontend from `client/dist`.

### Option A: Render (recommended)

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and select this repo.
3. Render will detect `render.yaml` and create one web service.
4. After deploy, open your Render URL and test send/receive in two tabs.

Notes:

- `SESSION_SECRET` is auto-generated via `render.yaml`.
- WebSocket URL auto-detects your deployed origin (uses `wss://` on HTTPS).

### Option B: Any Node host (Railway, Fly.io, VPS)

Run these commands during deploy:

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run build
npm run start
```

Required env variables:

- `PORT` (provided by most platforms)
- `SESSION_SECRET` (set a strong random value)

Optional env variables:

- `SESSION_TTL_MS`
- `ROOM_MAX_PEERS`
- `SIGNAL_RATE_LIMIT_PER_SEC`
- `MAX_SIGNAL_PAYLOAD_BYTES`
