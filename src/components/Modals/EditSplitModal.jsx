import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config";

const EditSplitModal = ({ isOpen, onClose, onSplitUpdated, split }) => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [splitForm, setSplitForm] = useState({
    split_name: "",
    target_gender: "unisex",
    num_days: 1,
    days: []
  });

  const [dayFilters, setDayFilters] = useState({});
  const [daySearches, setDaySearches] = useState({});

  useEffect(() => {
    if (isOpen && split) {
      fetchExercises();
      populateForm(split);
      setError("");
      setStep(1);
    }
  }, [isOpen, split]);
const fetchExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises?limit=1000`);
      setExercises(res.data?.data || res.data);
    } catch {
      setError("Failed to load exercises");
    }
  };

  const populateForm = (split) => {
    const days = (split.days || []).map(day => ({
      day_title: day.day_title || `Day ${day.day_number}`,
      exercises: (day.exercises || []).map(ex => ({
        ...ex,
        sets: ex.sets || 3,
        reps: ex.reps || "8-12",
        rest_time: ex.rest_time || "60",
        notes: ex.notes || ""
      }))
    }));

    setSplitForm({
      split_name: split.split_name || "",
      target_gender: split.target_gender || "unisex",
      num_days: days.length || 1,
      days
    });

    const filters = {};
    const searches = {};
    for (let i = 0; i < days.length; i++) {
      filters[i] = "";
      searches[i] = "";
    }
    setDayFilters(filters);
    setDaySearches(searches);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSplitForm(prev => ({ ...prev, [name]: value }));
  };

  const applyDayCount = () => {
    if (!splitForm.split_name.trim()) {
      setError("Please enter a split name");
      return;
    }
    const count = Math.max(1, Math.min(7, Number(splitForm.num_days) || 1));
    const existing = splitForm.days;
    const days = Array.from({ length: count }, (_, i) => ({
      day_title: existing[i]?.day_title || `Day ${i + 1}`,
      exercises: existing[i]?.exercises || []
    }));
    setSplitForm(prev => ({ ...prev, days }));
    const filters = {};
    const searches = {};
    for (let i = 0; i < count; i++) {
      filters[i] = dayFilters[i] || "";
      searches[i] = daySearches[i] || "";
    }
    setDayFilters(filters);
    setDaySearches(searches);
    setError("");
    setStep(2);
  };

  const toggleExercise = (dayIndex, exercise) => {
    setSplitForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const exists = day.exercises.find(ex => ex.id === exercise.id);
        if (exists) {
          return { ...day, exercises: day.exercises.filter(ex => ex.id !== exercise.id) };
        }
        return {
          ...day,
          exercises: [...day.exercises, { ...exercise, sets: 3, reps: "8-12", rest_time: "60", notes: "" }]
        };
      })
    }));
  };

  const getFilteredExercises = (dayIndex) => {
    let filtered = exercises;
    if (dayFilters[dayIndex]) filtered = filtered.filter(ex => ex.muscle_group === dayFilters[dayIndex]);
    if (daySearches[dayIndex]) filtered = filtered.filter(ex => ex.name.toLowerCase().includes(daySearches[dayIndex].toLowerCase()));
    return filtered;
  };

  const muscleGroups = [...new Set(exercises.map(ex => ex.muscle_group).filter(Boolean))].sort();

  const handleSubmit = async () => {
    if (splitForm.days.some(day => day.exercises.length === 0)) {
      setError("Each day must have at least one exercise");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const payload = {
        split_name: splitForm.split_name,
        target_gender: splitForm.target_gender,
        workout_days: splitForm.days.length,
        days: splitForm.days.map((day, index) => ({
          day_number: index + 1,
          day_title: day.day_title,
          exercise_ids: day.exercises.map(ex => ex.id),
          exercise_details: day.exercises.map(ex => ({
            exercise_id: ex.id,
            sets: ex.sets,
            reps: ex.reps,
            rest_time: ex.rest_time,
            notes: ex.notes
          }))
        }))
      };
      await axios.put(`${API_URL}/api/splits/${split.id}`, payload);
      onSplitUpdated?.();
      onClose();
    } catch {
      setError("Failed to update split");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Edit Split</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? "Update split details" : `Edit exercises for ${splitForm.days.length} day${splitForm.days.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border ${step === 1 ? "bg-blue-600 text-white border-blue-600" : "bg-green-50 text-green-700 border-green-200"}`}>1</span>
              <div className={`w-8 h-px ${step === 2 ? "bg-blue-600" : "bg-gray-200"}`} />
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border ${step === 2 ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-400 border-gray-200"}`}>2</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg mb-4 text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Split Name</label>
                <input
                  type="text"
                  name="split_name"
                  placeholder="e.g. Push Pull Legs"
                  value={splitForm.split_name}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target Gender</label>
                <select
                  name="target_gender"
                  value={splitForm.target_gender}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unisex">Unisex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Number of Days (1–7)</label>
                <input
                  type="text"
                  name="num_days"
                  value={splitForm.num_days}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSplitForm(prev => ({ ...prev, num_days: Math.max(1, Math.min(7, val)) }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyDayCount}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {splitForm.days.map((day, dayIndex) => {
                const filtered = getFilteredExercises(dayIndex);
                return (
                  <div key={dayIndex} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <input
                        type="text"
                        value={day.day_title}
                        onChange={(e) => {
                          const days = [...splitForm.days];
                          days[dayIndex].day_title = e.target.value;
                          setSplitForm({ ...splitForm, days });
                        }}
                        className="text-xs font-medium text-gray-900 border-none outline-none bg-transparent w-40 focus:ring-1 focus:ring-blue-500 rounded px-1"
                      />
                      <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                        {day.exercises.length} selected
                      </span>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Search exercises..."
                        value={daySearches[dayIndex] || ""}
                        onChange={e => setDaySearches(prev => ({ ...prev, [dayIndex]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <select
                        value={dayFilters[dayIndex] || ""}
                        onChange={e => setDayFilters(prev => ({ ...prev, [dayIndex]: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All muscles</option>
                        {muscleGroups.map(mg => (
                          <option key={mg} value={mg}>{mg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-xs text-gray-400 col-span-2 py-2">No exercises found</p>
                      ) : (
                        filtered.map(ex => {
                          const selected = !!day.exercises.find(d => d.id === ex.id);
                          return (
                            <label
                              key={ex.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border text-xs transition-colors ${
                                selected
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleExercise(dayIndex, ex)}
                                className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{ex.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{ex.muscle_group}</div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); }}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditSplitModal;