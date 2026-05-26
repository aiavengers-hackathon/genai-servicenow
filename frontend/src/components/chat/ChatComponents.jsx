/**
 * CHAT COMPONENTS
 * UI for chat interface
 */

import React from "react";
import { formatDate, getResponseIcon, truncate } from "../../utils/helpers";
import { Button, Badge, Card } from "../common/CommonComponents";

/**
 * PARSE MESSAGE TEXT
 *
 * Backend sometimes returns raw JSON string:
 * {"reply":"You already have an open request..."}
 * This extracts the reply value if JSON, otherwise returns as-is.
 */
function parseMessageText(text) {
  if (!text) return "";

  if (typeof text !== "string") return String(text);

  // Not JSON — return as-is
  if (!text.trim().startsWith("{")) return text;

  try {
    const parsed = JSON.parse(text);

    if (parsed.reply) return parsed.reply;
    if (parsed.message) return parsed.message;

    const firstString = Object.values(parsed).find(
      (v) => typeof v === "string"
    );

    return firstString || text;
  } catch {
    return text;
  }
}

/**
 * CHAT MESSAGE
 */
export function ChatMessage({ message }) {
  const isUser = message.sender === "user";
  const displayText = parseMessageText(message.text);

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">
          {displayText}
        </p>

        <p
          className={`text-xs mt-1 ${
            isUser ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {formatDate(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

/**
 * TYPING INDICATOR
 */
export function TypingIndicator() {
  return (
    <div className="flex gap-2 items-center">
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0s" }}
        />

        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        />

        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0.4s" }}
        />
      </div>

      <span className="text-xs text-gray-500">
        AI is thinking...
      </span>
    </div>
  );
}

/**
 * SUGGESTION CHIPS
 */
export function SuggestionChips({
  suggestions,
  onSelect,
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() =>
            onSelect(suggestion.text || suggestion)
          }
          className="
            px-3 py-2
            bg-gray-100
            hover:bg-blue-50
            border border-gray-200
            rounded-full
            text-sm
            text-gray-700
            hover:text-blue-600
            transition-colors
          "
        >
          <span className="mr-2">
            {suggestion.icon || "💡"}
          </span>

          {truncate(
            suggestion.text || suggestion,
            30
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * KB ARTICLE CARD
 */
export function KBArticleCard({
  article,
  onRate,
}) {
  const [rated, setRated] = React.useState(false);
  const [helpful, setHelpful] = React.useState(null);

  const handleRate = (isHelpful) => {
    setRated(true);
    setHelpful(isHelpful);

    onRate?.(article.id, isHelpful);
  };

  return (
    <Card className="mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            {article.title}
          </h4>

          <p className="text-sm text-gray-600 mt-1">
            {truncate(article.content, 150)}
          </p>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-blue-600
            hover:text-blue-900
            text-sm
            ml-2
            flex-shrink-0
          "
        >
          📖
        </a>
      </div>

      {!rated ? (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Was this helpful?
          </span>

          <button
            onClick={() => handleRate(true)}
            className="
              text-green-600
              hover:text-green-900
              text-sm
              font-medium
            "
          >
            👍 Yes
          </button>

          <button
            onClick={() => handleRate(false)}
            className="
              text-red-600
              hover:text-red-900
              text-sm
              font-medium
            "
          >
            👎 No
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
          ✓ Thank you for your feedback
        </div>
      )}
    </Card>
  );
}

/**
 * INCIDENT CONFIRMATION
 */
export function IncidentConfirmation({
  incident,
  onConfirm,
  onCancel,
  loading,
}) {
  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">
          ⚠️
        </span>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Create Incident?
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-gray-600">
                Title:
              </span>

              <span className="ml-2 font-medium">
                {truncate(incident.title, 50)}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Application:
              </span>

              <span className="ml-2 font-medium">
                {incident.application || "Unknown"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Priority:
              </span>

              <span className="ml-2 font-medium">
                P{incident.priority}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Impact:
              </span>

              <span className="ml-2 font-medium">
                {incident.impact}
              </span>
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="success"
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              ✓ Create Incident
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * INCIDENT RESULT
 */
export function IncidentResult({ incident }) {
  return (
    <Card className="bg-green-50 border-green-200">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✅</span>

        <div className="flex-1">
          <h3 className="font-semibold text-green-900">
            Incident Created
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-gray-600">
                Number:
              </span>

              <span className="ml-2 font-mono font-bold text-green-700">
                {incident.number}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Priority:
              </span>

              <span className="ml-2 font-medium">
                P{incident.priority}
              </span>
            </p>
          </div>

          <a
            href={incident.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-blue-600
              hover:text-blue-900
              text-sm
              mt-3
              inline-block
            "
          >
            View in ServiceNow →
          </a>
        </div>
      </div>
    </Card>
  );
}

/**
 * CATALOG ITEM
 */
export function CatalogItem({
  item,
  onSelect,
}) {
  return (
    <Card
      className="
        hover:border-blue-300
        hover:shadow-md
        transition-all
        cursor-pointer
      "
      onClick={() => onSelect?.(item)}
    >
      <h4 className="font-semibold text-gray-900">
        {item.name}
      </h4>

      <p className="text-sm text-gray-600 mt-1">
        {truncate(item.description, 100)}
      </p>

      <div className="flex items-center justify-between mt-3">
        <Badge
          label={item.category}
          color="blue"
          size="sm"
        />

        <span className="text-sm font-medium text-gray-900">
          {item.price || "N/A"}
        </span>
      </div>
    </Card>
  );
}

/**
 * CHAT INPUT
 */
export function ChatInput({
  onSend,
  disabled = false,
  loading = false,
}) {
  const [input, setInput] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      input.trim() &&
      !disabled &&
      !loading
    ) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <input
        type="text"
        value={input}
        onChange={(e) =>
          setInput(e.target.value)
        }
        placeholder="Type your question or issue..."
        disabled={disabled || loading}
        className="
          flex-1
          px-4 py-2
          border border-gray-300
          rounded-lg
          text-gray-900
          placeholder-gray-400
          bg-white
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          disabled:bg-gray-100
          disabled:text-gray-400
        "
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={
          disabled ||
          loading ||
          !input.trim()
        }
        loading={loading}
      >
        Send
      </Button>
    </form>
  );
}