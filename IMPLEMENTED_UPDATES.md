# PeerShare Implemented Updates

This file centralizes the major updates implemented in the project.

## Core Architecture

- Frontend: React + Vite + Tailwind CSS
- Signaling: Node.js + WebSocket server
- Transfer: WebRTC DataChannel (peer-to-peer, no file storage on server)

## Frontend Structure Added

- `client/src/components/Navbar.jsx`
- `client/src/components/BrandMark.jsx`
- `client/src/components/DropZone.jsx`
- `client/src/components/ProgressBar.jsx`
- `client/src/components/QRCodeGenerator.jsx`
- `client/src/components/ConnectionStatus.jsx`
- `client/src/pages/Home.jsx`
- `client/src/pages/SendFile.jsx`
- `client/src/pages/ReceiveFile.jsx`
- `client/src/pages/HowItWorks.jsx`
- `client/src/pages/About.jsx`
- `client/src/pages/NearbyShare.jsx`
- `client/src/services/socketService.js`
- `client/src/services/webrtcService.js`

## UI and Navigation

- Modern responsive UI with sticky navbar and dark mode.
- Branded visuals and micro-interactions.
- Route-based app shell in `client/src/App.jsx`.
- Nearby Share is available as a dedicated page route (`/nearby`) and quick links.

## File Transfer Features

- Drag-and-drop multi-file selection.
- Share link + QR generation for receiver onboarding.
- Sender/receiver status and progress indicators.
- Transfer speed display.
- Cancel transfer support.

## Chunking and Large Files

- Removed default 1GB hard cap in `DropZone`.
- Added user-configurable chunk size in Send page.
- Added chunk presets: `32KB`, `64KB`, `128KB`, `256KB`, `512KB`.
- Chunk size is applied in `webrtcService.sendFiles(...)`.

## Resume and Reliability

Implemented resumable transfer primitives:

- Stable file IDs and transfer IDs.
- Receiver sends `file-ack` with received byte offsets.
- Sender resumes from last acknowledged offset.
- Receiver reuses partial/completed file state to avoid full restart.
- Resume badge added in receiver UI: `Resumed <file> from X%`.

Primary files:

- `client/src/services/webrtcService.js`
- `client/src/pages/ReceiveFile.jsx`

## Nearby Share Mode

- Sender can create local 4-digit code sessions.
- Receiver can connect via 4-digit code confirm flow.
- Works alongside QR/link-based connect flow.

Primary files:

- `client/src/pages/SendFile.jsx`
- `client/src/pages/ReceiveFile.jsx`
- `client/src/pages/NearbyShare.jsx`

## Bug Fixes Applied

- Fixed `ReceiveFile` null metadata crash during `file-end` handling.
- Fixed `value.trim is not a function` by hardening session input parsing and click handler invocation.

## Validation

- Frontend builds cleanly via: `npm --prefix client run build`.
- Signaling health endpoint available at: `http://localhost:3001/health`.
