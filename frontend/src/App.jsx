import { useState } from "react";
import axios from "axios";

export default function App() {
  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  async function sendMessage() {
    if (!message) return;

    const userMessage = {
      sender: "user",
      text: message,
    };

    setMessages(prev => [
      ...prev,
      userMessage,
    ]);

    const response =
      await axios.post(
        "http://localhost:5000/api/chat",
        {
          message,
          userId: "user-1",
        }
      );

    const botMessage = {
      sender: "bot",
      text: response.data.reply,
    };

    setMessages(prev => [
      ...prev,
      botMessage,
    ]);

    setMessage("");
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0f172a",
        color: "white",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#111827",
          padding: "20px",
        }}
      >
        <h2>AI Service Desk</h2>

        <p>Enterprise AI Agent</p>
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Chat */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: "12px",
                padding: "14px",
                borderRadius: "12px",
                background:
                  msg.sender === "user"
                    ? "#2563eb"
                    : "#1e293b",
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "20px",
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: "none",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "14px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}