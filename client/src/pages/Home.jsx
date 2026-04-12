import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("join");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [duration, setDuration] = useState("24");
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill room code from URL if present
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode) {
      setCode(joinCode.toUpperCase());
      setTab("join");
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return setError("Name and room code required.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/rooms/join", {
        code: code.toUpperCase(),
        name: name.trim(),
        password: password || undefined,
      });
      if (res.data.success) {
        sessionStorage.setItem("campfire_name", name.trim());
        navigate(`/room/${res.data.room.code}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong.";
      setError(msg === "Room not found" ? "This room doesn\'t exist or has already shut down." : msg);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !roomName.trim()) return setError("Name and room name required.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/rooms/create", {
        name: roomName.trim(),
        host: name.trim(),
        password: usePassword ? password : undefined,
        duration,
      });
      if (res.data.success) {
        sessionStorage.setItem("campfire_name", name.trim());
        navigate(`/room/${res.data.room.code}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong.";
      setError(msg === "Room not found" ? "This room doesn\'t exist or has already shut down." : msg);
    }
    setLoading(false);
  };

  return (
    <div className="home">
      <div className="home-bg">
        <div className="ember e1" />
        <div className="ember e2" />
        <div className="ember e3" />
        <div className="ember e4" />
        <div className="ember e5" />
      </div>

      <div className="home-center">
        <div className="logo">
          <span className="logo-icon">🔥</span>
          <h1>Campfire</h1>
          <p className="tagline">Rooms that burn out.</p>
        </div>

        <div className="card">
          <div className="tabs">
            <button
              className={tab === "join" ? "tab active" : "tab"}
              onClick={() => { setTab("join"); setError(""); }}
            >
              Join Room
            </button>
            <button
              className={tab === "create" ? "tab active" : "tab"}
              onClick={() => { setTab("create"); setError(""); }}
            >
              Create Room
            </button>
          </div>

          <div className="fields">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
            />

            {tab === "join" ? (
              <>
                <input
                  className="input code-input"
                  placeholder="Room code (e.g. AB12CD)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <input
                  className="input"
                  placeholder="Password (if required)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="Room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={40}
                />
                <div className="select-row">
                  <label>Burns out after</label>
                  <select
                    className="input select"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                  </select>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                  />
                  Password protect this room
                </label>
                {usePassword && (
                  <input
                    className="input"
                    placeholder="Set password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </>
            )}

            {error && <p className="error">{error}</p>}

            <button
              className="btn-primary"
              onClick={tab === "join" ? handleJoin : handleCreate}
              disabled={loading}
            >
              {loading ? "..." : tab === "join" ? "Enter Room →" : "Light the Fire →"}
            </button>
          </div>
        </div>

        <p className="footer-note">No accounts. No history. Everything gone when the fire dies.</p>
      </div>
    </div>
  );
}
