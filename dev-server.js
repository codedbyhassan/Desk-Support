/**
 * Unified development server.
 * Serves the built Vite app and WebSocket signaling on one port.
 */

import express from 'express'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
const port = Number(process.env.PORT) || 4000
const rooms = new Map()

app.use(express.json())
app.use(express.static(distDir))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

wss.on('connection', (ws) => {
  ws.id = randomUUID()
  ws.room = null

  console.log(`[WS] Client ${ws.id} connected`)

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch (error) {
      console.error('[WS] Invalid JSON', error)
      return
    }

    const { type, payload } = msg

    if (type === 'join') {
      const room = payload?.room
      if (!room) return

      ws.room = room
      if (!rooms.has(room)) rooms.set(room, new Set())
      rooms.get(room).add(ws)

      for (const client of rooms.get(room)) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ type: 'peer-joined', payload: { id: ws.id } }))
        }
      }
      return
    }

    if (type === 'leave') {
      leaveRoom(ws)
      return
    }

    if (payload?.to && ws.room && rooms.has(ws.room)) {
      const recipient = [...rooms.get(ws.room)].find((client) => client.id === payload.to)
      if (recipient?.readyState === 1) {
        recipient.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
      }
      return
    }

    if (ws.room && rooms.has(ws.room)) {
      for (const client of rooms.get(ws.room)) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
        }
      }
    }
  })

  ws.on('close', () => leaveRoom(ws, true))
  ws.on('error', (error) => console.error(`[WS] Client ${ws.id} error:`, error.message))
})

function leaveRoom(ws, notify = false) {
  const room = ws.room
  if (!room || !rooms.has(room)) return

  const clients = rooms.get(room)
  clients.delete(ws)

  if (notify) {
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'peer-left', payload: { id: ws.id } }))
      }
    }
  }

  if (clients.size === 0) rooms.delete(room)
  ws.room = null
}

app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

server.listen(port, () => {
  console.log(`Desk Support server running on http://localhost:${port}`)
  console.log(`WebSocket signaling available at ws://localhost:${port}/ws`)
})
