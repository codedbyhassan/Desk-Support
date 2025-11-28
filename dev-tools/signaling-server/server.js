const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')

// Simple in-memory room registry: { roomId: Set(client) }
const rooms = new Map()

const port = process.env.PORT || 4001
const wss = new WebSocket.Server({ port })

console.log(`Signaling server running on ws://localhost:${port}`)

wss.on('connection', (ws) => {
  ws.id = uuidv4()
  ws.room = null

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch (err) {
      console.error('Invalid JSON', err)
      return
    }

    const { type, payload } = msg

    if (type === 'join') {
      const { room } = payload
      ws.room = room
      if (!rooms.has(room)) rooms.set(room, new Set())
      rooms.get(room).add(ws)
      console.log(`Client ${ws.id} joined ${room}`)
      // Notify others
      rooms.get(room).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'peer-joined', payload: { id: ws.id } }))
        }
      })
      return
    }

    if (type === 'leave') {
      if (ws.room && rooms.has(ws.room)) {
        rooms.get(ws.room).delete(ws)
      }
      ws.room = null
      return
    }

    // Relay messages to target peer(s)
    if (payload && payload.to) {
      const recipientId = payload.to
      // find recipient in the same room
      if (ws.room && rooms.has(ws.room)) {
        const roomClients = Array.from(rooms.get(ws.room))
        const recipient = roomClients.find(c => c.id === recipientId)
        if (recipient && recipient.readyState === WebSocket.OPEN) {
          recipient.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
        }
      }
      return
    }

    // Broadcast to room
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ ...msg, payload: { ...payload, from: ws.id } }))
        }
      })
    }
  })

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws)
      rooms.get(ws.room).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'peer-left', payload: { id: ws.id } }))
        }
      })
    }
  })
})
