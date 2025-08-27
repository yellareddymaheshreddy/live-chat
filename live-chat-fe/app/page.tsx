"use client";

import { useEffect, useRef, useState } from "react";

type ChatEvent = {
  type: "typing" | "message" | "joined" | "disconnected";
  from: string;
  content: string;
  room: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [typingPreview, setTypingPreview] = useState<string>("");
  const [input, setInput] = useState("");
  const [room, setRoom] = useState("lobby"); // default room
  const [joined, setJoined] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const usernameRef = useRef("You");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/ws");//ws://localhost:3001/ws
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to server");
    };

    ws.onmessage = (e) => {
      try {
        const data: ChatEvent = JSON.parse(e.data);
        
        // if (data.room !== room) return; // ignore messages not for this room
        if (data.type=="joined") {
          
        }
        if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
          setTypingPreview("");
        }

        if (data.type === "typing" && data.from !== usernameRef.current) {
          setTypingPreview(`${data.from} typing: ${data.content}`);
        }
      } catch (err) {
        console.error("Invalid WS data:", e.data);
      }
    };

    ws.onclose = () => {
      console.log("❌ Disconnected");
    };

    return () => {
      ws.close();
    };
  }, [room]); // reconnect when room changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    wsRef.current?.send(
      JSON.stringify({
        type: "typing",
        from: usernameRef.current,
        content: e.target.value,
        room,
      })
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;

    wsRef.current?.send(
      JSON.stringify({
        type: "message",
        from: usernameRef.current,
        content: input,
        room,
      })
    );

    setInput("");
    setMessages((prev) => [...prev, {
        type: "message",
        from: usernameRef.current,
        content: input,
        room,
      }]);
  };

  const handleJoinRoom = () => {
    setMessages([]); // clear old chat
    wsRef.current?.send(
      JSON.stringify({
        type: "join",
        from: usernameRef.current,
        content: input,
        room,
      })
    );
    setJoined(true);
  };

  return (
    <main className="flex flex-col h-screen items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-4 flex flex-col h-[80vh]">
        {/* Join Room */}
        {!joined ? (
          <div className="flex flex-col gap-2">
            <input
              className="border p-2 rounded"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name..."
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={handleJoinRoom}
            >
              Join Room
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-2">
              Room: <span className="text-blue-600">{room}</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    msg.from === usernameRef.current
                      ? "bg-blue-200 text-right"
                      : "bg-gray-200"
                  }`}
                >
                  <strong>{msg.from}:</strong> {msg.content}
                </div>
              ))}
              {typingPreview && (
                <div className="italic text-gray-500">{typingPreview}</div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 border p-2 rounded"
                value={input}
                onChange={handleChange}
                placeholder="Type a message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <button
                className="bg-blue-500 text-white px-4 rounded"
                onClick={handleSend}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
