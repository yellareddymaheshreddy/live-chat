// This file should be run with Bun: `bun run server/broadcast.ts`
/// <reference types="bun-types" />

// import { Bun } from "bun"
import type { ServerWebSocket } from "bun"

type WSData = {
  id: string
  room?: string
}

type User = {
  id: string
  username: string
  ws: ServerWebSocket<WSData>
  room?: string
}

type LiveTyping = {
  userId: string
  username: string
  content: string
  timestamp: number
}

const users = new Map<string, User>()
const rooms = new Map<string, Set<string>>()
const liveTyping = new Map<string, Map<string, LiveTyping>>()

function broadcast(room: string, msg: any, excludeId?: string) {
  const roomUsers = rooms.get(room)
  if (!roomUsers) return

  for (const uid of roomUsers) {
    if (uid === excludeId) continue
    const user = users.get(uid)
    if (user?.ws.readyState === 1) {
      user.ws.send(JSON.stringify(msg))
    }
  }
}

function getRoomStats(room: string) {
  const roomUsers = rooms.get(room)
  return {
    onlineCount: roomUsers?.size || 0,
    users: roomUsers
      ? Array.from(roomUsers)
          .map((id) => users.get(id)?.username)
          .filter(Boolean)
      : [],
  }
}

const server = Bun.serve({
  port: 3001,

  fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return
      return new Response("WebSocket upgrade failed", { status: 400 })
    }

    if (url.pathname === "/api/rooms") {
      const data = Array.from(rooms.entries()).map(([name, members]) => ({
        name,
        count: members.size,
        members: Array.from(members).map((id) => users.get(id)?.username),
      }))
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response("Not Found", { status: 404 })
  },

  websocket: {
    open(ws: ServerWebSocket<WSData>) {
      const id = crypto.randomUUID()
      const username = `user-${id.slice(0, 4)}`
      ws.data = { id }
      users.set(id, { id, username, ws })
      console.log("✅ User connected:", id, username)
    },

    message(ws: ServerWebSocket<WSData>, raw) {
      const id = ws.data.id
      const user = users.get(id)
      if (!user) return

      let data: any
      try {
        data = JSON.parse(raw.toString())
      } catch {
        return
      }

      if (data.type === "join") {
        const room = data.room || "lobby"
        user.room = room
        if (!rooms.has(room)) rooms.set(room, new Set())
        rooms.get(room)!.add(id)

        if (!liveTyping.has(room)) {
          liveTyping.set(room, new Map())
        }

        const stats = getRoomStats(room)
        broadcast(room, {
          type: "joined",
          from: "system",
          content: `${user.username} joined. (${stats.onlineCount} online)`,
          room,
          onlineCount: stats.onlineCount,
          onlineUsers: stats.users,
        })
      }

      if (data.type === "live_typing") {
        if (!user.room) return

        const roomTyping = liveTyping.get(user.room)
        if (roomTyping) {
          if (data.content.trim() === "") {
            // Clear typing when empty
            roomTyping.delete(id)
          } else {
            // Update live typing
            roomTyping.set(id, {
              userId: id,
              username: user.username,
              content: data.content,
              timestamp: Date.now(),
            })
          }

          // Broadcast current live typing state
          broadcast(
            user.room,
            {
              type: "live_typing_update",
              liveTyping: Array.from(roomTyping.values()),
              room: user.room,
            },
            id,
          )
        }
      }

      if (data.type === "typing") {
        if (!user.room) return
        broadcast(user.room, { type: "typing", from: user.username, content: data.content, room: user.room }, id)
      }

      if (data.type === "message") {
        if (!user.room) return

        const roomTyping = liveTyping.get(user.room)
        if (roomTyping) {
          roomTyping.delete(id)
          broadcast(user.room, {
            type: "live_typing_update",
            liveTyping: Array.from(roomTyping.values()),
            room: user.room,
          })
        }

        broadcast(user.room, { type: "message", from: user.username, content: data.content, room: user.room }, id)
      }
    },

    close(ws: ServerWebSocket<WSData>) {
      const id = ws.data.id
      const user = users.get(id)
      if (user) {
        if (user.room && rooms.has(user.room)) {
          rooms.get(user.room)!.delete(id)

          const roomTyping = liveTyping.get(user.room)
          if (roomTyping) {
            roomTyping.delete(id)
            broadcast(user.room, {
              type: "live_typing_update",
              liveTyping: Array.from(roomTyping.values()),
              room: user.room,
            })
          }

          const stats = getRoomStats(user.room)
          broadcast(user.room, {
            type: "disconnected",
            from: "system",
            content: `${user.username} left. (${stats.onlineCount} online)`,
            room: user.room,
            onlineCount: stats.onlineCount,
            onlineUsers: stats.users,
          })
        }
        users.delete(id)
        console.log("❌ User disconnected:", id)
      }
    },
  },
})

console.log(`🚀 Server running at ws://localhost:${server.port}/ws`)
