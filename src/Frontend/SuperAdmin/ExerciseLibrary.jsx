import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import ExerciseCard from "../../components/ExerciseCard";
import AddExerciseModal from "../../components/Modals/AddExerciseModal";
import { API_URL } from "../../config";

const ExerciseLibrary = () => {
  const [localExercises, setLocalExercises] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null); 
  const [newExercise, setNewExercise] = useState({
    name: "",
    level: "beginner",
    muscle_group: "",
    sub_target: "",
    exercise_type: "compound",
    equipment: "",
    instructions: "",
    image_file: null,
    alt_exercise_ids: [],
  });
  const [editExercise, setEditExercise] = useState(null); 
  const [showEditModal, setShowEditModal] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlts, setSelectedAlts] = useState([]);

const openEditModal = (exercise) => {
  console.log("Opening edit modal for:", exercise);
  console.log("alt_exercise_ids:", exercise.alt_exercise_ids);
  console.log("alternatives:", exercise.alternatives);
  
  setEditExercise({ ...exercise, image_file: null });
  
  const altIds = Array.isArray(exercise.alt_exercise_ids) ? exercise.alt_exercise_ids : [];
  
  console.log("Setting selectedAlts to:", altIds);
  setSelectedAlts(altIds);
  setShowEditModal(true);
};

  const handleEditExercise = async () => {
    try {
      const formData = new FormData();
      formData.append("name", editExercise.name);
      formData.append("level", editExercise.level);
      formData.append("muscle_group", editExercise.muscle_group);
      formData.append("sub_target", editExercise.sub_target);
      formData.append("exercise_type", editExercise.exercise_type);
      formData.append("equipment", editExercise.equipment);
      formData.append("instructions", editExercise.instructions);
      formData.append("created_by", 1);
      formData.append("alt_exercise_ids", JSON.stringify(selectedAlts));

      if (editExercise.image_file) {
        formData.append("image", editExercise.image_file);
      }

      await axios.put(`${API_URL}/api/exercises/${editExercise.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      fetchLocalExercises();
      setShowEditModal(false);
      setEditExercise(null);
      setSelectedAlts([]);
      setSearchTerm("");
    } catch (error) {
      console.error("Edit Error:", error.message);
    }
  };

  const fetchLocalExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises`);
      setLocalExercises(res.data);
      setAllExercises(res.data);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    }
  };

  useEffect(() => {
    fetchLocalExercises();
  }, []);

  const handleAddExercise = async () => {
    try {
      const formData = new FormData();
      for (const key in newExercise) {
        if (key === "image_file" && newExercise[key]) {
          formData.append("image", newExercise[key]);
        } else if (key === "alt_exercise_ids") {
          formData.append(key, JSON.stringify(newExercise[key]));
        } else {
          formData.append(key, newExercise[key]);
        }
      }
      formData.append("created_by", 1);

      await axios.post(`${API_URL}/api/exercises`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      fetchLocalExercises();
      setShowModal(false);
      setNewExercise({
        name: "",
        level: "beginner",
        muscle_group: "",
        sub_target: "",
        exercise_type: "compound",
        equipment: "",
        instructions: "",
        image_file: null,
        alt_exercise_ids: [],
      });
    } catch (err) {
      console.error("Add Error:", err.message);
    }
  };

  const toggleAlt = (id) => {
    setSelectedAlts((prev) =>
      prev.includes(id) ? prev.filter((altId) => altId !== id) : [...prev, id]
    );
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.id !== editExercise?.id &&
    (ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Exercise Library</h1>
          <p className="text-gray-600 text-sm">
            Manage and customize your exercise collection
          </p>
        </div>

        <div className="mb-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium w-full sm:w-auto"
            onClick={() => setShowModal(true)}
          >
            + Add Exercise
          </button>
        </div>

        <h2 className="text-base font-medium text-gray-700 mb-3">Imported Exercises</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
          {localExercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-white rounded-md shadow-sm border p-2 h-72 flex flex-col"
            >
              {ex.image_url && (
                <img
                  src={`${API_URL}${ex.image_url}`}
                  alt={ex.name}
                  className="w-full h-40 object-cover rounded mb-2"
                />
              )}

              <h3 className="text-sm font-semibold text-gray-900 capitalize mb-1 line-clamp-1">
                {ex.name}
              </h3>

              <p className="text-xs text-gray-700">
                <span className="font-semibold">Muscle:</span> {ex.muscle_group}
              </p>
              <p className="text-xs text-gray-700 mb-1">
                <span className="font-semibold">Level:</span> {ex.level}
              </p>

              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {ex.instructions}
              </p>

              <div className="flex gap-1 mt-auto">
                <button
                  className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors text-xs font-medium"
                  onClick={() => setSelectedExercise(ex)}
                >
                  View
                </button>
                <button
                  className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                  onClick={() => openEditModal(ex)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AddExerciseModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleAddExercise}
          newExercise={newExercise}
          setNewExercise={setNewExercise}
        />
      )}

{showEditModal && editExercise && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
    <div
      className="bg-white p-6 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Edit Exercise</h2>
        <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1 */}
          <div className="space-y-3">
            <input
              className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              placeholder="Exercise Name"
              value={editExercise.name}
              onChange={(e) => setEditExercise({ ...editExercise, name: e.target.value })}
            />
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              value={editExercise.level}
              onChange={(e) => setEditExercise({ ...editExercise, level: e.target.value })}
            >
              <option value="">-- Select Level --</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input
              className="w-full p-2 border border-gray-300 rounded-md text-xs"
              placeholder="Muscle Group"
              value={editExercise.muscle_group}
              onChange={(e) => setEditExercise({ ...editExercise, muscle_group: e.target.value })}
            />
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-xs resize-none"
              placeholder="Instructions"
              value={editExercise.instructions}
              onChange={(e) => setEditExercise({ ...editExercise, instructions: e.target.value })}
              rows="14"
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-3">
            <input
              className="w-full p-2 border border-gray-300 rounded-md text-xs"
              placeholder="Sub Target"
              value={editExercise.sub_target}
              onChange={(e) => setEditExercise({ ...editExercise, sub_target: e.target.value })}
            />
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-xs"
              value={editExercise.exercise_type}
              onChange={(e) => setEditExercise({ ...editExercise, exercise_type: e.target.value })}
            >
              <option value="">-- Select Type --</option>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <input
              className="w-full p-2 border border-gray-300 rounded-md text-xs"
              placeholder="Equipment"
              value={editExercise.equipment}
              onChange={(e) => setEditExercise({ ...editExercise, equipment: e.target.value })}
            />

            {/* Alternative Exercises */}
            <div className="border border-gray-300 rounded-md p-3">
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Alternative Exercises (Optional)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md text-xs mb-2"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                {filteredExercises.length === 0 ? (
                  <p className="text-xs text-gray-400">No exercises found</p>
                ) : (
                  filteredExercises.map((ex) => (
                    <label
                      key={ex.id}
                      className="flex items-center gap-2 text-xs py-1 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAlts.includes(ex.id)}
                        onChange={() => toggleAlt(ex.id)}
                        className="w-4 h-4"
                      />
                      <span className="flex-1">{ex.name}</span>
                      <span className="text-gray-500 text-xs">{ex.muscle_group}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedAlts.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {selectedAlts.length} alternative(s) selected
                </p>
              )}
            </div>
          </div>

          {/* Column 3 (Image) */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-80 h-80 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
              {editExercise.image_file ? (
                <img
                  src={URL.createObjectURL(editExercise.image_file)}
                  alt="Exercise"
                  className="w-full h-full object-cover"
                />
              ) : editExercise.image_url ? (
                <img
                  src={`${API_URL}${editExercise.image_url}`}
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
                onChange={(e) => setEditExercise({ ...editExercise, image_file: e.target.files[0] })}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
            onClick={handleEditExercise}
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {selectedExercise && (
        <ExerciseCard exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
};

export default ExerciseLibrary;
