import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import ExerciseCard from "../../components/ExerciseCard";
import ExerciseModal from "../../components/Modals/AddExerciseModal";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const ExerciseLibrary = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const { showToast } = useToast();

  const fetchExercises = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/exercises`);
      setExercises(res.data);
    } catch (err) {
      console.error("Fetch Error:", err.message);
      showToast({ message: "Failed to fetch exercises", type: "error" });
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setModalInitialData(null);
    setModalOpen(true);
  };

  const openEditModal = (exercise) => {
    setModalMode("edit");
    setModalInitialData(exercise);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      const payload = new FormData();
      const fields = ["name", "level", "muscle_group", "sub_target", "exercise_type", "equipment", "instructions"];
      fields.forEach((key) => payload.append(key, formData[key] ?? ""));
      payload.append("created_by", 1);
      payload.append("alt_exercise_ids", JSON.stringify(formData.alt_exercise_ids ?? []));
      if (formData.image_file) payload.append("image", formData.image_file);

      if (modalMode === "edit" && modalInitialData?.id) {
        await axios.put(`${API_URL}/api/exercises/${modalInitialData.id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast({ message: "Exercise updated successfully!", type: "success" });
      } else {
        await axios.post(`${API_URL}/api/exercises`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast({ message: "Exercise added successfully!", type: "success" });
      }

      fetchExercises();
      setModalOpen(false);
      setModalInitialData(null);
    } catch (err) {
      console.error("Save Error:", err.message);
      showToast({ message: "Failed to save exercise", type: "error" });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Exercise Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and customize your exercise collection</p>
        </div>

<div className="flex justify-between items-center mb-3">
  <button
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
    onClick={openAddModal}
  >
    Add Exercise
  </button>

  <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
    {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
  </span>
</div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
            >
              {ex.image_url ? (
                <img
                  src={`${API_URL}${ex.image_url}`}
                  alt={ex.name}
                  className="w-full h-36 object-cover rounded-lg mb-3"
                />
              ) : (
                <div className="w-full h-36 bg-gray-50 border border-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-xs text-gray-400">No image</span>
                </div>
              )}

              <p className="text-xs font-medium text-gray-900 capitalize line-clamp-1 mb-1">{ex.name}</p>

              <div className="flex flex-wrap gap-1 mb-3">
                {ex.muscle_group && (
                  <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                    {ex.muscle_group}
                  </span>
                )}
                {ex.level && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">
                    {ex.level}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 line-clamp-2 mb-2">{ex.instructions}</p>

              <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                <button
                  className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                  onClick={() => setSelectedExercise(ex)}
                >
                  View
                </button>
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  onClick={() => openEditModal(ex)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ExerciseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalInitialData(null); }}
        onSave={handleSave}
        mode={modalMode}
        initialData={modalInitialData}
      />

      {selectedExercise && (
        <ExerciseCard exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
};

export default ExerciseLibrary;