const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const chatImageRoutes = require("./routes/chatImageRoutes");

const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();

connectDB();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// Make uploaded files accessible in the browser
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API routes
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat-images", chatImageRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Real-Time Chat Backend Running");
});

// Multer and general error handler
app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "Image size must be less than 5 MB",
    });
  }

  if (error.message) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Server error",
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make Socket.IO available inside controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

// =========================
// MESSAGE REACTIONS
// =========================
socket.on(
  "reactToMessage",
  async ({ messageId, userId, emoji }) => {
    try {
      if (!messageId || !userId || !emoji) {
        socket.emit("reactionError", {
          message: "Message ID, user ID and emoji are required.",
        });
        return;
      }

      const allowedEmojis = [
        "👍",
        "❤️",
        "😂",
        "😮",
        "😢",
        "🔥",
      ];

      if (!allowedEmojis.includes(emoji)) {
        socket.emit("reactionError", {
          message: "Invalid emoji.",
        });
        return;
      }

      const message = await Message.findById(messageId);

      if (!message) {
        socket.emit("reactionError", {
          message: "Message not found.",
        });
        return;
      }

      if (message.isDeletedForEveryone) {
        socket.emit("reactionError", {
          message: "Cannot react to deleted message.",
        });
        return;
      }

      const senderId = message.sender.toString();
      const receiverId = message.receiver.toString();

      const existingReaction = message.reactions.find(
        (reaction) =>
          reaction.user.toString() === userId
      );

      if (existingReaction) {

        // Same emoji -> remove reaction
        if (existingReaction.emoji === emoji) {

          message.reactions =
            message.reactions.filter(
              (reaction) =>
                reaction.user.toString() !== userId
            );

        } else {

          // Change emoji
          existingReaction.emoji = emoji;
          existingReaction.reactedAt = new Date();

        }

      } else {

        // New reaction
        message.reactions.push({
          user: userId,
          emoji,
          reactedAt: new Date(),
        });

      }

      await message.save();

      const reactionData = {
        messageId: message._id,
        reactions: message.reactions,
      };

      io.to(senderId).emit(
        "messageReactionUpdated",
        reactionData
      );

      io.to(receiverId).emit(
        "messageReactionUpdated",
        reactionData
      );

    } catch (error) {

      console.error(
        "Reaction error:",
        error.message
      );

      socket.emit("reactionError", {
        message: "Failed to update reaction.",
      });

    }
  }
);
  // DELETE MESSAGE
socket.on(
  "deleteMessage",
  async ({
    messageId,
    userId,
    deleteType,
  }) => {
    try {
      if (
        !messageId ||
        !userId ||
        !deleteType
      ) {
        socket.emit("deleteMessageError", {
          message:
            "Message ID, user ID and delete type are required.",
        });

        return;
      }

      const message =
        await Message.findById(messageId);

      if (!message) {
        socket.emit("deleteMessageError", {
          message: "Message not found.",
        });

        return;
      }

      const senderId =
        message.sender.toString();

      const receiverId =
        message.receiver.toString();

      const requestingUserId =
        userId.toString();

      const isParticipant =
        requestingUserId === senderId ||
        requestingUserId === receiverId;

      if (!isParticipant) {
        socket.emit("deleteMessageError", {
          message:
            "You are not allowed to delete this message.",
        });

        return;
      }

      // DELETE FOR EVERYONE
      if (deleteType === "everyone") {
        if (requestingUserId !== senderId) {
          socket.emit("deleteMessageError", {
            message:
              "Only the sender can delete this message for everyone.",
          });

          return;
        }

        message.isDeletedForEveryone = true;
        message.deletedAt = new Date();
        message.text = "";
        message.imageUrl = "";

        await message.save();

        io.to(senderId).emit(
          "messageDeleted",
          {
            messageId: message._id,
            deleteType: "everyone",
            deletedAt: message.deletedAt,
          }
        );

        io.to(receiverId).emit(
          "messageDeleted",
          {
            messageId: message._id,
            deleteType: "everyone",
            deletedAt: message.deletedAt,
          }
        );

        return;
      }

      // DELETE ONLY FOR REQUESTING USER
      if (deleteType === "me") {
        const alreadyDeleted =
          message.deletedFor.some(
            (deletedUserId) =>
              deletedUserId.toString() ===
              requestingUserId
          );

        if (!alreadyDeleted) {
          message.deletedFor.push(
            requestingUserId
          );

          await message.save();
        }

        io.to(requestingUserId).emit(
          "messageDeleted",
          {
            messageId: message._id,
            deleteType: "me",
            userId: requestingUserId,
          }
        );

        return;
      }

      socket.emit("deleteMessageError", {
        message: "Invalid delete type.",
      });
    } catch (error) {
      console.error(
        "Delete message error:",
        error
      );

      socket.emit("deleteMessageError", {
        message:
          "Failed to delete the message.",
      });
    }
  }
);

  // Join the user's personal Socket.IO room
  socket.on("joinUser", async (userId) => {
    try {
      if (!userId) {
        return;
      }

      socket.userId = userId;
      socket.join(userId);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          isOnline: true,
        },
        {
          new: true,
        }
      ).select("-password");

      if (!user) {
        return;
      }

      io.emit("userStatusChanged", {
        userId: user._id.toString(),
        isOnline: true,
        lastSeen: user.lastSeen,
      });

      console.log(`User ${userId} joined personal room`);
    } catch (error) {
      console.error("Join user error:", error.message);
    }
  });

  // Typing event
  socket.on("typing", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) {
      return;
    }

    io.to(receiverId).emit("userTyping", {
      senderId,
    });
  });

  // Stop typing event
  socket.on("stopTyping", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) {
      return;
    }

    io.to(receiverId).emit("userStoppedTyping", {
      senderId,
    });
  });

  // Send text or image message
  socket.on("sendMessage", async (messageData) => {
    try {
      const {
        sender,
        receiver,
        messageType = "text",
        text = "",
        imageUrl = "",
      } = messageData;

      // Check sender and receiver
      if (!sender || !receiver) {
        socket.emit("messageError", {
          message: "Sender and receiver are required",
        });

        return;
      }

      // Check message type
      if (!["text", "image"].includes(messageType)) {
        socket.emit("messageError", {
          message: "Invalid message type",
        });

        return;
      }

      // Validate text message
      if (
        messageType === "text" &&
        !text.trim()
      ) {
        socket.emit("messageError", {
          message: "Text message cannot be empty",
        });

        return;
      }

      // Validate image message
      if (
        messageType === "image" &&
        !imageUrl.trim()
      ) {
        socket.emit("messageError", {
          message: "Image URL is required",
        });

        return;
      }

      // Save message in MongoDB
      const savedMessage = await Message.create({
        sender,
        receiver,
        messageType,
        text:
          messageType === "text"
            ? text.trim()
            : "",
        imageUrl:
          messageType === "image"
            ? imageUrl.trim()
            : "",
      });

      // Prepare message for frontend
      const completeMessage = {
  _id: savedMessage._id.toString(),
  sender: savedMessage.sender.toString(),
  receiver: savedMessage.receiver.toString(),
  messageType: savedMessage.messageType,
  text: savedMessage.text,
  imageUrl: savedMessage.imageUrl,
  status: savedMessage.status,
  deliveredAt: savedMessage.deliveredAt,
  seenAt: savedMessage.seenAt,
  createdAt: savedMessage.createdAt,
  updatedAt: savedMessage.updatedAt,

  reactions: savedMessage.reactions.map(
    (reaction) => ({
      user: reaction.user.toString(),
      emoji: reaction.emoji,
      reactedAt: reaction.reactedAt,
    })
  ),
};

      // Send message to sender
      io.to(sender).emit(
        "receiveMessage",
        completeMessage
      );

      // Send message to receiver
      io.to(receiver).emit(
        "receiveMessage",
        completeMessage
      );

      // Stop typing indicator
      io.to(receiver).emit(
        "userStoppedTyping",
        {
          senderId: sender,
        }
      );
    } catch (error) {
      console.error(
        "Message save error:",
        error.message
      );

      socket.emit("messageError", {
        message: "Failed to save message",
      });
    }
  });

  // User disconnect
  socket.on("disconnect", async () => {
    try {
      console.log(
        "User disconnected:",
        socket.id
      );

      const userId = socket.userId;

      if (!userId) {
        return;
      }

      const remainingSockets =
        await io.in(userId).fetchSockets();

      // User may still be logged in from another tab
      if (remainingSockets.length > 0) {
        return;
      }

      const lastSeen = new Date();

      const user = await User.findByIdAndUpdate(
        userId,
        {
          isOnline: false,
          lastSeen,
        },
        {
          new: true,
        }
      ).select("-password");

      if (!user) {
        return;
      }

      io.emit("userStatusChanged", {
        userId: user._id.toString(),
        isOnline: false,
        lastSeen: user.lastSeen,
      });
    } catch (error) {
      console.error(
        "Disconnect update error:",
        error.message
      );
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});