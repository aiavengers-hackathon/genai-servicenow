import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

/**
 * PARSE MESSAGE TEXT
 *
 * Handles cases where backend returns raw JSON string:
 * {"reply":"You already have an open request..."}
 * Extracts the reply value if JSON, otherwise returns as-is.
 */
function parseMessageText(text) {

  if (!text) return "";

  if (!text.trim().startsWith("{")) {
    return text;
  }

  try {
    const parsed = JSON.parse(text);

    if (parsed.reply) return parsed.reply;

    const firstString = Object.values(parsed)
      .find((v) => typeof v === "string");

    return firstString || text;

  } catch {
    return text;
  }
}

export default function ChatMessage({ message }) {

  const isUser =
    message.sender === "user";

  const displayText =
    parseMessageText(message.text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`
          max-w-2xl p-4 rounded-2xl mb-4
          ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-slate-800 border border-slate-700 text-slate-100"
          }
        `}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 whitespace-pre-wrap">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold">
                {children}
              </strong>
            ),
          }}
        >
          {displayText}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}