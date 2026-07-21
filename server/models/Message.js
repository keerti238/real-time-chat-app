const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emoji: {
      type: String,
      required: true,
      trim: true,
    },

    reactedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },

    text: {
      type: String,
      default: "",
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    seenAt: {
      type: Date,
      default: null,
    },

    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedAt: {
      type: Date,
      default: null,
    },

    reactions: {
      type: [reactionSchema],
      default: [],
    },
    isSeen: {
    type: Boolean,
    default: false,
  },

  seenAt: {
    type: Date,
    default: null,
  },
  },
  {
    timestamps: true,
  }
);

// Validate text and image messages
messageSchema.pre("validate", function (next) {
  if (this.isDeletedForEveryone) {
    return next();
  }

  if (
    this.messageType === "text" &&
    !this.text?.trim()
  ) {
    return next(
      new Error("Text message cannot be empty")
    );
  }

  if (
    this.messageType === "image" &&
    !this.imageUrl?.trim()
  ) {
    return next(
      new Error("Image URL is required")
    );
  }

  next();
});

module.exports = mongoose.model(
  "Message",
  messageSchema
);