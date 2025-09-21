import React from "react";

const AddExerciseModal = ({ isOpen, onClose, onSave, newExercise, setNewExercise }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-3 col-span-2">
              <input
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Exercise Name"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                required
              />
              <select
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={newExercise.level}
                onChange={(e) => setNewExercise({ ...newExercise, level: e.target.value })}
                required
              >
                <option value="">-- Select Level --</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Muscle Group"
                value={newExercise.muscle_group}
                onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
              />
              <input
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sub Target"
                value={newExercise.sub_target}
                onChange={(e) => setNewExercise({ ...newExercise, sub_target: e.target.value })}
              />
              <select
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={newExercise.exercise_type}
                onChange={(e) => setNewExercise({ ...newExercise, exercise_type: e.target.value })}
              >
                <option value="">-- Select Type --</option>
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <input
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Equipment"
                value={newExercise.equipment}
                onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
              />
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Instructions"
                value={newExercise.instructions}
                onChange={(e) => setNewExercise({ ...newExercise, instructions: e.target.value })}
                rows="3"
              />
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-60 h-60 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
                {newExercise.image_file ? (
                  <img
                    src={URL.createObjectURL(newExercise.image_file)}
                    alt="Exercise"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              <label className="cursor-pointer bg-blue-500 text-white text-xs px-4 py-2 rounded-md hover:bg-blue-600">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewExercise({ ...newExercise, image_file: e.target.files[0] })}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              onClick={onSave}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExerciseModal;
