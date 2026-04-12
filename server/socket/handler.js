const Room = require("../models/Room");
const { v4: uuidv4 } = require("uuid");

// Track pending shutdown timers per room code
const shutdownTimers = new Map();

function cancelShutdown(code) {
  if (shutdownTimers.has(code)) {
    clearTimeout(shutdownTimers.get(code));
    shutdownTimers.delete(code);
  }
}

// Shared helper — remove member, delete room if empty after grace period
async function handleLeave(io, code, name) {
  if (!code || !name) return;

  const room = await Room.findOneAndUpdate(
    { code },
    { $pull: { members: name } },
    { new: true }
  );

  if (!room) return;

  io.to(code).emit("user_left", { name, members: room.members });

  if (room.members.length === 0) {
    // Cancel any existing timer for this room first
    cancelShutdown(code);

    const timer = setTimeout(async () => {
      shutdownTimers.delete(code);
      const check = await Room.findOne({ code });
      if (check && check.members.length === 0) {
        await Room.deleteOne({ code });
        io.to(code).emit("room_shutdown", { reason: "Everyone left. The fire went out." });
      }
    }, 8000);

    shutdownTimers.set(code, timer);
  }
}

module.exports = (io) => {
  io.on("connection", (socket) => {

    socket.on("join_room", async ({ code, name }) => {
      socket.join(code);
      socket.data.name = name;
      socket.data.room = code;

      const room = await Room.findOne({ code });
      if (!room) {
        socket.emit("room_shutdown", { reason: "This room no longer exists." });
        return;
      }

      if (!room.members.includes(name)) {
        room.members.push(name);
        await room.save();
      }

      socket.emit("room_history", room.messages);
      socket.emit("room_polls", room.polls);

      // Cancel any pending shutdown timer — someone is joining
      cancelShutdown(code);

      const updated = await Room.findOne({ code });
      // Send full member list to everyone in the room including joiner
      io.to(code).emit("members_update", { members: updated.members });
      // Send join notification (for toast) only to others
      socket.to(code).emit("user_joined", { name, members: updated.members });
    });

    socket.on("send_message", async ({ code, sender, text, replyTo }) => {
      const msg = { id: uuidv4(), sender, text, type: "text", reactions: {}, replyTo: replyTo || null, timestamp: new Date() };
      await Room.findOneAndUpdate({ code }, { $push: { messages: msg } });
      io.to(code).emit("new_message", msg);
      socket.to(code).emit("typing_update", { name: sender, typing: false });
    });

    socket.on("send_image", async ({ code, sender, fileUrl }) => {
      const msg = { id: uuidv4(), sender, text: "", type: "image", fileUrl, reactions: {}, timestamp: new Date() };
      await Room.findOneAndUpdate({ code }, { $push: { messages: msg } });
      io.to(code).emit("new_message", msg);
    });

    socket.on("send_file", async ({ code, sender, fileUrl, fileName, fileType }) => {
      const msg = { id: uuidv4(), sender, text: "", type: "file", fileUrl, fileName, fileType, reactions: {}, timestamp: new Date() };
      await Room.findOneAndUpdate({ code }, { $push: { messages: msg } });
      io.to(code).emit("new_message", msg);
    });

    socket.on("delete_message", async ({ code, messageId, sender }) => {
      const room = await Room.findOne({ code });
      if (!room) return;
      const msg = room.messages.find((m) => m.id === messageId);
      if (!msg || msg.sender !== sender) return;
      await Room.findOneAndUpdate({ code }, { $pull: { messages: { id: messageId } } });
      io.to(code).emit("message_deleted", { messageId });
    });

    socket.on("edit_message", async ({ code, messageId, sender, newText }) => {
      const room = await Room.findOne({ code });
      if (!room) return;
      const msg = room.messages.find((m) => m.id === messageId);
      if (!msg || msg.sender !== sender || msg.type !== "text") return;
      
      await Room.findOneAndUpdate(
        { code, "messages.id": messageId },
        { 
          $set: { 
            "messages.$.text": newText,
            "messages.$.edited": true,
            "messages.$.editedAt": new Date()
          }
        }
      );
      
      io.to(code).emit("message_edited", { messageId, newText, editedAt: new Date() });
    });

    socket.on("react", async ({ code, messageId, emoji, name }) => {
      const room = await Room.findOne({ code });
      if (!room) return;
      const msg = room.messages.find((m) => m.id === messageId);
      if (!msg) return;
      const existing = msg.reactions.get(emoji) || [];
      if (existing.includes(name)) {
        await Room.findOneAndUpdate({ code, "messages.id": messageId }, { $pull: { [`messages.$.reactions.${emoji}`]: name } });
      } else {
        await Room.findOneAndUpdate({ code, "messages.id": messageId }, { $addToSet: { [`messages.$.reactions.${emoji}`]: name } });
      }
      const updated = await Room.findOne({ code });
      const updatedMsg = updated.messages.find((m) => m.id === messageId);
      io.to(code).emit("reaction_update", { messageId, reactions: Object.fromEntries(updatedMsg.reactions) });
    });

    socket.on("create_poll", async ({ code, question, options, createdBy }) => {
      const poll = { id: uuidv4(), question, options: options.map((text) => ({ text, votes: [] })), createdBy, createdAt: new Date() };
      await Room.findOneAndUpdate({ code }, { $push: { polls: poll } });
      const pollMsg = { id: uuidv4(), sender: createdBy, text: question, type: "poll", pollId: poll.id, reactions: {}, timestamp: new Date() };
      await Room.findOneAndUpdate({ code }, { $push: { messages: pollMsg } });
      io.to(code).emit("new_poll", poll);
      io.to(code).emit("new_message", pollMsg);
    });

    socket.on("vote_poll", async ({ code, pollId, optionIndex, name }) => {
      const room = await Room.findOne({ code });
      if (!room) return;
      const poll = room.polls.find((p) => p.id === pollId);
      if (!poll) return;
      poll.options.forEach((opt) => { opt.votes = opt.votes.filter((v) => v !== name); });
      poll.options[optionIndex].votes.push(name);
      await room.save();
      io.to(code).emit("poll_update", poll);
    });

    socket.on("typing", ({ code, name, typing }) => {
      socket.to(code).emit("typing_update", { name, typing });
    });

    socket.on("pin_message", async ({ code, messageId, sender }) => {
      const room = await Room.findOne({ code });
      if (!room || room.host !== sender) return;
      
      if (!room.pinnedMessages.includes(messageId)) {
        await Room.findOneAndUpdate({ code }, { $addToSet: { pinnedMessages: messageId } });
        io.to(code).emit("message_pinned", { messageId });
      }
    });

    socket.on("unpin_message", async ({ code, messageId, sender }) => {
      const room = await Room.findOne({ code });
      if (!room || room.host !== sender) return;
      
      await Room.findOneAndUpdate({ code }, { $pull: { pinnedMessages: messageId } });
      io.to(code).emit("message_unpinned", { messageId });
    });

    socket.on("kick_user", async ({ code, targetName, sender }) => {
      const room = await Room.findOne({ code });
      if (!room || room.host !== sender || targetName === sender) return;
      
      await Room.findOneAndUpdate({ code }, { $pull: { members: targetName } });
      io.to(code).emit("user_kicked", { name: targetName, by: sender });
      
      // Find and disconnect the kicked user's socket
      const sockets = await io.in(code).fetchSockets();
      for (const s of sockets) {
        if (s.data.name === targetName) {
          s.emit("kicked", { by: sender });
          s.leave(code);
        }
      }
    });

    socket.on("leave_room", async ({ code, name }) => {
      socket.leave(code);
      await handleLeave(io, code, name);
    });

    socket.on("disconnect", async () => {
      const { name, room } = socket.data;
      if (name && room) {
        io.to(room).emit("typing_update", { name, typing: false });
        await handleLeave(io, room, name);
      }
    });
  });
};
