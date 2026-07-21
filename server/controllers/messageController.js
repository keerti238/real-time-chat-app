const mongoose = require("mongoose");
const Message = require("../models/Message");

// ========================================
// CREATE A NEW MESSAGE
// ========================================
exports.sendMessage = async (req, res) => {
  try {
    const {
      sender,
      receiver,
      text = "",
      messageType = "text",
      imageUrl = "",
    } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({
        message: "Sender and receiver are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(sender) ||
      !mongoose.Types.ObjectId.isValid(receiver)
    ) {
      return res.status(400).json({
        message: "Invalid sender or receiver ID",
      });
    }

    if (!["text", "image"].includes(messageType)) {
      return res.status(400).json({
        message: "Invalid message type",
      });
    }

    if (
      messageType === "text" &&
      !text.trim()
    ) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }

    if (
      messageType === "image" &&
      !imageUrl.trim()
    ) {
      return res.status(400).json({
        message: "Image URL is required",
      });
    }

    const newMessage = await Message.create({
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
      status: "sent",
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// ========================================
// GET CONVERSATION BETWEEN TWO USERS
// ========================================
exports.getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    if (!user1 || !user2) {
      return res.status(400).json({
        message: "Both user IDs are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(user1) ||
      !mongoose.Types.ObjectId.isValid(user2)
    ) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            {
              sender: user1,
              receiver: user2,
            },
            {
              sender: user2,
              receiver: user1,
            },
          ],
        },
        {
          deletedFor: {
            $nin: [
              new mongoose.Types.ObjectId(user1),
            ],
          },
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate(
        "sender",
        "name email profilePic isOnline lastSeen"
      )
      .populate(
        "receiver",
        "name email profilePic isOnline lastSeen"
      );

    res.status(200).json(messages);
  } catch (error) {
    console.error(
      "Get messages error:",
      error
    );

    res.status(500).json({
      message: "Failed to load messages",
      error: error.message,
    });
  }
};

// ========================================
// MARK MESSAGES AS SEEN
// ========================================
exports.markMessagesAsSeen = async (
  req,
  res
) => {
  try {
    const { senderId, receiverId } =
      req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({
        message:
          "Sender ID and receiver ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        senderId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        receiverId
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid sender or receiver ID",
      });
    }

    const seenTime = new Date();

    const result = await Message.updateMany(
      {
        sender: senderId,
        receiver: receiverId,
        status: {
          $ne: "seen",
        },
        isDeletedForEveryone: false,
      },
      {
        $set: {
          status: "seen",
          seenAt: seenTime,
          deliveredAt: seenTime,
        },
      }
    );

    res.status(200).json({
      message: "Messages marked as seen",
      modifiedCount: result.modifiedCount,
      seenAt: seenTime,
    });
  } catch (error) {
    console.error(
      "Mark messages as seen error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to mark messages as seen",
      error: error.message,
    });
  }
};

// ========================================
// DELETE MESSAGE FOR CURRENT USER
// ========================================
exports.deleteMessageForMe = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        message:
          "Message ID and user ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        messageId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid message ID or user ID",
      });
    }

    const message =
      await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const senderId =
      message.sender.toString();

    const receiverId =
      message.receiver.toString();

    if (
      userId !== senderId &&
      userId !== receiverId
    ) {
      return res.status(403).json({
        message:
          "You cannot delete this message",
      });
    }

    const alreadyDeleted =
      message.deletedFor.some(
        (deletedUserId) =>
          deletedUserId.toString() === userId
      );

    if (!alreadyDeleted) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({
      message: "Message deleted for you",
      messageId: message._id,
      deleteType: "me",
    });
  } catch (error) {
    console.error(
      "Delete message for me error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete message for you",
      error: error.message,
    });
  }
};

// ========================================
// DELETE MESSAGE FOR EVERYONE
// ========================================
exports.deleteMessageForEveryone = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        message:
          "Message ID and user ID are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        messageId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid message ID or user ID",
      });
    }

    const message =
      await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const senderId =
      message.sender.toString();

    if (senderId !== userId) {
      return res.status(403).json({
        message:
          "Only the sender can delete this message for everyone",
      });
    }

    if (message.isDeletedForEveryone) {
      return res.status(200).json({
        message:
          "Message is already deleted",
        messageId: message._id,
        deleteType: "everyone",
      });
    }

    message.isDeletedForEveryone = true;
    message.deletedAt = new Date();
    message.text = "";
    message.imageUrl = "";

    await message.save();

    res.status(200).json({
      message:
        "Message deleted for everyone",
      messageId: message._id,
      deleteType: "everyone",
      deletedAt: message.deletedAt,
    });
  } catch (error) {
    console.error(
      "Delete message for everyone error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete message for everyone",
      error: error.message,
    });
  }
};