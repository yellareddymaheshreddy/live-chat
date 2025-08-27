"use client";

import ChatRoom from "@/components/chat-room";
import { useEffect, useRef, useState } from "react";

type ChatEvent = {
  type: "typing" | "message" | "joined" | "disconnected";
  from: string;
  content: string;
  room: string;
};

export default function Home() {
  return <ChatRoom />
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [typingPreview, setTypingPreview] = useState<string>("");
  const [input, setInput] = useState("");
  const [room, setRoom] = useState("lobby");
  const [joined, setJoined] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const usernameRef = useRef("You");

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_BE_URL! );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected");
    };

    ws.onmessage = (e) => {
      try {
        const data: ChatEvent = JSON.parse(e.data);

        if (data.type === "joined" || data.type === "disconnected") {
          setMessages((prev) => [...prev, data]);
          console.log(data)
          const match = data.content.match(/\((\d+) online\)/);
          if (match) setOnlineCount(parseInt(match[1]));
        }

        if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
          setTypingPreview("");
        }

        if (data.type === "typing" && data.from !== usernameRef.current) {
          setTypingPreview(`${data.from}: ${data.content}`);
        }
      } catch (err) {
        console.error("Invalid WS data:", e.data,"err",err);
      }
    };

    ws.onclose = () => console.log("❌ Disconnected");

    return () => {
      ws.close();
    };
  }, [room]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    wsRef.current?.send(
      JSON.stringify({ type: "typing", from: usernameRef.current, content: e.target.value, room })
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;
    wsRef.current?.send(JSON.stringify({ type: "message", from: usernameRef.current, content: input, room }));
    setMessages((prev) => [...prev, { type: "message", from: usernameRef.current, content: input, room }]);
    setInput("");
    setTypingPreview("");
  };

  const handleJoinRoom = () => {
    setMessages([]);
    wsRef.current?.send(JSON.stringify({ type: "join", from: usernameRef.current, room }));
    setJoined(true);
  };

  return (
    <main className="flex flex-col h-screen items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-4 flex flex-col h-[80vh]">
        {!joined ? (
          <div className="flex flex-col gap-2">
            <input
              className="border p-2 rounded"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name..."
            />
            <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleJoinRoom}>
              Join Room
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-2">
              Room: <span className="text-blue-600">{room}</span> ({onlineCount} online)
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded break-words ${
                    msg.type === "joined" || msg.type === "disconnected"
                      ? "bg-yellow-100 text-center text-gray-600 italic"
                      : msg.from === usernameRef.current
                      ? "bg-blue-200 text-right"
                      : "bg-gray-200 text-left"
                  }`}
                >
                  {msg.type === "message" || msg.type === "typing" ? (
                    <strong>{msg.from}:</strong>
                  ) : null}{" "}
                  {msg.content}
                </div>
              ))}
              {typingPreview && <div className="italic text-gray-500">{typingPreview}</div>}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 border p-2 rounded break-words"
                value={input}
                onChange={handleChange}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button className="bg-blue-500 text-white px-4 rounded" onClick={handleSend}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
