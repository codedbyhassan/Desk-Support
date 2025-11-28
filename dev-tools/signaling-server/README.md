# Signaling Server (development)

This lightweight WebSocket server is for local development and testing of the in-app WebRTC flow.

Usage:

1. Install dependencies

```bash
cd dev-tools/signaling-server
npm install
```

2. Start server

```bash
npm start
```

3. Configure front-end `.env`:

```
VITE_SIGNALING_URL=ws://localhost:4000
```

Notes:
- This server is intentionally simple and stores room participants in memory. For production, replace with a persistent or horizontally-scalable signaling server.
- For many participants, use a proper SFU (LiveKit, mediasoup, Janus) and issue per-room tokens.
