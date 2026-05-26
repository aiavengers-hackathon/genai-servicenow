import React, { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import {
  ConversationProvider,
  useConversation,
} from "./context/ConversationContext";

import ChatPage from "./pages/ChatPage";
import RequestsPage from "./pages/RequestsPage";
import Layout from "./pages/Layout";

import { getUserId } from "./utils/helpers";

import "./index.css";

/**
 * APP CONTENT
 */
function AppContent() {

  const {
    setUser,
    setIsMobile,
  } = useConversation();

  /**
   * INITIALIZE APP
   */
  useEffect(() => {

    /**
     * USER ID
     */
    const userId =
      getUserId();

    setUser(userId);

    /**
     * MOBILE DETECTION
     */
    const checkMobile = () => {

      setIsMobile(
        window.innerWidth < 768
      );
    };

    checkMobile();

    window.addEventListener(
      "resize",
      checkMobile
    );

    return () => {

      window.removeEventListener(
        "resize",
        checkMobile
      );
    };

  }, [
    setUser,
    setIsMobile,
  ]);

  return (

    <BrowserRouter>

      <Layout>

        <Routes>

          {/* CHAT PAGE */}
          <Route
            path="/chat"
            element={<ChatPage />}
          />

          {/* REQUESTS PAGE */}
          <Route
            path="/requests"
            element={<RequestsPage />}
          />

        </Routes>

      </Layout>

    </BrowserRouter>
  );
}

/**
 * MAIN APP
 */
export default function App() {

  return (

    <ConversationProvider>

      <AppContent />

    </ConversationProvider>
  );
}