# Video Call Setup (Development)

This project includes a lightweight WebSocket signaling server for development and a basic in-app WebRTC scaffold.

Steps to run locally:

1. Start the front-end (Vite):

```bash
# from repo root
npm install
npm run dev
```

2. Start the dev signaling server (in separate terminal):

```bash
cd dev-tools/signaling-server
npm install
npm start
# or from project root (convenience):
# npm run dev:signaling
```

3. Configure environment variables (copy `.env.example` to `.env` or set in your dev environment):

```
VITE_SIGNALING_URL=ws://localhost:4000
VITE_TURN_URL=turn:your-turn-server:3478
VITE_TURN_USER=turnuser
VITE_TURN_PASS=turnpassword
```

4. Open the app in two different browser windows/devices and navigate to a call URL:

```
# Example (HashRouter):
#/app/teams/call/room-123
```

Notes & next steps:

- The signaling server is an in-memory demo and not suitable for production.
- For reliable NAT traversal, set up a TURN server (coturn) and populate the TURN env vars.
- For multi-party calls with good performance, migrate to an SFU (LiveKit, mediasoup, Janus).

