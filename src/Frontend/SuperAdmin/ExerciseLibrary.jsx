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
  });
  const [editExercise, setEditExercise] = useState(null); 
  const [showEditModal, setShowEditModal] = useState(false);

  const openEditModal = (exercise) => {
    setEditExercise({ ...exercise, image_file: null });
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

      if (editExercise.image_file) {
        formData.append("image", editExercise.image_file);
      }

      await axios.put(`${API_URL}/api/exercises/${editExercise.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      fetchLocalExercises();
      setShowEditModal(false);
      setEditExercise(null);
    } catch (error) {
      console.error("Edit Error:", error.message);
    }
  };

  const fetchLocalExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises`);
      setLocalExercises(res.data);
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
      });
    } catch (err) {
      console.error("Add Error:", err.message);
    }
  };

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
      <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
        <div className="bg-white p-5 rounded-md w-[90%] max-w-md shadow-lg overflow-auto max-h-[85vh]">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Edit Exercise</h2>

          <input
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            placeholder="Name"
            value={editExercise.name}
            onChange={(e) => setEditExercise({ ...editExercise, name: e.target.value })}
          />
          <select
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            value={editExercise.level}
            onChange={(e) => setEditExercise({ ...editExercise, level: e.target.value })}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            placeholder="Muscle Group"
            value={editExercise.muscle_group}
            onChange={(e) => setEditExercise({ ...editExercise, muscle_group: e.target.value })}
          />
          <input
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            placeholder="Sub Target"
            value={editExercise.sub_target}
            onChange={(e) => setEditExercise({ ...editExercise, sub_target: e.target.value })}
          />
          <select
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            value={editExercise.exercise_type}
            onChange={(e) => setEditExercise({ ...editExercise, exercise_type: e.target.value })}
          >
            <option value="compound">Compound</option>
            <option value="isolation">Isolation</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <input
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            placeholder="Equipment"
            value={editExercise.equipment}
            onChange={(e) => setEditExercise({ ...editExercise, equipment: e.target.value })}
          />
          <textarea
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            placeholder="Instructions"
            value={editExercise.instructions}
            onChange={(e) => setEditExercise({ ...editExercise, instructions: e.target.value })}
          />
          <input
            type="file"
            accept="image/*"
            className="w-full mb-2 border px-2 py-1.5 rounded text-sm"
            onChange={(e) => setEditExercise({ ...editExercise, image_file: e.target.files[0] })}
          />

          <div className="flex justify-end gap-2 mt-3">
            <button
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
              onClick={handleEditExercise}
            >
              Save Changes
            </button>
            <button
              className="border px-3 py-1.5 rounded-md text-xs font-medium"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
          </div>
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
