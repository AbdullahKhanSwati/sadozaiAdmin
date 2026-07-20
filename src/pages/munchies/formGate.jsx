import { Loader2 } from 'lucide-react';

// Shown by edit forms while the record is still loading (deep-link / refresh),
// or when the id doesn't exist once the store is ready.
export function EditGate({ id, existing, ready }) {
  if (!id || existing) return null;
  return (
    <div className="max-w-[720px] mx-auto py-24 flex flex-col items-center text-center text-ink-400">
      {ready ? (
        <div className="text-lg">This record no longer exists.</div>
      ) : (
        <><Loader2 className="w-7 h-7 animate-spin text-mun-500 mb-3" /><div className="text-sm">Loading…</div></>
      )}
    </div>
  );
}
