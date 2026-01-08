import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Video,
  Calendar,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data - will be replaced with API calls
const mockConversations = [
  {
    id: 1,
    student: {
      name: "Priya Sharma",
      email: "priya@example.com",
      avatar: "PS",
    },
    lastMessage: "Thank you for the resume feedback!",
    lastMessageTime: "2 hours ago",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 2,
    student: {
      name: "Rahul Kumar",
      email: "rahul@example.com",
      avatar: "RK",
    },
    lastMessage: "Can we schedule a session for next week?",
    lastMessageTime: "5 hours ago",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 3,
    student: {
      name: "Ananya Patel",
      email: "ananya@example.com",
      avatar: "AP",
    },
    lastMessage: "I've completed the JavaScript fundamentals skill.",
    lastMessageTime: "1 day ago",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 4,
    student: {
      name: "Vikram Singh",
      email: "vikram@example.com",
      avatar: "VS",
    },
    lastMessage: "Thanks for the interview tips!",
    lastMessageTime: "2 days ago",
    unreadCount: 0,
    isOnline: false,
  },
];

const mockMessages = [
  {
    id: 1,
    sender: "student",
    content: "Hello! I have a question about my learning path.",
    timestamp: "10:30 AM",
    isRead: true,
  },
  {
    id: 2,
    sender: "mentor",
    content: "Hi! I'd be happy to help. What would you like to know?",
    timestamp: "10:32 AM",
    isRead: true,
  },
  {
    id: 3,
    sender: "student",
    content: "I'm stuck on the Data Structures skill. Can you guide me?",
    timestamp: "10:35 AM",
    isRead: true,
  },
  {
    id: 4,
    sender: "mentor",
    content: "Of course! Let's schedule a session to go through it together. How about tomorrow at 3 PM?",
    timestamp: "10:37 AM",
    isRead: true,
  },
  {
    id: 5,
    sender: "student",
    content: "That works perfectly! Thank you so much.",
    timestamp: "10:40 AM",
    isRead: true,
  },
];

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(
    mockConversations[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const filteredConversations = mockConversations.filter((conv) =>
    conv.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = mockConversations.find(
    (c) => c.id === selectedConversation
  );

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // TODO: Send message via API
    setMessageInput("");
  };

  return (
    <DashboardLayout role="mentor" title="Messages">
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 flex flex-col glass-card rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-foreground">Conversations</h2>
              <Badge variant="outline">
                {mockConversations.reduce((sum, c) => sum + c.unreadCount, 0)}{" "}
                unread
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-body-sm text-muted-foreground">
                    No conversations found
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                          {conversation.student.avatar}
                        </div>
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-body-sm font-medium text-foreground truncate">
                            {conversation.student.name}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 min-w-5 px-1.5 text-caption"
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-caption text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-caption text-muted-foreground mt-1">
                          {conversation.lastMessageTime}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col glass-card rounded-xl overflow-hidden">
          {selectedConversation && currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-body-sm">
                        {currentConversation.student.avatar}
                      </div>
                      {currentConversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <p className="text-body font-semibold text-foreground">
                        {currentConversation.student.name}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {currentConversation.student.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" title="Schedule Session">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Video Call">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {mockMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === "mentor" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender === "mentor"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-body-sm">{message.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-2 text-caption ${
                            message.sender === "mentor"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span>{message.timestamp}</span>
                          {message.sender === "mentor" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" title="Attach File">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-body text-foreground">Select a conversation</p>
                <p className="text-body-sm text-muted-foreground mt-2">
                  Choose a student from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}




