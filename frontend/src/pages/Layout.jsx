/**
 * LAYOUT
 * Main application layout
 */

import React from "react";
import { useConversation } from "../hooks/useConversation";
import { Button } from "../components/common/CommonComponents";

export function Layout({ children }) {
  const { showSidebar, setShowSidebar, isMobile } = useConversation();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {(showSidebar || !isMobile) && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">ServiceNow AI</h1>
            <p className="text-xs text-gray-500 mt-1">Enterprise Service Desk</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <a
              href="/chat"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>💬</span>
              <span>Chat</span>
            </a>
            <a
              href="/incidents"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>🔴</span>
              <span>My Incidents</span>
            </a>
            <a
              href="/requests"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>📋</span>
              <span>My Requests</span>
            </a>
            <a
              href="/kb"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>📚</span>
              <span>Knowledge Base</span>
            </a>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
            <p>🎯 Resolution Rate: 87%</p>
            <p>⚡ Avg Response: 2.3s</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        {isMobile && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">ServiceNow AI</h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              ☰
            </Button>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
export default Layout;