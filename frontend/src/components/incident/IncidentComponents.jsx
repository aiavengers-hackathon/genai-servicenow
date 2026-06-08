/**
 * INCIDENT COMPONENTS
 * Components for incident management
 */

import React from "react";
import { PRIORITY_LEVELS } from "../../constants/api";
import { Card, Badge } from "../common/CommonComponents";

/**
 * INCIDENT CARD
 */
export function IncidentCard({ incident, onClick }) {
  const priority = PRIORITY_LEVELS[`P${incident.priority}`];

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{priority.icon}</span>
            <h3 className="font-semibold text-gray-900">{incident.number}</h3>
            <Badge label={priority.label} color={incident.priority === 1 ? "red" : "yellow"} size="sm" />
          </div>
          <p className="text-sm text-gray-600 mt-2">{incident.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200 text-xs">
        <div>
          <span className="text-gray-500">Application:</span>
          <p className="font-medium text-gray-900">{incident.application}</p>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>
          <p className="font-medium text-gray-900">{incident.status}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * TICKET TIMELINE
 */
export function TicketTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-gray-500 text-sm">No events yet</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="relative flex flex-col items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            {index !== events.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
            )}
          </div>
          <div className="pb-4">
            <p className="font-medium text-gray-900">{event.title}</p>
            <p className="text-sm text-gray-600">{event.description}</p>
            <p className="text-xs text-gray-500 mt-1">{event.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * IMPACT INDICATOR
 */
export function ImpactIndicator({ impact, count }) {
  const colors = {
    INDIVIDUAL: { bg: "bg-green-100", text: "text-green-800", label: "Individual" },
    DEPARTMENT: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Department" },
    DIVISION: { bg: "bg-orange-100", text: "text-orange-800", label: "Division" },
    ENTERPRISE: { bg: "bg-red-100", text: "text-red-800", label: "Enterprise" },
  };

  const color = colors[impact] || colors.INDIVIDUAL;

  return (
    <div className={`${color.bg} ${color.text} px-3 py-2 rounded-lg inline-block`}>
      <p className="font-medium text-sm">{color.label}</p>
      {count && <p className="text-xs">{count} users affected</p>}
    </div>
  );
}
