import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config";

const AddSplitModal = ({ isOpen, onClose, onSplitAdded }) => {
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
    if (isOpen) {
      fetchExercises();
      resetForm();
    }
  }, [isOpen]);

  const fetchExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises`);
      setExercises(res.data);
    } catch {
      setError("Failed to load exercises");
    }
  };

  const resetForm = () => {
    setStep(1);
    setSplitForm({ split_name: "", target_gender: "unisex", num_days: 1, days: [] });
    setDayFilters({});
    setDaySearches({});
    setError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSplitForm(prev => ({ ...prev, [name]: value }));
  };

  const createDays = () => {
    if (!splitForm.split_name.trim()) {
      setError("Please enter a split name");
      return;
    }
    const days = Array.from({ length: splitForm.num_days }, (_, i) => ({
      day_title: `Day ${i + 1}`,
      exercises: []
    }));
    setSplitForm(prev => ({ ...prev, days }));
    const filters = {};
    const searches = {};
    for (let i = 0; i < splitForm.num_days; i++) {
      filters[i] = "";
      searches[i] = "";
    }
    setDayFilters(filters);
    setDaySearches(searches);
    setStep(2);
  };

  const toggleExercise = (dayIndex, exercise) => {
    setSplitForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i === dayIndex) {
          const exists = day.exercises.find(ex => ex.id === exercise.id);
          if (exists) {
            return { ...day, exercises: day.exercises.filter(ex => ex.id !== exercise.id) };
          } else {
            return { 
              ...day, 
              exercises: [...day.exercises, { 
                ...exercise, 
                sets: 3, 
                reps: "8-12", 
                rest_time: "60", 
                notes: "" 
              }] 
            };
          }
        }
        return day;
      })
    }));
  };

  const getFilteredExercises = (dayIndex) => {
    let filtered = exercises;
    const muscleFilter = dayFilters[dayIndex];
    if (muscleFilter) filtered = filtered.filter(ex => ex.muscle_group === muscleFilter);
    const search = daySearches[dayIndex];
    if (search) filtered = filtered.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));
    return filtered;
  };

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

      await axios.post(`${API_URL}/api/splits`, payload);
      onSplitAdded?.();
      onClose();
    } catch {
      setError("Failed to create split");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
<div
  className="fixed inset-0 flex items-center justify-center  z-50 p-4"
  onClick={onClose}
>
  <div
    className="bg-white p-6 rounded-md shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    onClick={(e) => e.stopPropagation()}
  >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add New Split</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

{step === 1 && (
  <form className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input
        type="text"
        name="split_name"
        placeholder="Split Name"
        value={splitForm.split_name}
        onChange={handleFormChange}
        className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        required
      />
      <select
        name="target_gender"
        value={splitForm.target_gender}
        onChange={handleFormChange}
        className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="unisex">Unisex</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      <input
        type="number"
        name="num_days"
        value={splitForm.num_days}
        onChange={(e) => setSplitForm(prev => ({ ...prev, num_days: Math.max(1, Math.min(7, parseInt(e.target.value) || 1)) }))}
        min="1"
        max="7"
        className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="border px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
        onClick={createDays}
      >
        Next
      </button>
    </div>
  </form>
)}


        {step === 2 && (
          <div className="space-y-4">
            {splitForm.days.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-gray-50 p-3 rounded-md border">
                <input
                  type="text"
                  value={day.day_title}
                  onChange={(e) => {
                    const days = [...splitForm.days];
                    days[dayIndex].day_title = e.target.value;
                    setSplitForm({ ...splitForm, days });
                  }}
                  className="w-full mb-2 p-2 border-b border-gray-300 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
                <div className="grid grid-cols-2 md:grid-col gap-2 max-h-36 overflow-y-auto border rounded-md p-2">
                  {getFilteredExercises(dayIndex).map(ex => {
                    const selected = !!day.exercises.find(d => d.id === ex.id);
                    return (
                      <label
                        key={ex.id}
                        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer text-xs transition-colors ${selected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-100 border-gray-200'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleExercise(dayIndex, ex)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{ex.name}</div>
                          <div className="text-gray-500 text-[10px]">{ex.muscle_group}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 mt-3">
              <button type="button" className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100" onClick={onClose}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Split"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddSplitModal;
