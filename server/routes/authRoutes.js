const express = require("express");

const {
  registerUser,
  loginUser,
  getProfile,
  getAllUsers,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/profile", protect, getProfile);

router.put(
  "/profile",
  protect,
  upload.single("profilePic"),
  updateProfile
);
router.put(
  "/change-password",
  protect,
  changePassword
);

router.get("/users", protect, getAllUsers);

module.exports = router;