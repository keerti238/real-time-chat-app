const fs = require("fs");
const path = require("path");
const User = require("../models/User");

// UPLOAD AND SAVE PROFILE PICTURE
exports.uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select a profile picture",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        message: "User not found",
      });
    }

    // Delete the previous profile picture
    if (
      user.profilePic &&
      user.profilePic.startsWith("/uploads/")
    ) {
      const oldImageName = path.basename(
        user.profilePic
      );

      const oldImagePath = path.join(
        __dirname,
        "../uploads",
        oldImageName
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const imagePath = `/uploads/${req.file.filename}`;

    user.profilePic = imagePath;

    await user.save();

    const imageUrl =
      `${req.protocol}://${req.get("host")}${imagePath}`;

    // Send profile-picture update to all connected users
    const io = req.app.get("io");

    if (io) {
      io.emit("profilePictureUpdated", {
        userId: user._id.toString(),
        profilePic: user.profilePic,
        imageUrl,
      });
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePic: imagePath,
      imageUrl,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error(
      "Profile picture upload error:",
      error
    );

    if (
      req.file &&
      fs.existsSync(req.file.path)
    ) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      message: "Failed to update profile picture",
    });
  }
};