# LiveChat Frontend (Next.js)

Frontend for the **LiveChat real‑time chat app**, powered by WebSockets.

### 🚀 Features
- Real‑time messaging
- Live typing
- Multi‑room chat
- Lightweight + fast UI

### 🛠️ Setup

```bash
cd fe
npm install       # or bun install
npm run dev       # or bun dev
```

### 🔗 Environment

Create `.env.local`:

```
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

### ✅ Run Backend First

```bash
cd ../be
bun run index.ts
```

