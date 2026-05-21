export default function IncidentCard({
  details,
  onConfirm,
  onCancel,
}) {

  return (

    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 my-4 max-w-2xl">

      <h2 className="text-xl font-bold mb-4">
        Incident Preview
      </h2>

      <div className="space-y-2 text-slate-300">

        <p>
          <strong>Category:</strong>
          {" "}
          {details.category}
        </p>

        <p>
          <strong>Subcategory:</strong>
          {" "}
          {details.subcategory}
        </p>

        <p>
          <strong>Assignment Group:</strong>
          {" "}
          {details.assignment_group}
        </p>

        <p>
          <strong>Configuration Item:</strong>
          {" "}
          {details.configuration_item}
        </p>

      </div>

      <div className="flex gap-3 mt-6">

        <button
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl"
        >
          Confirm
        </button>

        <button
          onClick={onCancel}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl"
        >
          Cancel
        </button>

      </div>

    </div>
  );
}