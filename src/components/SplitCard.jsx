import React, { useState } from "react";
import ExerciseCard from "./ExerciseCard";

const SplitCard = ({ split, onClose }) => {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const days = split.days || [];
  const currentDay = days[activeDay];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-medium text-gray-900">{split.split_name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {days.length} {days.length === 1 ? "day" : "days"}
              {split.target_gender && split.target_gender !== "unisex" && <> &middot; {split.target_gender}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {days.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-xs text-gray-400">No days found for this split</p>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4 flex-shrink-0">
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex gap-1 overflow-x-auto">
                {days.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeDay === i
                        ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {day.day_title || `Day ${day.day_number || i + 1}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {currentDay && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                    <h3 className="text-xs font-medium text-gray-900">
                      {currentDay.day_title || `Day ${currentDay.day_number || activeDay + 1}`}
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                      {currentDay.exercises?.length || 0} exercises
                    </span>
                  </div>

                  {currentDay.exercises && currentDay.exercises.length > 0 ? (
                    <div className="flex flex-col gap-2">
{currentDay.exercises && currentDay.exercises.length > 0 ? (
  <div className="grid grid-cols-2 gap-1.5">
    {currentDay.exercises.map((ex, idx) => {
      const displayName = ex.exercise_name || ex.name || "Unknown Exercise";
      const displayId = ex.exercise_id || ex.id;
      return (
        <label
          key={displayId || idx}
          onClick={() => setSelectedExercise({ ...ex, id: displayId, name: displayName })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{displayName}</div>
            <div className="text-[10px] text-gray-400 truncate">{ex.muscle_group}</div>
          </div>
        </label>
      );
    })}
  </div>
) : (
  <p className="text-xs text-gray-400 italic">No exercises assigned</p>
)}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No exercises assigned</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
            Close
          </button>
        </div>
      </div>

      {selectedExercise && (
        <ExerciseCard exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
};

export default SplitCard;