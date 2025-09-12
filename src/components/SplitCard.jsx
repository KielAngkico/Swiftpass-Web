import React, { useState } from "react";
import ExerciseCard from "./ExerciseCard"; 

const SplitCard = ({ split, onClose }) => {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const days = split.days || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-black mb-4">{split.split_name} Details</h2>

        {days.length === 0 ? (
          <p>No days found for this split.</p>
        ) : (
          days.map((day) => (
            <div key={day.id || day.day_number} className="border-b border-gray-200 py-2">
              <h3 className="font-semibold">
                Day {day.day_number}: {day.day_title}
              </h3>

              <div className="flex flex-wrap gap-2 mt-1">
                {day.exercises && day.exercises.length > 0 ? (
                  day.exercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise(ex)}
                      className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-[#4b12c9]"
                    >
                      {ex.name}
                    </button>
                  ))
                ) : (
                  <p className="text-sm italic">No exercises</p>
                )}
              </div>
            </div>
          ))
        )}

        <button
          className="mt-6 px-4 py-2 bg-black text-white rounded"
          onClick={onClose}
        >
          Close
        </button>

        {/* Show ExerciseCard modal */}
        {selectedExercise && (
          <ExerciseCard
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SplitCard;
