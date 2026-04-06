require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sahilkasture1011_db_user:qGhZzFiIdFqCFcxg@anonymous-chat.doxfhtr.mongodb.net/anonymous-chat";

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/rooms", require("./routes/rooms"));

require("./socket/handler")(io);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error("DB Error:", err.message));
