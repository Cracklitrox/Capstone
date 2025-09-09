// src/App.js
import React from "react";
import Login from "./pages/login";
import "./index.css"; // asegúrate de tener @tailwind base; @tailwind components; @tailwind utilities;

function App() {
  return (
    <div className="min-h-screen">
      <Login />
    </div>
  );
}

export default App;
