import React, { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState(null);
  const [greet, setGreet] = useState(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then(setHealth);
    fetch("/api/greet")
      .then((res) => res.json())
      .then(setGreet);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">FastAPI + React Health Check</h1>
        <div className="mb-4">
          <strong>API Health:</strong> {health ? health.status : "Loading..."}
        </div>
        <div className="mb-4">
          <strong>DB Status:</strong> {health ? health.db : "Loading..."}
        </div>
        <div className="mb-4">
          <strong>Greeting:</strong> {greet ? greet.message : "Loading..."}
        </div>
      </div>
    </div>
  );
}

export default App;
