import { useState } from "react";

import axios from "axios";

import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import TypingIndicator from "./components/TypingIndicator";
import SuggestionChips from "./components/SuggestionChips";
import ChatInput from "./components/ChatInput";

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

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: finalMessage,
      },
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

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.data.reply,
        },
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

  return (

    <div className="flex h-screen bg-slate-950 text-white">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <div className="flex-1 overflow-y-auto p-8">

          <SuggestionChips
            onSelect={sendMessage}
          />

          {messages.map((msg, index) => (

            <ChatMessage
              key={index}
              message={msg}
            />

          ))}

          {loading && (
            <TypingIndicator />
          )}

        </div>

        <ChatInput
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
        />

      </div>

    </div>
  );
}