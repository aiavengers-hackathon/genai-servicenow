export default function TicketTimeline({
  ticket,
}) {

  return (

    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mt-4 max-w-2xl">

      <h2 className="text-lg font-bold mb-4">
        Ticket Timeline
      </h2>

      <div className="space-y-4">

        <div>
          ✅ Ticket Created
        </div>

        <div>
          👨‍💻 Assigned to Team
        </div>

        <div>
          ⏳ In Progress
        </div>

      </div>

      <div className="mt-5 text-blue-400 font-bold">
        {ticket}
      </div>

    </div>
  );
}