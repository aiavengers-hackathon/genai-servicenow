import {
  MessageSquare,
  AlertTriangle,
  FileText,
  BookOpen,
} from "lucide-react";

export default function Sidebar() {

  return (
    <div className="w-72 bg-slate-950 border-r border-slate-800 p-5">

      <h1 className="text-2xl font-bold mb-8">
        AI Service Desk
      </h1>

      <button className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl mb-8">
        + New Chat
      </button>

      <div className="space-y-4">

        <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer">
          <MessageSquare size={18} />
          Conversations
        </div>

        <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer">
          <AlertTriangle size={18} />
          Incidents
        </div>

        <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer">
          <FileText size={18} />
          Requests
        </div>

        <div className="flex items-center gap-3 text-slate-300 hover:text-white cursor-pointer">
          <BookOpen size={18} />
          Knowledge Base
        </div>

      </div>

    </div>
  );
}