const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  id: String,
  sender: String,
  text: String,
  type: { type: String, default: "text" },
  fileUrl: String,
  pollId: String,
  replyTo: { type: mongoose.Schema.Types.Mixed, default: null },
  reactions: { type: Map, of: [String], default: {} },
  timestamp: { type: Date, default: Date.now },
});

const pollSchema = new mongoose.Schema({
  id: String,
  question: String,
  options: [{ text: String, votes: [String] }],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  password: { type: String, default: null },
  host: { type: String, required: true },
  members: [String],
  messages: [messageSchema],
  polls: [pollSchema],
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Room", roomSchema);
