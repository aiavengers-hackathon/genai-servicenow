import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export default function ChatMessage({
  message,
}) {

  const isUser =
    message.sender === "user";

  return (

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}

      className={`flex ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >

      <div
        className={`
          max-w-2xl p-4 rounded-2xl mb-4
          ${
            isUser
              ? "bg-blue-600"
              : "bg-slate-800 border border-slate-700"
          }
        `}
      >

        <ReactMarkdown>
          {message.text}
        </ReactMarkdown>

      </div>

    </motion.div>
  );
}