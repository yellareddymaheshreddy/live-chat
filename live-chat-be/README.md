# 🚀 Real-Time Group Chat with Bun WebSockets

A blazing-fast **real-time chat platform** built using **Bun** +
**WebSockets**, featuring:

✅ Multi-room chat\
✅ Live typing indicators\
✅ User presence tracking (join/leave)\
✅ Real-time active users list\
✅ Ultra-low latency broadcast system\
✅ Minimal + scalable architecture

> This project demonstrates modern realtime communication using Bun's
> native WebSocket server.

------------------------------------------------------------------------

## 🛠️ Tech Stack

  Tool                       Purpose
  -------------------------- ----------------------------
  **Bun**                    Runtime + WebSocket Server
  **TypeScript**             Strong typing & clarity
  **WebSockets**             Real-time communication
  **Map / Set Structures**   In-memory fast state store

------------------------------------------------------------------------

## ✨ Features

  Feature                      Description
  ---------------------------- --------------------------------
  👥 **Room-based chats**      Users can join different rooms
  💬 **Instant messages**      Broadcast to all room members
  ⌨️ **Live typing updates**   Real-time typing feedback
  🚪 **Join / Leave events**   Presence notifications
  ⚡ **No DB needed**          In-memory, super-fast

------------------------------------------------------------------------

## 📂 Project Structure

    project/
     ├─ server/
     │   └─ broadcast.ts    # Bun WebSocket server
     ├─ frontend/           # Chat UI (HTML/JS)
     ├─ README.md
     └─ package.json

------------------------------------------------------------------------

## ▶️ Running the Backend

> Make sure Bun is installed: https://bun.sh

``` sh
bun run server/broadcast.ts
```

Server will start at:

    ws://localhost:3001/ws

------------------------------------------------------------------------

## 🧠 How it Works

-   No socket libraries --- **pure WebSockets**
-   Uses Maps to store:
    -   connected users
    -   rooms & members
    -   live typing states

This keeps everything **fast & memory-efficient**.

------------------------------------------------------------------------

## 💡 API Events

  Event           Purpose
  --------------- -----------------------------------------
  `join`          user joins a room
  `message`       user sends chat message
  `typing`        "user typing..." feedback
  `live_typing`   sends live typing text preview
  (close)         removes user from room & updates others

------------------------------------------------------------------------

## Example WebSocket Client Snippet

``` js
const ws = new WebSocket("ws://localhost:3001/ws")

ws.onopen = () => ws.send(JSON.stringify({ type: "join", room: "lobby" }))
ws.onmessage = (e) => console.log(JSON.parse(e.data))
```

------------------------------------------------------------------------

## 🛡️ Notes

-   This is **in-memory**, ideal for demos & learning.
-   For production: use Redis Pub/Sub for scaling.

------------------------------------------------------------------------

## 🌟 Future Enhancements

-   ✅ UI polish (frontend integration)
-   🔒 Auth + user identities
-   🕸️ Redis for multi-server scaling
-   📦 Export as npm module `@mahs/live-chat-bun`

------------------------------------------------------------------------

## 🤝 Contributing

Contributions welcome!\
Feel free to open issues, submit PRs, or request features.

------------------------------------------------------------------------

## 📜 License

MIT --- free to use & modify.\
Made with ❤️ by **Mahesh**
