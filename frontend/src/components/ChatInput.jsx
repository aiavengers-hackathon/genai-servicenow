export default function ChatInput({
  message,
  setMessage,
  sendMessage,
}) {

  return (

    <div className="p-5 border-t border-slate-800 flex gap-3">

      <input
        value={message}

        onChange={(e) =>
          setMessage(e.target.value)
        }

        onKeyDown={(e) =>
          e.key === "Enter" &&
          sendMessage()
        }

        placeholder="Ask AI Service Desk..."

        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 outline-none"
      />

      <button
        onClick={sendMessage}

        className="bg-blue-600 hover:bg-blue-700 px-6 rounded-xl"
      >
        Send
      </button>

    </div>
  );
}