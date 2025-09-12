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
    } catch (err) {
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

  const updateDayTitle = (dayIndex, title) => {
    setSplitForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) => 
        i === dayIndex ? { ...day, day_title: title } : day
      )
    }));
  };

  const updateExerciseDetails = (dayIndex, exerciseId, field, value) => {
    setSplitForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) => 
        i === dayIndex 
          ? {
              ...day,
              exercises: day.exercises.map(ex => 
                ex.id === exerciseId ? { ...ex, [field]: value } : ex
              )
            }
          : day
      )
    }));
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
    if (muscleFilter) {
      filtered = filtered.filter(ex => ex.muscle_group === muscleFilter);
    }
    
    const search = daySearches[dayIndex];
    if (search) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        (ex.muscle_group && ex.muscle_group.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
    } catch (err) {
      setError("Failed to create split");
    } finally {
      setLoading(false);
    }
  };

  const muscleGroups = [...new Set(exercises.map(ex => ex.muscle_group).filter(Boolean))].sort();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🏋️ Create New Split</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); createDays(); }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Split Name
                </label>
                <input 
                  type="text" 
                  name="split_name" 
                  value={splitForm.split_name} 
                  onChange={handleFormChange} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="e.g., Push/Pull/Legs"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Gender
                </label>
                <select 
                  name="target_gender" 
                  value={splitForm.target_gender} 
                  onChange={handleFormChange} 
                  className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all' 
                >
                  <option value="unisex">Unisex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of Workout Days
              </label>
              <input 
                type="number" 
                name="num_days" 
                value={splitForm.num_days || ""} 
                onChange={(e) => setSplitForm(prev => ({ ...prev, num_days: Math.max(1, Math.min(7, parseInt(e.target.value) || 1)) }))}
                min="1"
                max="7"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                required 
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Next: Add Exercises
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Add Exercises */}
        {step === 2 && (
          <div className="space-y-6">
            {splitForm.days.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={day.day_title}
                    onChange={(e) => updateDayTitle(dayIndex, e.target.value)}
                    className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2 py-1"
                  />
                  <span className="text-sm text-gray-500">
                    {day.exercises.length} exercises
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <select
                    value={dayFilters[dayIndex] || ""}
                    onChange={(e) => setDayFilters(prev => ({ ...prev, [dayIndex]: e.target.value }))}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Muscle Groups</option>
                    {muscleGroups.map(muscle => (
                      <option key={muscle} value={muscle}>{muscle}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={daySearches[dayIndex] || ""}
                    onChange={(e) => setDaySearches(prev => ({ ...prev, [dayIndex]: e.target.value }))}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

{/* Selected Exercises */}
{day.exercises.length > 0 && (
  <div className="mb-3">
    <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Exercises:</h4>
    <div className="space-y-2">
      {day.exercises.map((exercise) => (
        <div key={exercise.id} className="bg-white rounded-lg p-3 border flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium text-sm">{exercise.name}</span>
            <span className="text-xs text-gray-500 ml-2">({exercise.muscle_group})</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="1"
                max="10"
                value={exercise.sets}
                onChange={(e) => updateExerciseDetails(dayIndex, exercise.id, 'sets', parseInt(e.target.value) || 1)}
                className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500"
                title="Sets"
              />
              <span className="text-xs text-gray-500">sets</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={exercise.reps}
                onChange={(e) => updateExerciseDetails(dayIndex, exercise.id, 'reps', e.target.value)}
                className="w-16 px-1 py-1 border border-gray-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500"
                placeholder="8-12"
                title="Reps"
              />
              <span className="text-xs text-gray-500">reps</span>
            </div>

            <button
              onClick={() => toggleExercise(dayIndex, exercise)}
              className="text-red-500 hover:text-red-700 text-sm p-1"
              title="Remove exercise"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
                {/* Available Exercises */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {getFilteredExercises(dayIndex).map(exercise => {
                    const isSelected = !!day.exercises.find(ex => ex.id === exercise.id);
                    return (
                      <label 
                        key={exercise.id} 
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleExercise(dayIndex, exercise)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{exercise.name}</div>
                          <div className="text-xs text-gray-500">{exercise.muscle_group}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button 
                type="button" 
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
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