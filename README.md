<div align="center">

<img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png" width="80" alt="Campfire Logo" />

# Campfire

### Rooms that burn out.

Anonymous ephemeral chat rooms — create a room, share the code, talk in real-time.  
When everyone leaves, the room is gone. No accounts. No history. No trace.

<br/>

![License](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)

<br/>

![Backend](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

<br/>

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-Click%20Here-orange?style=for-the-badge&logo=vercel&logoColor=white)](https://anonymous-chat-mu.vercel.app)

</div>

---

## Features

| Feature | Description |
|---|---|
| E2E Encryption | Messages encrypted with AES-GCM 256-bit via Web Crypto API. Server never sees plaintext. |
| Real-time Chat | Instant messaging powered by Socket.io WebSockets |
| Ephemeral Rooms | Rooms auto-delete when the timer expires or all members leave |
| Anonymous | No signup, no accounts — just a name and a room code |
| Live Polls | Create polls inside rooms with real-time vote updates |
| Reactions | React to messages with 6 emoji reactions |
| Reply Threading | Quote and reply to specific messages |
| Image Sharing | Share images directly in the chat |
| Typing Indicators | See when others are typing in real-time |
| Toast Notifications | Join/leave/copy alerts with subtle sound notifications |
| Delete Messages | Delete your own messages for everyone |
| Password Rooms | Optional password protection for private rooms |
| Copy Room Code | One-click copy with toast confirmation |
| Share Link | Shareable direct room link |
| Mobile Responsive | Works on all screen sizes |

---

## Tech Stack

**Frontend**
- React 18 — UI framework
- Vite — Build tool
- React Router v6 — Client-side routing
- Socket.io Client — Real-time communication
- Web Crypto API — AES-GCM encryption (built-in browser API, no dependencies)
- Axios — HTTP client

**Backend**
- Node.js + Express — REST API server
- Socket.io — WebSocket server
- Mongoose — MongoDB ODM
- Multer — File uploads
- UUID — Room code generation

**Database**
- MongoDB Atlas — Cloud NoSQL database with TTL indexes for auto-expiring rooms
- Cloudinary — Cloud image storage for shared images

---

## Project Structure

```
Anonymous-Chat/
├── server/
│   ├── models/
│   │   └── Room.js             # MongoDB schema (rooms, messages, polls)
│   ├── routes/
│   │   └── rooms.js            # REST API routes
│   ├── socket/
│   │   └── handler.js          # Socket.io event handlers
│   ├── index.js                # Server entry point
│   └── package.json
│
└── client/
    └── src/
        ├── components/
        │   ├── MessageBubble.jsx
        │   ├── PollCard.jsx
        │   ├── PollModal.jsx
        │   ├── Toast.jsx
        │   └── TypingIndicator.jsx
        ├── hooks/
        │   ├── useCrypto.js
        │   ├── useSocket.js
        │   └── useToast.js
        ├── pages/
        │   ├── Home.jsx
        │   └── Room.jsx
        └── App.jsx
```

---

## Running Locally

**Prerequisites:** Node.js v18+, MongoDB local or Atlas URI

```bash
git clone https://github.com/noneedofthat/anonymous-chat.git
cd anonymous-chat
```

**Server**

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/campfire
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

**Client**

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`, server on `http://localhost:5000`.

---

## Deployment

| Service | Purpose | Free Tier |
|---|---|---|
| MongoDB Atlas | Database | 512MB free |
| Railway | Backend hosting | $5 credit/month |
| Vercel | Frontend hosting | Unlimited free |
| Cloudinary | Image storage | 25GB free |

**Railway (Backend) environment variables:**
```
PORT=5000
MONGO_URI=your_atlas_connection_string
CLIENT_URL=https://your-app.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Vercel (Frontend) environment variables:**
```
VITE_SERVER_URL=https://your-backend.up.railway.app
```

---

## How Encryption Works

1. On joining a room, your browser derives an AES-GCM 256-bit key from the room code using PBKDF2 (100,000 iterations)
2. Every message is encrypted with a random IV before being sent
3. The server stores and relays only ciphertext — it cannot read messages
4. Messages are decrypted locally in your browser using the same derived key
5. The `E2E` badge in the header confirms encryption is active

> Since the key is derived from the room code, anyone with the room code can decrypt messages. For a stronger model, asymmetric per-user keys would be required.

---

## How Rooms Work

- Rooms are created with a random 6-character alphanumeric code
- Rooms have a TTL (time-to-live) set at creation: 1h, 6h, 12h, 24h, or 48h
- MongoDB TTL indexes automatically delete expired rooms
- If all members leave, the room is deleted after an 8-second grace period
- Attempting to join a deleted room returns: *"This room doesn't exist or has already shut down."*

---

## Screenshots

| Join Room | Create Room |
|---|---|
| ![Join Room](screenshots/join-room.png) | ![Create Room](screenshots/create-room.png) |

| Poll | Image & Reactions |
|---|---|
| ![Poll](screenshots/poll.png) | ![Image and Reactions](screenshots/image-reactions.png) |

<div align="center">

![Members](screenshots/members.png)
*Members list view*

</div>

---

## License

MIT © 2026 — Built as a Full Stack Development mini project for B.Tech Computer Engineering, Semester 6.

---

<div align="center">
  <sub>Built with the MERN stack</sub>
</div>
