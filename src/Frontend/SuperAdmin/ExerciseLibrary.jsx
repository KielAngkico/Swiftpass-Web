import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import ExerciseCard from "../../components/ExerciseCard";
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
  setEditExercise({
    ...exercise,
    image_file: null 
  });
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
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <SuperAdminSidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-black mb-6">Exercise Library</h1>

        <button
          className="bg-black text-white px-4 py-2 rounded-md mb-6"
          onClick={() => setShowModal(true)}
        >
          ➕ Add Exercise
        </button>

        <h2 className="text-xl font-semibold text-gray-800 mb-4">Imported Exercises</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localExercises.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl shadow-md p-4">
              {ex.image_url && (
                <img
  src={`${API_URL}${localExercises[0]?.image_url}`}

/>

              )}
              <h3 className="text-md font-bold text-black mb-1 capitalize">{ex.name}</h3>
              <p className="text-sm text-gray-600">Muscle: {ex.muscle_group}</p>
              <p className="text-sm text-gray-600 mb-2">Level: {ex.level}</p>
              <div className="flex gap-3">
                <button
                  className="mt-2 px-3 py-1 bg-black text-white rounded text-sm"
                  onClick={() => setSelectedExercise(ex)}
                >
                  View Details
                </button>
                <button
                  className="mt-2 px-3 py-1 bg-black text-white rounded text-sm"
                  onClick={() => openEditModal(ex)}
                >
                  Edit
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ➕ Add Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-lg shadow-lg">
            <h2 className="text-lg font-bold text-[#5E17EB] mb-4">➕ Add Exercise</h2>

            <input
              className="w-full mb-3 border px-3 py-2 rounded"
              placeholder="Name"
              value={newExercise.name}
              onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            />
            <select
              className="w-full mb-3 border px-3 py-2 rounded"
              value={newExercise.level}
              onChange={(e) => setNewExercise({ ...newExercise, level: e.target.value })}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input
              className="w-full mb-3 border px-3 py-2 rounded"
              placeholder="Muscle Group"
              value={newExercise.muscle_group}
              onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
            />
            <input
              className="w-full mb-3 border px-3 py-2 rounded"
              placeholder="Sub Target"
              value={newExercise.sub_target}
              onChange={(e) => setNewExercise({ ...newExercise, sub_target: e.target.value })}
            />
            <select
              className="w-full mb-3 border px-3 py-2 rounded"
              value={newExercise.exercise_type}
              onChange={(e) => setNewExercise({ ...newExercise, exercise_type: e.target.value })}
            >
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <input
              className="w-full mb-3 border px-3 py-2 rounded"
              placeholder="Equipment"
              value={newExercise.equipment}
              onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
            />
            <textarea
              className="w-full mb-3 border px-3 py-2 rounded"
              placeholder="Instructions"
              value={newExercise.instructions}
              onChange={(e) => setNewExercise({ ...newExercise, instructions: e.target.value })}
            />
            <input
              type="file"
              accept="image/*"
              className="w-full mb-3 border px-3 py-2 rounded"
              onChange={(e) => setNewExercise({ ...newExercise, image_file: e.target.files[0] })}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button className="bg-[#5E17EB] text-white px-4 py-2 rounded" onClick={handleAddExercise}>
                Save
              </button>
              <button className="border px-4 py-2 rounded" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editExercise && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-lg w-[90%] max-w-lg shadow-lg overflow-auto max-h-[90vh]">
      <h2 className="text-lg font-bold text-black mb-4">Edit Exercise</h2>

      <input
        className="input w-full mb-3 border px-3 py-2 rounded"
        placeholder="Name"
        value={editExercise.name}
        onChange={(e) => setEditExercise({ ...editExercise, name: e.target.value })}
      />

      <select
        className="input w-full mb-3 border px-3 py-2 rounded"
        value={editExercise.level}
        onChange={(e) => setEditExercise({ ...editExercise, level: e.target.value })}
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      <input
        className="input w-full mb-3 border px-3 py-2 rounded"
        placeholder="Muscle Group"
        value={editExercise.muscle_group}
        onChange={(e) => setEditExercise({ ...editExercise, muscle_group: e.target.value })}
      />

      <input
        className="input w-full mb-3 border px-3 py-2 rounded"
        placeholder="Sub Target"
        value={editExercise.sub_target}
        onChange={(e) => setEditExercise({ ...editExercise, sub_target: e.target.value })}
      />

      <select
        className="input w-full mb-3 border px-3 py-2 rounded"
        value={editExercise.exercise_type}
        onChange={(e) => setEditExercise({ ...editExercise, exercise_type: e.target.value })}
      >
        <option value="compound">Compound</option>
        <option value="isolation">Isolation</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <input
        className="input w-full mb-3 border px-3 py-2 rounded"
        placeholder="Equipment"
        value={editExercise.equipment}
        onChange={(e) => setEditExercise({ ...editExercise, equipment: e.target.value })}
      />

      <textarea
        className="input w-full mb-3 border px-3 py-2 rounded"
        placeholder="Instructions"
        value={editExercise.instructions}
        onChange={(e) => setEditExercise({ ...editExercise, instructions: e.target.value })}
      />

      <input
        type="file"
        accept="image/*"
        className="input w-full mb-3 border px-3 py-2 rounded"
        onChange={(e) => setEditExercise({ ...editExercise, image_file: e.target.files[0] })}
      />

      <div className="flex justify-end gap-2 mt-4">
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={handleEditExercise}
        >
          Save Changes
        </button>
        <button
          className="border px-4 py-2 rounded"
          onClick={() => setShowEditModal(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


      {/* 🔍 View Exercise Modal */}
      {selectedExercise && (
        <ExerciseCard exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
};

export default ExerciseLibrary;
