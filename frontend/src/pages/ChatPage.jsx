/**
 * CHAT PAGE
 * Main chat interface
 */

import React, { useEffect, useRef } from "react";
import { useConversation, useChatMessage } from "../hooks/useConversation";
import {
  ChatMessage,
  TypingIndicator,
  SuggestionChips,
  ChatInput,
  KBArticleCard,
  IncidentConfirmation,
  IncidentResult,
  CatalogItem,
} from "../components/chat/ChatComponents";
import { ErrorAlert, Card, Button } from "../components/common/CommonComponents";
import { RESPONSE_TYPES, SUGGESTION_TOPICS } from "../constants/api";

export function ChatPage() {
  const { messages, loading, error, currentResponse, responseType, clearError } =
    useConversation();
  const { sendMessage } = useChatMessage();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (message) => {
    await sendMessage(message);
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Service Desk</h1>
        <p className="text-sm text-gray-600">
          Get help with incidents, requests, and more
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to AI Service Desk
            </h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Tell me about your issue, and I'll help you find solutions or create a ticket.
            </p>
            <SuggestionChips
              suggestions={SUGGESTION_TOPICS}
              onSelect={handleSuggestionClick}
            />
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}

            {/* Error Alert */}
            {error && (
              <div className="mb-4">
                <ErrorAlert error={error} onDismiss={clearError} />
              </div>
            )}

            {/* Response Based on Type */}
            {currentResponse && (
              <div className="mb-4">
                {responseType === RESPONSE_TYPES.KB_ARTICLES && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      📚 Suggested Solutions:
                    </h3>
                    {currentResponse.articles?.map((article, index) => (
                      <KBArticleCard
                        key={index}
                        article={article}
                        onRate={async () => {}}
                      />
                    ))}
                    <Card className="bg-blue-50 border-blue-200">
                      <p className="text-sm text-blue-900">
                        💡 Couldn't find what you need? Type "Still not working" to
                        create an incident.
                      </p>
                    </Card>
                  </div>
                )}

                {responseType === RESPONSE_TYPES.INCIDENT_CONFIRMATION && (
                  <IncidentConfirmation
                    incident={currentResponse.incident}
                    onConfirm={async () => {
                      // Handle confirm
                    }}
                    onCancel={() => {}}
                    loading={false}
                  />
                )}

                {responseType === RESPONSE_TYPES.INCIDENT_CREATED && (
                  <IncidentResult incident={currentResponse.tracking} />
                )}

                {responseType === RESPONSE_TYPES.SERVICE_REQUEST_OPTIONS && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      📋 Available Options:
                    </h3>
                    {currentResponse.catalogItems?.map((item, index) => (
                      <CatalogItem
                        key={index}
                        item={item}
                        onSelect={async () => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="mb-4">
                <TypingIndicator />
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <ChatInput onSend={handleSendMessage} disabled={false} loading={loading} />
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Describe your issue clearly for faster resolution
        </p>
      </div>
    </div>
  );
}
export default ChatPage;