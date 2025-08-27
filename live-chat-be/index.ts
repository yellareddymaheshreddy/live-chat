import type { ServerWebSocket } from "bun";

type User = {
  id: string;
  username: string;
  ws: ServerWebSocket<WSData>;
  room?: string;
};

type WSData = {
  id: string;
  room?: string;
};

const users = new Map<string, User>(); // id → user
const rooms = new Map<string, Set<string>>(); // roomName → set of user ids

function broadcast(room: string, msg: any, excludeId?: string) {
  const roomUsers = rooms.get(room);
  if (!roomUsers) return;

  for (const uid of roomUsers) {
    if (uid === excludeId) continue;
    const user = users.get(uid);
    if (user?.ws.readyState === 1) {
      user.ws.send(JSON.stringify(msg));
    }
  }
}

const server = Bun.serve({
  port: 3001,

  // HTTP APIs
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) {
        return; // handled by websocket handler
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/api/users") {
      // List all connected users
      const data = Array.from(users.values()).map((u) => ({
        id: u.id,
        username: u.username,
        room: u.room,
      }));
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/rooms") {
      // List all rooms
      const data = Array.from(rooms.entries()).map(([name, members]) => ({
        name,
        members: Array.from(members),
      }));
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  // WebSocket handler
  websocket: {
    open(ws:ServerWebSocket<WSData>) {
      // Assign user id
      const id = crypto.randomUUID();
      users.set(id, { id, username: `user-${id.slice(0, 4)}`, ws });
      ws.data = { id };
      console.info("User connected:", id);
    },

    message(ws:ServerWebSocket<WSData>, raw) {
      const id = ws.data.id;
      const user = users.get(id);
      if (!user) return;

      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (data.type === "join") {
        const room = data.room || "default";
        user.room = room;
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room)!.add(id);
        broadcast(room, { type: "joined", from: user.username });
      }

      if (data.type === "typing") {
        if (!user.room) return;
        broadcast(user.room, { type: "typing", from: user.id.slice(0,4), content: data.content }, id);
      }

      if (data.type === "message") {
        if (!user.room) return;
        broadcast(user.room, { type: "message", from: user.id.slice(0,4), content: data.content }, id);
      }
    },

    close(ws:ServerWebSocket<WSData>) {
      const id = ws.data.id;
      const user = users.get(id);
      if (user) {
        if (user.room && rooms.has(user.room)) {
          rooms.get(user.room)!.delete(id);
        }
        users.delete(id);
        console.log("User disconnected:", id);
      }
    },
  },
});

console.log(`Server running at ws://localhost:${server.port}`);
