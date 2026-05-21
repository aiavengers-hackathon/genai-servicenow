export default function TypingIndicator() {

  return (
    <div className="flex gap-2 p-4">

      <div className="w-3 h-3 bg-slate-400 rounded-full animate-bounce"></div>

      <div className="w-3 h-3 bg-slate-400 rounded-full animate-bounce delay-100"></div>

      <div className="w-3 h-3 bg-slate-400 rounded-full animate-bounce delay-200"></div>

    </div>
  );
}