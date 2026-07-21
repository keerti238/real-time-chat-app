const express = require("express");
const multer = require("multer");

const uploadProfilePicture =
  require("../middleware/uploadMiddleware");

const {
  uploadProfilePicture:
    uploadProfilePictureController,
} = require("../controllers/uploadController");

const router = express.Router();

// UPLOAD AND SAVE PROFILE PICTURE
router.post(
  "/profile-picture",
  uploadProfilePicture.single(
    "profilePic"
  ),
  uploadProfilePictureController
);

// HANDLE MULTER ERRORS
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message:
          "Image size must be less than 5 MB",
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      message:
        error.message ||
        "Image upload failed",
    });
  }

  next();
});

module.exports = router;