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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_conversation", async (conversationId) => {
    await socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("send_message", async (data) => {
    // data: { conversationId, content, senderId }
    const { conversationId, content, senderId } = data;

    try {
      const message = await prisma.message.create({
        data: {
          content,
          conversationId,
          senderId,
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
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
