/**
 * COMMON COMPONENTS
 * Reusable UI components
 */

import React from "react";

/**
 * LOADING SPINNER
 */
export function LoadingSpinner({ size = "md", message = "Loading..." }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
      <span className="text-gray-600 text-sm">{message}</span>
    </div>
  );
}

/**
 * ERROR ALERT
 */
export function ErrorAlert({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <span className="text-red-600 text-xl flex-shrink-0">❌</span>
      <div className="flex-1">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-900 font-bold flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * SUCCESS ALERT
 */
export function SuccessAlert({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
      <span className="text-green-600 text-xl flex-shrink-0">✅</span>
      <div className="flex-1">
        <p className="text-green-700">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-green-600 hover:text-green-900 font-bold flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * INFO ALERT
 */
export function InfoAlert({ message }) {
  if (!message) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <span className="text-blue-600 text-xl flex-shrink-0">ℹ️</span>
      <div className="flex-1">
        <p className="text-blue-700">{message}</p>
      </div>
    </div>
  );
}

/**
 * BADGE
 */
export function Badge({ label, color = "gray", size = "md" }) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full font-medium inline-block`}>
      {label}
    </span>
  );
}

/**
 * BUTTON
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${variantClasses[variant]} ${sizeClasses[size]} rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * CARD
 */
export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * MODAL
 */
export function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${sizeClasses[size]} bg-white rounded-lg shadow-xl`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * DIVIDER
 */
export function Divider({ text = "" }) {
  if (!text) {
    return <hr className="my-4 border-gray-200" />;
  }

  return (
    <div className="flex items-center gap-4 my-4">
      <hr className="flex-1 border-gray-200" />
      <span className="text-gray-500 text-sm">{text}</span>
      <hr className="flex-1 border-gray-200" />
    </div>
  );
}
