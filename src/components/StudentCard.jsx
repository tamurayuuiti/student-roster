// src/components/StudentCard.jsx

export default function StudentCard({ profile, jumpId }) {
  const paddedNumber = String(profile.number).padStart(3, "0");
  const classNumber = String(profile.class).replace("組", "");

  return (
    <div
      id={jumpId}
      className={`name-card class-${classNumber} bg-white shadow-md border border-gray-100 rounded-xl p-4 flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="class-label text-sm font-bold bg-gray-200 px-2 py-1 rounded">
          {profile.class}
        </span>
        <span className="text-lg font-mono font-bold text-gray-500">{paddedNumber}</span>
      </div>
      <div>
        <h2 className="text-xl font-extrabold leading-tight">
          {profile.name}
        </h2>
        <p className="text-sm mt-0.5 italic text-gray-600">
          {profile.reading}
        </p>
      </div>
    </div>
  );
}