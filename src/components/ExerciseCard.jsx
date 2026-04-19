import React from "react";
import { API_URL } from "../config";

const ExerciseCard = ({ exercise, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Exercise Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">View full information for this exercise</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Exercise Name</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50">{exercise.name || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Level</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 capitalize">{exercise.level || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Muscle Group</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50">{exercise.muscle_group || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Instructions</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 whitespace-pre-wrap min-h-[10rem]">
                  {exercise.instructions || "No instructions provided."}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sub Target</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50">{exercise.sub_target || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Exercise Type</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 capitalize">{exercise.exercise_type || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Equipment</label>
                <p className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50">{exercise.equipment || "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alternative Exercises</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 min-h-[10rem] space-y-1.5">
                  {exercise.alternatives && exercise.alternatives.length > 0 ? (
                    exercise.alternatives.map((alt, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-xs text-gray-900">{alt.name}</span>
                        <span className="text-xs text-gray-400">{alt.muscle_group}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No alternatives assigned.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <label className="block text-xs text-gray-500 self-start">Exercise Image</label>
              <div className="w-full aspect-square bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                {exercise.image_url ? (
                  <img
                    src={`${API_URL}${exercise.image_url}`}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No image</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;