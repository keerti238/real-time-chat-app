const express = require("express");

const chatImageUpload = require(
  "../middleware/chatImageUpload"
);

const {
  uploadChatImage,
} = require("../controllers/chatImageController");

const router = express.Router();

// POST /api/chat-images/upload
router.post(
  "/upload",
  chatImageUpload.single("image"),
  uploadChatImage
);

module.exports = router;