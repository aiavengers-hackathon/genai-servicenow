/**
 * REQUEST COMPONENTS
 * Components for service requests
 */

import React from "react";
import { Card, Badge } from "../common/CommonComponents";

/**
 * REQUEST CARD
 */
export function RequestCard({ request, onClick }) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{request.number}</h3>
            <Badge
              label={request.status}
              color={request.status === "Fulfilled" ? "green" : "blue"}
              size="sm"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{request.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200 text-xs">
        <div>
          <span className="text-gray-500">Category:</span>
          <p className="font-medium text-gray-900">{request.category}</p>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>
          <p className="font-medium text-gray-900">{request.status}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * REQUEST FORM
 */
export function RequestForm({ item, onSubmit, loading }) {
  const [formData, setFormData] = React.useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">{item.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{item.description}</p>

        {item.requiredFields?.map((field) => (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label}
            </label>
            {field.type === "text" && (
              <input
                type="text"
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {field.type === "textarea" && (
              <textarea
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {field.type === "select" && (
              <select
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select {field.label}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </Card>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
