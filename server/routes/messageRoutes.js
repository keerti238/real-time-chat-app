const express = require("express");

const router = express.Router();

const messageController = require(
  "../controllers/messageController"
);

// ========================================
// SEND MESSAGE
// ========================================
router.post(
  "/",
  messageController.sendMessage
);

// ========================================
// MARK MESSAGES AS SEEN
// Important: keep this route before /:user1/:user2
// ========================================
router.patch(
  "/seen/update",
  messageController.markMessagesAsSeen
);

// ========================================
// DELETE MESSAGE FOR CURRENT USER
// ========================================
router.patch(
  "/delete-for-me/:messageId",
  messageController.deleteMessageForMe
);

// ========================================
// DELETE MESSAGE FOR EVERYONE
// ========================================
router.patch(
  "/delete-for-everyone/:messageId",
  messageController.deleteMessageForEveryone
);

// ========================================
// GET CONVERSATION BETWEEN TWO USERS
// Keep this route at the bottom
// ========================================
router.get(
  "/:user1/:user2",
  messageController.getMessages
);

module.exports = router;