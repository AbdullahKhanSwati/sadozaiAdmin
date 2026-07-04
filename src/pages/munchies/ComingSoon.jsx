import { Hammer } from 'lucide-react';

// Placeholder for Munchies sections that aren't built yet
// (Items, Employees, Customers, Sales by modifier, Taxes …).
export default function ComingSoon({ title = 'Coming soon' }) {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="bg-white rounded-md border border-slate-200 shadow-soft flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="w-16 h-16 rounded-2xl bg-mun-50 text-mun-600 flex items-center justify-center mb-4">
          <Hammer className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-semibold text-ink-800">{title}</h2>
        <p className="text-sm text-ink-400 mt-2 max-w-md">
          This section is coming soon. We&rsquo;re building it out next — check back shortly.
        </p>
      </div>
    </div>
  );
}
