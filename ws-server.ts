import { Server } from "socket.io";
import { createServer } from "http";
import { PrismaClient } from "./generated/prisma";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now, configure for production
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.WS_PORT ?? 3001;

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register_user", (userId: string) => {
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)?.add(socket.id);

    // Broadcast online status to everyone (or just friends in a real app)
    io.emit("user_online", userId);

    // Send current online users to the new user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("online_users", onlineUserIds);
  });

  socket.on("join_conversation", async (conversationId) => {
    await socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on(
    "typing",
    (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      socket.to(data.conversationId).emit("typing_status", data);
    },
  );

  socket.on("send_message", async (data) => {
    // data: { conversationId, content, senderId, attachmentUrl }
    const { conversationId, content, senderId, attachmentUrl } = data;

    try {
      const message = await prisma.message.create({
        data: {
          content,
          conversationId,
          senderId,
          attachmentUrl,
        },
        include: {
          sender: true,
        },
      });

      io.to(conversationId).emit("new_message", message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove from online users
    for (const [userId, sockets] of onlineUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user_offline", userId);
        }
        break;
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
