import React from "react";

const ExerciseCard = ({ exercise, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Exercise Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-3 text-xs text-gray-700">
            <div>
              <label className="font-semibold block mb-1">Exercise Name</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50">{exercise.name || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Level</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50 capitalize">{exercise.level || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Muscle Group</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50">{exercise.muscle_group || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Instructions</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50 whitespace-pre-wrap min-h-[10rem]">
                {exercise.instructions || "No instructions provided."}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-gray-700">
            <div>
              <label className="font-semibold block mb-1">Sub Target</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50">{exercise.sub_target || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Type</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50 capitalize">{exercise.exercise_type || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Equipment</label>
              <p className="p-2 border border-gray-300 rounded-md bg-gray-50">{exercise.equipment || "—"}</p>
            </div>
            <div>
              <label className="font-semibold block mb-1">Alternative Exercises</label>
              <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-[10rem] space-y-1">
                {exercise.alternatives && exercise.alternatives.length > 0 ? (
                  exercise.alternatives.map((alt, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{alt.name}</span>
                      <span className="text-gray-500">{alt.muscle_group}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No alternatives assigned.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-80 h-80 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
              {exercise.image_url ? (
                <img
                  src={exercise.image_url}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-gray-400">No Image</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;

