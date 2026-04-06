import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export function useSocket() {
  const socketRef = useRef(null);

  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, { autoConnect: false });
  }

  useEffect(() => {
    socketRef.current.connect();
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return socketRef.current;
}
