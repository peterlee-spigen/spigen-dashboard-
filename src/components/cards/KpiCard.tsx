interface KpiCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  sub?: string;
  highlight?: boolean;
  delta?: number | null;
}

export default function KpiCard({ label, value, unit, sub, highlight, delta }: KpiCardProps) {
  const display = value === null || value === undefined ? "—" : value;
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${
      highlight
        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
    }`}>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">
        {display}{unit && <span className="text-sm font-normal ml-1 text-neutral-500">{unit}</span>}
      </p>
      <div className="flex items-center gap-2">
        {sub && <p className="text-xs text-neutral-400">{sub}</p>}
        {delta !== null && delta !== undefined && (
          <span className={`text-xs font-medium ${delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            {delta >= 0 ? `▲ +${delta}%` : `▼ ${delta}%`}
          </span>
        )}
      </div>
    </div>
  );
}
