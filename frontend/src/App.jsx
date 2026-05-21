import { useState } from "react";
import axios from "axios";

export default function App() {

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function sendMessage(
    customMessage
  ) {

    const finalMessage =
      customMessage || message;

    if (!finalMessage) return;

    const userMessage = {
      sender: "user",
      text: finalMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setLoading(true);

    try {

      const response =
        await axios.post(
          "http://localhost:5000/api/chat",
          {
            message: finalMessage,
            userId: "user-1",
          }
        );

      const botMessage = {
        sender: "bot",
        text: response.data.reply,
      };

      setMessages((prev) => [
        ...prev,
        botMessage,
      ]);

    } catch (err) {

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            "Something went wrong.",
        },
      ]);
    }

    setLoading(false);

    setMessage("");
  }

  const suggestions = [
    "VPN is not working",
    "Need BAAMR access",
    "Reset password",
    "Outlook issue",
  ];

  return (

    <div
      style={{
        display: "flex",
        height: "100vh",
      }}
    >

      {/* SIDEBAR */}
      <div
        className="sidebar"
        style={{
          width: "280px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
        }}
      >

        {/* Logo */}
        <div
          style={{
            marginBottom: "40px",
          }}
        >

          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              background:
                "linear-gradient(135deg,#60a5fa,#a78bfa)",

              WebkitBackgroundClip:
                "text",

              WebkitTextFillColor:
                "transparent",
            }}
          >
            AI Service Desk
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "8px",
            }}
          >
            Enterprise ITSM Copilot
          </p>

        </div>

        {/* New Chat */}
        <button
          className="primary-button glow"
          style={{
            width: "100%",
            marginBottom: "30px",
          }}
        >
          + New Conversation
        </button>

        {/* Menu */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >

          {[
            "Conversations",
            "Incidents",
            "Requests",
            "Knowledge Base",
            "Analytics",
            "Settings",
          ].map((item) => (

            <div
              key={item}

              style={{
                padding: "14px",
                borderRadius: "14px",
                cursor: "pointer",
                transition: "0.2s",
                color: "#cbd5e1",
              }}

              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255,255,255,0.05)";
              }}

              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "transparent";
              }}
            >
              {item}
            </div>

          ))}

        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Powered by Azure OpenAI
        </div>

      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >

        {/* HEADER */}
        <div
          className="glass-card"

          style={{
            margin: "20px",
            padding: "18px 24px",
            display: "flex",
            justifyContent:
              "space-between",

            alignItems: "center",
          }}
        >

          <div>

            <h2
              style={{
                fontSize: "22px",
                fontWeight: "600",
              }}
            >
              AI IT Operations Assistant
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "4px",
              }}
            >
              Intelligent incident &
              request management
            </p>

          </div>

          <div
            className="glass-card"

            style={{
              padding:
                "10px 18px",
              fontSize: "14px",
            }}
          >
            ● Online
          </div>

        </div>

        {/* CHAT AREA */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding:
              "0 30px 20px 30px",
          }}
        >

          {/* Suggestions */}
          {messages.length === 0 && (

            <div
              style={{
                marginBottom: "30px",
              }}
            >

              <h3
                style={{
                  marginBottom: "16px",
                  color: "#cbd5e1",
                }}
              >
                Suggested Actions
              </h3>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >

                {suggestions.map(
                  (item) => (

                    <button
                      key={item}

                      onClick={() =>
                        sendMessage(item)
                      }

                      className="glass-card"

                      style={{
                        padding:
                          "14px 18px",

                        cursor:
                          "pointer",

                        border:
                          "none",

                        color:
                          "white",
                      }}
                    >
                      {item}
                    </button>

                  )
                )}

              </div>

            </div>

          )}

          {/* CHAT MESSAGES */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >

            {messages.map(
              (msg, index) => (

                <div
                  key={index}

                  style={{
                    display: "flex",

                    justifyContent:
                      msg.sender ===
                      "user"
                        ? "flex-end"
                        : "flex-start",
                  }}
                >

                  <div
                    className={
                      msg.sender ===
                      "user"
                        ? "user-message"
                        : "bot-message"
                    }

                    style={{
                      lineHeight:
                        "1.7",
                    }}
                  >
                    {msg.text}
                  </div>

                </div>

              )
            )}

            {/* Loading */}
            {loading && (

              <div
                className="bot-message"

                style={{
                  width: "120px",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                  }}
                >

                  <div className="typing-dot"></div>

                  <div className="typing-dot"></div>

                  <div className="typing-dot"></div>

                </div>

              </div>

            )}

          </div>

        </div>

        {/* INPUT AREA */}
        <div
          style={{
            padding: "24px",
          }}
        >

          <div
            className="glass-card"

            style={{
              display: "flex",
              gap: "14px",
              padding: "16px",
            }}
          >

            <input
              value={message}

              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }

              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage()
              }

              placeholder="Describe your issue or request..."

              className="input-modern"
            />

            <button
              onClick={() =>
                sendMessage()
              }

              className="primary-button glow"
            >
              Send
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}