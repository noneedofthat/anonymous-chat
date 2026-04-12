import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import { deriveKey, encryptText, decryptText } from "../hooks/useCrypto";
import { useToast } from "../hooks/useToast";
import MessageBubble from "../components/MessageBubble";
import PollCard from "../components/PollCard";
import PollModal from "../components/PollModal";
import Toast from "../components/Toast";
import TypingIndicator from "../components/TypingIndicator";
import ImagePreview from "../components/ImagePreview";
import SearchBar from "../components/SearchBar";
import PinnedMessagesBar from "../components/PinnedMessagesBar";
import MentionDropdown from "../components/MentionDropdown";
import "./Room.css";

// Subtle notification sound using Web Audio API
function playNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { toasts, addToast, removeToast } = useToast();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState("");
  const [showPollModal, setShowPollModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("members");
  const [timeLeft, setTimeLeft] = useState("");
  const [typers, setTypers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [shutdown, setShutdown] = useState(null);
  const [previewFiles, setPreviewFiles] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionPosition, setMentionPosition] = useState({ bottom: 0, left: 0 });

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const docTitleRef = useRef(document.title);

  const myName = sessionStorage.getItem("campfire_name");

  useEffect(() => {
    if (code) deriveKey(code).then((key) => { cryptoKeyRef.current = key; });
  }, [code]);

  const decryptMsg = async (msg) => {
    if (!cryptoKeyRef.current || msg.type !== "text" || !msg.text) return msg;
    const plaintext = await decryptText(cryptoKeyRef.current, msg.text);
    return { ...msg, text: plaintext };
  };
  const decryptAll = async (msgs) => Promise.all(msgs.map(decryptMsg));

  // Track scroll position
  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(isBottom);
    if (isBottom) setUnread(0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnread(0);
  };

  useEffect(() => {
    if (!myName) { navigate("/"); return; }

    axios.get(`/api/rooms/${code}`).then((res) => {
      if (!res.data.success) { navigate("/"); return; }
      setRoom(res.data.room);
      setMembers(res.data.room.members || []);
      setPinnedMessages(res.data.room.pinnedMessages || []);
    }).catch(() => navigate("/"));

    socket.emit("join_room", { code, name: myName });

    socket.on("room_history", async (msgs) => {
      const decrypted = await decryptAll(msgs);
      setMessages(decrypted);
      setTimeout(scrollToBottom, 50);
    });

    socket.on("room_polls", (p) => setPolls(p));

    socket.on("room_shutdown", ({ reason }) => {
      setShutdown(reason || "The fire went out.");
      setTimeout(() => navigate("/"), 3500);
    });

    socket.on("members_update", ({ members }) => {
      if (members) setMembers(members);
    });

    socket.on("new_message", async (msg) => {
      const decrypted = await decryptMsg(msg);
      setMessages((prev) => [...prev, decrypted]);
      if (msg.sender !== myName) {
        playNotif();
        if (!atBottom) {
          setUnread((n) => n + 1);
          document.title = `(${unread + 1}) Campfire`;
        }
      }
    });

    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on("message_edited", async ({ messageId, newText, editedAt }) => {
      const decrypted = cryptoKeyRef.current ? await decryptText(cryptoKeyRef.current, newText) : newText;
      setMessages((prev) => prev.map((m) => 
        m.id === messageId ? { ...m, text: decrypted, edited: true, editedAt } : m
      ));
    });

    socket.on("message_pinned", ({ messageId }) => {
      setPinnedMessages((prev) => [...prev, messageId]);
    });

    socket.on("message_unpinned", ({ messageId }) => {
      setPinnedMessages((prev) => prev.filter(id => id !== messageId));
    });

    socket.on("user_kicked", ({ name, by }) => {
      if (name === myName) {
        setShutdown(`You were kicked by ${by}`);
        setTimeout(() => navigate("/"), 3000);
      } else {
        addToast(`${name} was kicked by ${by}`, "leave");
      }
    });

    socket.on("kicked", ({ by }) => {
      setShutdown(`You were kicked by ${by}`);
      setTimeout(() => navigate("/"), 3000);
    });

    socket.on("user_joined", ({ name, members }) => {
      if (members) setMembers(members);
      if (name !== myName) addToast(`${name} joined the campfire`, "join");
    });

    socket.on("user_left", ({ name, members }) => {
      if (members) setMembers(members);
      if (name && name !== myName) addToast(`${name} left`, "leave");
      setTypers((prev) => prev.filter((t) => t !== name));
    });

    socket.on("reaction_update", ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    });

    socket.on("new_poll", (poll) => setPolls((prev) => [...prev, poll]));
    socket.on("poll_update", (updated) => {
      setPolls((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    });

    socket.on("typing_update", ({ name, typing }) => {
      setTypers((prev) => {
        if (typing) return prev.includes(name) ? prev : [...prev, name];
        return prev.filter((t) => t !== name);
      });
    });

    return () => {
      socket.emit("leave_room", { code, name: myName });
      document.title = docTitleRef.current;
      ["room_history","room_polls","members_update","room_shutdown","new_message","message_deleted","message_edited","message_pinned","message_unpinned","user_joined","user_left","user_kicked","kicked","reaction_update","new_poll","poll_update","typing_update"].forEach(e => socket.off(e));
    };
  }, [code]);

  // Auto-scroll when at bottom
  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages]);

  // Update page title with unread count
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Campfire` : "Campfire";
  }, [unread]);

  // Reset unread when focused
  useEffect(() => {
    const onFocus = () => { setUnread(0); document.title = "Campfire"; };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Keyboard shortcut for search (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      const diff = new Date(room.expiresAt) - Date.now();
      if (diff <= 0) { setTimeLeft("Burned out"); clearInterval(interval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [room]);

  // Auto-resize textarea
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }

    // Detect @mention
    const cursorPos = ta.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      const rect = ta.getBoundingClientRect();
      setMentionPosition({ 
        bottom: window.innerHeight - rect.top + 10, 
        left: rect.left 
      });
      setMentionQuery("");
    } else if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (/^\w*$/.test(afterAt) && !afterAt.includes(" ")) {
        const rect = ta.getBoundingClientRect();
        setMentionPosition({ 
          bottom: window.innerHeight - rect.top + 10, 
          left: rect.left 
        });
        setMentionQuery(afterAt);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }

    // Typing indicator
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { code, name: myName, typing: true });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing", { code, name: myName, typing: false });
    }, 1500);
  };

  const handleMentionSelect = (member) => {
    if (!member) {
      setMentionQuery(null);
      return;
    }

    const ta = textareaRef.current;
    const cursorPos = ta.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = text.substring(cursorPos);
    
    const newText = text.substring(0, lastAtIndex + 1) + member + " " + textAfterCursor;
    setText(newText);
    setMentionQuery(null);
    
    setTimeout(() => {
      const newCursorPos = lastAtIndex + member.length + 2;
      ta.setSelectionRange(newCursorPos, newCursorPos);
      ta.focus();
    }, 0);
  };

  // Detect @mentions in text
  const getMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1];
      if (members.includes(name)) mentions.push(name);
    }
    return mentions;
  };

  const sendMessage = async () => {
    if (!text.trim() || !cryptoKeyRef.current) return;
    const encrypted = await encryptText(cryptoKeyRef.current, text.trim());
    const payload = { code, sender: myName, text: encrypted };
    if (replyTo) payload.replyTo = replyTo;
    socket.emit("send_message", payload);
    setText("");
    setReplyTo(null);
    isTypingRef.current = false;
    socket.emit("typing", { code, name: myName, typing: false });
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      addToast("Please select image files only", "error");
      return;
    }
    
    setPreviewFiles(imageFiles);
    e.target.value = "";
  };

  const handleSendImages = async () => {
    if (!previewFiles || previewFiles.length === 0) return;
    
    for (const file of previewFiles) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await axios.post("/api/rooms/upload", formData);
        if (res.data.success) {
          socket.emit("send_image", { code, sender: myName, fileUrl: res.data.url });
        }
      } catch {
        addToast(`Failed to upload ${file.name}`, "error");
      }
    }
    
    setPreviewFiles(null);
    addToast(`${previewFiles.length} image${previewFiles.length > 1 ? "s" : ""} sent`, "success");
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      addToast("Please drop image files only", "error");
      return;
    }
    
    setPreviewFiles(imageFiles);
  };

  // Paste handler
  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    
    if (imageItems.length === 0) return;
    
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
    if (files.length > 0) setPreviewFiles(files);
  };

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleReact = (messageId, emoji) => socket.emit("react", { code, messageId, emoji, name: myName });
  const handleVote = (pollId, optionIndex) => socket.emit("vote_poll", { code, pollId, optionIndex, name: myName });

  const handleBubbleAction = (id, second, type) => {
    if (type === "vote") handleVote(id, second);
    else handleReact(id, second);
  };

  const handleDelete = (messageId) => {
    socket.emit("delete_message", { code, messageId, sender: myName });
    addToast("Message deleted", "success");
  };

  const handleEdit = async (messageId, newText) => {
    if (!cryptoKeyRef.current) return;
    const encrypted = await encryptText(cryptoKeyRef.current, newText);
    socket.emit("edit_message", { code, messageId, sender: myName, newText: encrypted });
  };

  const handleSearchResult = (messageId) => {
    const targetMsg = document.querySelector(`[data-msg-id="${messageId}"]`);
    if (targetMsg) {
      targetMsg.scrollIntoView({ behavior: "smooth", block: "center" });
      targetMsg.style.animation = "highlightFlash 1s ease";
      setTimeout(() => { targetMsg.style.animation = ""; }, 1000);
    }
  };

  const handlePin = (messageId) => {
    socket.emit("pin_message", { code, messageId, sender: myName });
    addToast("Message pinned", "success");
  };

  const handleUnpin = (messageId) => {
    socket.emit("unpin_message", { code, messageId, sender: myName });
    addToast("Message unpinned", "success");
  };

  const handleKick = (targetName) => {
    if (window.confirm(`Kick ${targetName} from the room?`)) {
      socket.emit("kick_user", { code, targetName, sender: myName });
    }
  };

  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, sender: msg.sender, text: msg.text });
    textareaRef.current?.focus();
  };

  const handleCreatePoll = (question, options) => {
    socket.emit("create_poll", { code, question, options, createdBy: myName });
    setShowPollModal(false);
    addToast("Poll created", "success");
  };

  const handleLeave = () => {
    socket.emit("leave_room", { code, name: myName });
    navigate("/");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    addToast("Room code copied!", "success");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
    addToast("Room link copied!", "success");
  };

  if (shutdown) return (
    <div className="shutdown-screen">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.2" width="52" height="52"><path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11z"/></svg>
      <h2>The fire went out.</h2>
      <p>{shutdown}</p>
      <span className="shutdown-sub">Redirecting you home...</span>
    </div>
  );

  if (!room) return <div className="loading">
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="32" height="32"><path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11z"/></svg>
    Lighting the fire...
  </div>;

  return (
    <div 
      className="room-layout"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Toast toasts={toasts} removeToast={removeToast} />

      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>Drop images here</p>
          </div>
        </div>
      )}

      <header className="room-header">
        <div className="header-left">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="22" height="22"><path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11z"/></svg>
          <div>
            <button className="room-name-btn" onClick={() => setShowRoomInfo(!showRoomInfo)}>{room.name}</button>
            <button className="room-code" onClick={copyCode} title="Click to copy">
              {code}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="timer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timeLeft}
          </div>
          <div className="enc-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            E2E
          </div>
          <button className="icon-btn" onClick={() => setShowSearch(!showSearch)} title="Search (Ctrl+F)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => { setShowSidebar(!showSidebar); setShowRoomInfo(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            {members.length}
          </button>
          <button className="leave-btn" onClick={handleLeave}>Leave</button>
        </div>
      </header>

      {/* Room info panel */}
      {showRoomInfo && (
        <div className="room-info-bar">
          <div className="room-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Host: <strong>{room.host}</strong>
          </div>
          <div className="room-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Created: <strong>{new Date(room.createdAt).toLocaleString()}</strong>
          </div>
          <div className="room-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Members: <strong>{members.length}</strong>
          </div>
          <button className="share-link-btn" onClick={copyLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share link
          </button>
        </div>
      )}

      {showSearch && (
        <SearchBar 
          messages={messages} 
          onResultClick={handleSearchResult} 
          onClose={() => setShowSearch(false)} 
        />
      )}

      <PinnedMessagesBar 
        pinnedMessages={pinnedMessages}
        messages={messages}
        onJumpTo={handleSearchResult}
        onUnpin={handleUnpin}
        isHost={room?.host === myName}
      />

      <div className="room-body">
        <main className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
          {messages.length === 0 && (
            <div className="empty-chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" width="40" height="40"><path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11z"/></svg>
              <p>Fire's lit. Say something.</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              myName={myName}
              onReact={handleBubbleAction}
              onDelete={handleDelete}
              onReply={handleReply}
              onEdit={handleEdit}
              onPin={handlePin}
              onUnpin={handleUnpin}
              polls={polls}
              isHost={room?.host === myName}
              isPinned={pinnedMessages.includes(msg.id)}
            />
          ))}
          <TypingIndicator typers={typers.filter(t => t !== myName)} />
          <div ref={messagesEndRef} />
        </main>

        {/* Scroll to bottom button */}
        {!atBottom && (
          <button className="scroll-btn" onClick={scrollToBottom}>
            {unread > 0 && <span className="unread-badge">{unread}</span>}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        )}

        {showSidebar && (
          <aside className="sidebar">
            <div className="sidebar-tabs">
              <button className={sidebarTab === "members" ? "stab active" : "stab"} onClick={() => setSidebarTab("members")}>Members</button>
              <button className={sidebarTab === "polls" ? "stab active" : "stab"} onClick={() => setSidebarTab("polls")}>Polls</button>
            </div>
            {sidebarTab === "members" && (
              <ul className="member-list">
                {members.map((m) => (
                  <li key={m} className="member-item">
                    <div className="member-info">
                      <span className="member-dot" />
                      {m}
                      {m === room.host && <span className="host-badge">host</span>}
                      {m === myName && <span className="you-badge">you</span>}
                    </div>
                    {room?.host === myName && m !== myName && (
                      <button className="kick-btn" onClick={() => handleKick(m)} title="Kick user">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {sidebarTab === "polls" && (
              <div className="polls-list">
                {polls.length === 0 && <p className="no-polls">No polls yet.</p>}
                {polls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} myName={myName} onVote={handleVote} />
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="input-area">
        {mentionQuery !== null && (
          <MentionDropdown 
            members={members.filter(m => m !== myName)}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            position={mentionPosition}
          />
        )}
        
        {replyTo && (
          <div className="reply-bar">
            <div className="reply-preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
              <span className="reply-sender">{replyTo.sender}</span>
              <span className="reply-text">{replyTo.text?.substring(0, 60)}{replyTo.text?.length > 60 ? "…" : ""}</span>
            </div>
            <button className="reply-close" onClick={() => setReplyTo(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <div className="input-row">
          <button className="icon-btn" onClick={() => fileInputRef.current.click()} title="Share image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>
          <input type="file" ref={fileInputRef} style={{ display:"none" }} accept="image/*" multiple onChange={handleFileUpload} />
          <button className="icon-btn" onClick={() => setShowPollModal(true)} title="Create poll">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </button>
          <div className="textarea-wrap">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Say something..."
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={500}
            />
            {text.length > 400 && (
              <span className={`char-count ${text.length >= 490 ? "char-warn" : ""}`}>{500 - text.length}</span>
            )}
          </div>
          <button className="send-btn" onClick={sendMessage} disabled={!text.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
      </footer>

      {showPollModal && <PollModal onClose={() => setShowPollModal(false)} onCreate={handleCreatePoll} />}
      {previewFiles && (
        <ImagePreview 
          files={previewFiles} 
          onSend={handleSendImages} 
          onCancel={() => setPreviewFiles(null)} 
        />
      )}
    </div>
  );
}
