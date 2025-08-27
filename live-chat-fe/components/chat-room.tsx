"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Moon, Sun, Send, Users, Wifi, WifiOff } from "lucide-react"
import { useTheme } from "next-themes"

type ChatEvent = {
  type: "typing" | "message" | "joined" | "disconnected"
  from: string
  content: string
  room: string
  timestamp?: number
}

const getUserColor = (username: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (username: string) => {
  return username
    .split("-")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<ChatEvent[]>([])
  const [typingPreview, setTypingPreview] = useState<string>("")
  const [input, setInput] = useState("")
  const [room, setRoom] = useState("lobby")
  const [joined, setJoined] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  const wsRef = useRef<WebSocket | null>(null)
  const usernameRef = useRef("You")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null)
  const { theme, setTheme } = useTheme()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_BE_URL || "ws://localhost:3001/ws")
    wsRef.current = ws

    ws.onopen = () => {
      console.log("✅ Connected")
      setIsConnected(true)
    }

    ws.onmessage = (e) => {
      try {
        const data: ChatEvent = JSON.parse(e.data)
        data.timestamp = Date.now()

        if (data.type === "joined" || data.type === "disconnected") {
          setMessages((prev) => [...prev, data])
          const match = data.content.match(/$$(\d+) online$$/)
          if (match) setOnlineCount(Number.parseInt(match[1]))
        }

        if (data.type === "message") {
          setMessages((prev) => [...prev, data])
          setTypingUsers((prev) => {
            const newSet = new Set(prev)
            newSet.delete(data.from)
            return newSet
          })
        }

        if (data.type === "typing" && data.from !== usernameRef.current) {
          setTypingUsers((prev) => new Set(prev).add(data.from))

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers((prev) => {
              const newSet = new Set(prev)
              newSet.delete(data.from)
              return newSet
            })
          }, 3000)
        }
      } catch (err) {
        console.error("Invalid WS data:", e.data, "err", err)
      }
    }

    ws.onclose = () => {
      console.log("❌ Disconnected")
      setIsConnected(false)
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      ws.close()
    }
  }, [room])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (e.target.value.trim()) {
      wsRef.current?.send(JSON.stringify({ type: "typing", from: usernameRef.current, content: e.target.value, room }))
    }
  }

  const handleSend = () => {
    if (!input.trim()) return
    const message = {
      type: "message" as const,
      from: usernameRef.current,
      content: input.trim(),
      room,
      timestamp: Date.now(),
    }

    wsRef.current?.send(JSON.stringify(message))
    setMessages((prev) => [...prev, message])
    setInput("")
    setTypingUsers((prev) => {
      const newSet = new Set(prev)
      newSet.delete(usernameRef.current)
      return newSet
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleJoinRoom = () => {
    if (!room.trim()) return
    setMessages([])
    wsRef.current?.send(JSON.stringify({ type: "join", from: usernameRef.current, room: room.trim() }))
    setJoined(true)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="mx-auto max-w-4xl h-screen flex flex-col">
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Live Chat
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>

        {!joined ? (
          <Card className="mx-auto w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Join a Chat Room</CardTitle>
              <p className="text-sm text-muted-foreground">Enter a room name to start chatting with others</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="room" className="text-sm font-medium">
                  Room Name
                </label>
                <Input
                  id="room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., general, team-alpha, project-x"
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                />
              </div>
              <Button className="w-full" onClick={handleJoinRoom} disabled={!room.trim() || !isConnected}>
                {isConnected ? "Join Room" : "Connecting..."}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">#{room}</CardTitle>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {onlineCount} online
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setJoined(false)
                    setMessages([])
                    setOnlineCount(0)
                  }}
                >
                  Leave Room
                </Button>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i}>
                      {msg.type === "joined" || msg.type === "disconnected" ? (
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-xs">
                            {msg.content}
                          </Badge>
                        </div>
                      ) : (
                        <div className={`flex gap-3 ${msg.from === usernameRef.current ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className={`text-xs font-medium text-white ${getUserColor(msg.from)}`}>
                              {getInitials(msg.from)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`flex flex-col gap-1 max-w-[70%] ${msg.from === usernameRef.current ? "items-end" : ""}`}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{msg.from}</span>
                              {msg.timestamp && <span>{formatTime(msg.timestamp)}</span>}
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2 text-sm break-words ${
                                msg.from === usernameRef.current ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {typingUsers.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        {Array.from(typingUsers)
                          .slice(0, 3)
                          .map((user) => (
                            <Avatar key={user} className="h-6 w-6">
                              <AvatarFallback className={`text-xs font-medium text-white ${getUserColor(user)}`}>
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                      </div>
                      <span>
                        {Array.from(typingUsers).slice(0, 2).join(", ")}
                        {typingUsers.size > 2 && ` and ${typingUsers.size - 2} others`}
                        {typingUsers.size === 1 ? " is" : " are"} typing...
                      </span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                        <div
                          className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Textarea
                      value={input}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                      className="min-h-[44px] max-h-32 resize-none"
                      rows={1}
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || !isConnected}
                    size="icon"
                    className="h-11 w-11 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
