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
import { Moon, Sun, Send, Users, Wifi, WifiOff, MessageCircle } from "lucide-react"
import { useTheme } from "next-themes"

type ChatEvent = {
  type: "typing" | "message" | "joined" | "disconnected" | "live_typing_update"
  from: string
  content: string
  room: string
  timestamp?: number
  onlineCount?: number
  onlineUsers?: string[]
  liveTyping?: LiveTyping[]
}

type LiveTyping = {
  userId: string
  username: string
  content: string
  timestamp: number
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
  const [input, setInput] = useState("")
  const [room, setRoom] = useState("lobby")
  const [joined, setJoined] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [liveTyping, setLiveTyping] = useState<LiveTyping[]>([])
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
  }, [messages, liveTyping])

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
          if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount)
          if (data.onlineUsers) setOnlineUsers(data.onlineUsers)
        }

        if (data.type === "live_typing_update") {
          setLiveTyping(data.liveTyping || [])
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
    wsRef.current?.send(
      JSON.stringify({
        type: "live_typing",
        content: e.target.value,
        room,
      }),
    )
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
    setLiveTyping([])
    wsRef.current?.send(JSON.stringify({ type: "join", from: usernameRef.current, room: room.trim() }))
    setJoined(true)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  LiveChat
                </h1>
                <p className="text-sm text-muted-foreground ">Real-time collaborative messaging</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-7xl">
        {!joined ? (
          <div className="flex items-center justify-center min-h-[calc(100dvh-200px)]">
            <Card className="w-full max-w-md">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100dvh-140px)]">
            <div className="lg:col-span-1 order-2 lg:order-1">
              {/* <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Online ({onlineCount})
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="p-4">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3">
                      {onlineUsers.map((username, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs font-medium text-white ${getUserColor(username)}`}>
                              {getInitials(username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{username}</p>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                              <span className="text-xs text-muted-foreground">Online</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card> */}
            </div>

            {/* Main chat area */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <Card className="h-full flex flex-col">
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
                        setLiveTyping([])
                        setOnlineCount(0)
                        setOnlineUsers([])
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
                                  className={`rounded-2xl px-4 py-2 text-sm break-words ${msg.from === usernameRef.current ? "bg-primary text-primary-foreground" : "bg-muted"
                                    }`}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {liveTyping.map((typing) => (
                        <div key={typing.userId} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback
                              className={`text-xs font-medium text-white ${getUserColor(typing.username)}`}
                            >
                              {getInitials(typing.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{typing.username}</span>
                              <span className="text-green-500">typing...</span>
                            </div>
                            <div className="rounded-2xl px-4 py-2 text-sm bg-muted/50 border-2 border-dashed border-muted-foreground/20 min-h-[40px] flex items-center">
                              <span className="text-muted-foreground italic">
                                {typing.content}
                                <span className="animate-pulse">|</span>
                              </span>
                            </div>
                          </div>
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
            </div>
          </div>
        )}
      </div>

      {/* <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>LiveChat Pro - Real-time collaborative messaging platform</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Built with WebSocket & React</span>
              <Separator orientation="vertical" className="h-4" />
              <span>© 2024 LiveChat Pro</span>
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  )
}
