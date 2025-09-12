import React from "react";

const ExerciseCard = ({ exercise, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#5E17EB]">{exercise.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 text-xl">
            ✖
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {exercise.image_url && (
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="w-full md:w-1/2 h-auto rounded-md object-cover"
            />
          )}
          <div className="md:w-1/2">
            <p><strong>Muscle Group:</strong> {exercise.muscle_group}</p>
            <p><strong>Sub Target:</strong> {exercise.sub_target}</p>
            <p><strong>Level:</strong> {exercise.level}</p>
            <p><strong>Type:</strong> {exercise.exercise_type}</p>
            <p><strong>Equipment:</strong> {exercise.equipment}</p>
            <div className="mt-3">
              <strong>Instructions:</strong>
              <p className="whitespace-pre-wrap">{exercise.instructions}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;
