import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";

function RoomRedirect() {
  const { code } = useParams();
  const hasName = sessionStorage.getItem("campfire_name");
  
  // If user has a name, go to room directly
  if (hasName) {
    return <Room />;
  }
  
  // Otherwise, redirect to home with code in URL
  return <Navigate to={`/?join=${code}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<RoomRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
