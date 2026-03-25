// src/components/StudentCard.jsx

export default function StudentCard({ profile, jumpId }) {
  const paddedNumber = String(profile.number).padStart(3, "0");
  const classNumber = String(profile.class).replace("組", "");

  return (
    <div
      id={jumpId}
      /* 1. ここで「このカードの基本色」を CSS 変数として定義する */
      style={{
        "--card-color": `var(--color-group-${classNumber})`
      }}
      className={`
        /* レイアウト */
        flex flex-col justify-between p-4 snap-start max-sm:min-h-30
        
        bg-(--card-color)/6
        border-l-8 border-l-(--card-color) rounded-xl
        
        /* 影・アニメーション */
        shadow-sm transition-all duration-200 
        hover:-translate-y-0.5 hover:shadow-lg
        motion-reduce:transition-none
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="inline-block rounded-full bg-white border border-slate-900/5 px-2.5 py-1 text-[0.72rem] font-bold leading-none text-slate-900 shadow-sm">
          {profile.class}
        </span>
        <span className="font-mono text-lg font-bold text-slate-600">
          {paddedNumber}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-extrabold leading-tight text-slate-900">
          {profile.name}
        </h2>
        <p className="text-sm mt-0.5 italic text-slate-600">
          {profile.reading}
        </p>
      </div>
    </div>
  );
}