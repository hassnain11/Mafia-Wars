import { Countdown } from './Countdown';

export function PhaseHeader({
  title,
  subtitle,
  endsAt,
}: {
  title: string;
  subtitle?: string;
  endsAt: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
      <Countdown endsAt={endsAt} />
    </div>
  );
}
