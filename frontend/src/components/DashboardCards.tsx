interface DashboardCardProps {
  title: string;
  value: string;
  helper: string;
}

const DashboardCards = ({ title, value, helper }: DashboardCardProps) => {
  return (
    <div className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
        {title}
      </p>
      <h3 className="mt-3 break-words text-2xl font-semibold text-slate-900 sm:text-3xl">
        {value}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
};

export default DashboardCards;
