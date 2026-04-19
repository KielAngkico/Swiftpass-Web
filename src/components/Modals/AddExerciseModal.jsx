import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config";

const ExerciseModal = ({ isOpen, onClose, onSave, mode = "add", initialData = null }) => {
  const defaultForm = {
    name: "",
    level: "",
    muscle_group: "",
    sub_target: "",
    exercise_type: "",
    equipment: "",
    instructions: "",
    image_file: null,
    image_url: null,
    alt_exercise_ids: [],
  };

  const [form, setForm] = useState(defaultForm);
  const [allExercises, setAllExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlts, setSelectedAlts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchExercises();
      if (mode === "edit" && initialData) {
        setForm({ ...defaultForm, ...initialData, image_file: null });
        setSelectedAlts(Array.isArray(initialData.alt_exercise_ids) ? initialData.alt_exercise_ids : []);
      } else {
        setForm(defaultForm);
        setSelectedAlts([]);
      }
      setSearchTerm("");
    }
  }, [isOpen, mode, initialData]);

  const fetchExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises`);
      setAllExercises(res.data);
    } catch (err) {
      console.error("Failed to fetch exercises:", err);
    }
  };

  const filteredExercises = allExercises.filter(
    (ex) =>
      ex.id !== initialData?.id &&
      (ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleAlt = (id) => {
    setSelectedAlts((prev) =>
      prev.includes(id) ? prev.filter((altId) => altId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    const altExercises = allExercises.filter((ex) => selectedAlts.includes(ex.id));
    onSave({ ...form, alt_exercise_ids: selectedAlts, alternatives: altExercises });
  };

  if (!isOpen) return null;

  const isEdit = mode === "edit";

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium text-gray-900">{isEdit ? "Edit Exercise" : "Add Exercise"}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? "Update the details of this exercise" : "Fill in the details to add a new exercise"}
            </p>
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
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Barbell Back Squat"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Level</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Muscle Group</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Quadriceps"
                  value={form.muscle_group}
                  onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Instructions</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Step-by-step instructions..."
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={10}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sub Target</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Glutes, Hamstrings"
                  value={form.sub_target}
                  onChange={(e) => setForm({ ...form, sub_target: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Exercise Type</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={form.exercise_type}
                  onChange={(e) => setForm({ ...form, exercise_type: e.target.value })}
                >
                  <option value="">Select type</option>
                  <option value="compound">Compound</option>
                  <option value="isolation">Isolation</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Equipment</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Barbell, Rack"
                  value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alternative Exercises</label>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-50">
                    {filteredExercises.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No exercises found</p>
                    ) : (
                      filteredExercises.map((ex) => (
                        <label
                          key={ex.id}
                          className="flex items-center gap-2 text-xs py-1.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAlts.includes(ex.id)}
                            onChange={() => toggleAlt(ex.id)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="flex-1 text-gray-900">{ex.name}</span>
                          <span className="text-gray-400">{ex.muscle_group}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedAlts.length > 0 && (
                    <p className="text-xs text-blue-600">{selectedAlts.length} selected</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <label className="block text-xs text-gray-500 self-start">Exercise Image</label>
              <div className="w-full aspect-square bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                {form.image_file ? (
                  <img src={URL.createObjectURL(form.image_file)} alt="Exercise" className="w-full h-full object-cover" />
                ) : form.image_url ? (
                  <img src={`${API_URL}${form.image_url}`} alt="Exercise" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No image uploaded</span>
                )}
              </div>
              <label className="cursor-pointer bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors w-full text-center">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image_file: e.target.files[0] })}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              onClick={handleSave}
            >
              {isEdit ? "Save Changes" : "Save Exercise"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseModal;