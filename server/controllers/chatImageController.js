const fs = require("fs");

// UPLOAD CHAT IMAGE
exports.uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const imagePath =
      `/uploads/chat-images/${req.file.filename}`;

    const imageUrl =
      `${req.protocol}://${req.get("host")}${imagePath}`;

    return res.status(200).json({
      message: "Chat image uploaded successfully",

      filename: req.file.filename,

      imagePath,

      imageUrl,
    });
  } catch (error) {
    console.error("Chat image upload error:", error);

    if (
      req.file &&
      req.file.path &&
      fs.existsSync(req.file.path)
    ) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      message: "Failed to upload chat image",
    });
  }
};