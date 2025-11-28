/**
 * Unified development server
 * Serves the Vite React app on port 5173 and WebSocket signaling on the same server
 */

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const port = process.env.PORT || 4000
const rooms = new Map() // { roomId: Set(client) }

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// API routes can go here
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// WebSocket signaling server
wss.on('connection', (ws) => {
  ws.id = uuidv4()
  ws.room = null

  console.log(`[WS] Client ${ws.id} connected`)

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch (err) {
      console.error('[WS] Invalid JSON', err)
      return
    }

    const { type, payload } = msg

    if (type === 'join') {
      const { room } = payload
      ws.room = room
      if (!rooms.has(room)) rooms.set(room, new Set())
      rooms.get(room).add(ws)
      console.log(`[WS] Client ${ws.id} joined room ${room}`)

      // Notify others in room
      rooms.get(room).forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          // 1 = OPEN
          client.send(JSON.stringify({ type: 'peer-joined', payload: { id: ws.id } }))
        }
      })
      return
    }

    if (type === 'leave') {
      if (ws.room && rooms.has(ws.room)) {
        rooms.get(ws.room).delete(ws)
        console.log(`[WS] Client ${ws.id} left room ${ws.room}`)
      }
      ws.room = null
      return
    }

    // Relay messages to target peer
    if (payload && payload.to) {
      const recipientId = payload.to
      if (ws.room && rooms.has(ws.room)) {
        const roomClients = Array.from(rooms.get(ws.room))
        const recipient = roomClients.find((c) => c.id === recipientId)
        if (recipient && recipient.readyState === 1) {
          recipient.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
        }
      }
      return
    }

    // Broadcast to room
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
        }
      })
    }
  })

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws)
      console.log(`[WS] Client ${ws.id} disconnected from room ${ws.room}`)

      // Notify others that peer left
      rooms.get(ws.room).forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'peer-left', payload: { id: ws.id } }))
        }
      })
    }
  })

  ws.on('error', (err) => {
    console.error(`[WS] Client ${ws.id} error:`, err.message)
  })
})

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`📡 WebSocket signaling at ws://localhost:${port}/ws`)
})
