import {
  AlertTriangle,
  FileText,
} from "lucide-react";

export default function Sidebar({
  incidents = [],
  requests = [],
}) {

  return (

    <div className="w-72 bg-slate-950 border-r border-slate-800 p-5 flex flex-col">

      {/* HEADER */}
      <div>

        <h1 className="text-2xl font-bold mb-8 text-white">
          GenAI ServiceNow
        </h1>

        <button className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-xl mb-8 text-white font-medium">
          + New Chat
        </button>

      </div>

      {/* INCIDENTS */}
      <div className="mb-8">

        <div className="flex items-center gap-3 mb-4 text-red-400 font-semibold">

          <AlertTriangle size={18} />

          <span>Incidents</span>

        </div>

        <div className="space-y-3">

          {incidents.length === 0 ? (

            <div className="text-slate-500 text-sm">
              No incidents raised
            </div>

          ) : (

            incidents.map((incident) => (

              <div
                key={incident.number}
                className="bg-slate-900 hover:bg-slate-800 transition cursor-pointer rounded-xl p-3 border border-slate-800"
              >

                <div className="text-sm font-semibold text-white">
                  {incident.number}
                </div>

                <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {incident.short_description}
                </div>

              </div>
            ))
          )}

        </div>

      </div>

      {/* REQUESTS */}
      <div>

        <div className="flex items-center gap-3 mb-4 text-blue-400 font-semibold">

          <FileText size={18} />

          <span>Requests</span>

        </div>

        <div className="space-y-3">

          {requests.length === 0 ? (

            <div className="text-slate-500 text-sm">
              No requests raised
            </div>

          ) : (

            requests.map((request) => (

              <div
                key={request.number}
                className="bg-slate-900 hover:bg-slate-800 transition cursor-pointer rounded-xl p-3 border border-slate-800"
              >

                <div className="text-sm font-semibold text-white">
                  {request.number}
                </div>

                <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {request.short_description}
                </div>

              </div>
            ))
          )}

        </div>

      </div>

    </div>
  );
}