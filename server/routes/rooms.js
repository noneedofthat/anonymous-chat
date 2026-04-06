const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "campfire", allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"] },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Generate unique 6-char room code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create room
router.post("/create", async (req, res) => {
  try {
    const { name, host, password, duration } = req.body;
    if (!name || !host) return res.status(400).json({ success: false, error: "name and host are required" });
    const hours = parseInt(duration) || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    let code = generateCode();
    while (await Room.findOne({ code })) {
      code = generateCode();
    }

    const room = new Room({
      code,
      name,
      host,
      password: password || null,
      members: [host],
      expiresAt,
    });

    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    console.error("Create room error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Join room
router.post("/join", async (req, res) => {
  try {
    const { code, name, password } = req.body;
    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) return res.status(404).json({ success: false, error: "Room not found" });
    if (room.password && room.password !== password) {
      return res.status(401).json({ success: false, error: "Wrong password" });
    }

    if (!room.members.includes(name)) {
      room.members.push(name);
      await room.save();
    }

    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get room info
router.get("/:code", async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, error: "Room not found" });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload image
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "No file" });
  res.json({ success: true, url: req.file.path });
});

module.exports = router;
