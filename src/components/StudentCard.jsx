// src/components/StudentCard.jsx

export default function StudentCard({ profile, jumpId }) {
  const paddedNumber = String(profile.number).padStart(3, "0");
  const classNumber = String(profile.class).replace("組", "");

  return (
    <div
      id={jumpId}
      style={{
        '--class-bg-color': `var(--color-class-${classNumber}-bg)`,
        '--class-border-color': `var(--color-class-${classNumber})`
      }}
      className={`
        /* レイアウト・サイズ */
        flex flex-col justify-between p-4 snap-start max-sm:min-h-30
        
        /* 背景・枠線 */
        bg-(--class-bg-color) bg-clip-padding 
        border-l-(length:--spacing-v-md) border-l-(--class-border-color) rounded-xl
        
        /* 影・アニメーション */
        shadow-(--shadow-card) transition-all duration-200 
        hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)
        motion-reduce:transition-none
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`
          inline-block rounded-full bg-white border border-border-soft font-bold leading-none text-text-main
          px-label-x py-v-xs shadow-(--shadow-label) text-[0.72rem]
        `}>
          {profile.class}
        </span>
        <span className="text-lg font-mono font-bold text-gray-500">
          {paddedNumber}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-extrabold leading-tight text-text-main">
          {profile.name}
        </h2>
        <p className="text-sm mt-0.5 italic text-text-sub">
          {profile.reading}
        </p>
      </div>
    </div>
  );
}