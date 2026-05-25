export default function SuggestionChips({
  onSelect,
}) {

  const suggestions = [
    "VPN is not working",
    "Need BAAMR access",
    "Reset password",
    "Outlook issue",
  ];

  return (

    <div className="flex flex-wrap gap-3 mb-4">

      {suggestions.map((item) => (

        <button
          key={item}
          onClick={() => onSelect(item)}

          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl"
        >
          {item}
        </button>

      ))}

    </div>
  );
}