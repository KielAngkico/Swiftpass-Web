import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import SplitCard from "../../components/SplitCard";
import AddSplitModal from "../../components/Modals/AddSplitModal"; 
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const SplitLibrary = () => {
  const [splits, setSplits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewSplit, setViewSplit] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, showConfirm } = useToast();


  const fetchSplits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/splits`);
      console.log("✅ Splits response:", res.data);

      if (Array.isArray(res.data)) {
        setSplits(res.data);
      } else {
        console.warn("⚠️ Expected array, got:", res.data);
        setSplits([]);
      }
    } catch (err) {
showToast({ message: "Failed to fetch splits", type: "error" });
      setSplits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplits();
  }, []);


  const handleSplitAdded = () => {
    fetchSplits(); 
  };

const handleDeleteSplit = async (splitId) => {
  showConfirm(
    "Are you sure you want to delete this split?",
    async () => {
      try {
        await axios.delete(`${API_URL}/api/splits/${splitId}`);
        fetchSplits();
        showToast({ message: "Split deleted successfully!", type: "success" });
      } catch (error) {
        console.error("Failed to delete split:", error);
        showToast({ message: "Failed to delete split. Please try again.", type: "error" });
      }
    }
  );
};

return (
  <div className="flex min-h-screen bg-gray-50">
    <SuperAdminSidebar />

    <div className="flex-1 p-5">
      <div className="mb-3">
        <h1 className="text-2xl font-semibold text-gray-800">Split Library</h1>
        <p className="text-[11px] text-gray-600">
          Create and manage workout splits for your clients
        </p>
      </div>

      <div className="mb-3">
        <button
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium w-full sm:w-auto"
          onClick={() => setShowAddModal(true)}
        >
          + Create New Split
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-6">
          <div className="text-gray-500 text-xs">Loading splits...</div>
        </div>
      ) : splits.length === 0 ? (
        <div className="bg-white rounded border p-5 text-center text-xs">
          <div className="text-3xl mb-2">🏋️</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No splits created yet</h3>
          <p className="text-gray-600 mb-3">Create your first workout split to get started</p>
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            onClick={() => setShowAddModal(true)}
          >
            Create Your First Split
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-1 justify-center">
          {splits.map((split) => {
            const daysCount = split.workout_days || (split.days ? split.days.length : 0);
            const exerciseCount = split.days?.reduce(
              (total, day) => total + (day.exercises?.length || 0),
              0
            );

            return (
              <div
                key={split.id}
                className="bg-white rounded-md border p-1.5 hover:shadow transition-shadow text-[11px] space-y-1 max-w-[230px]"
              >
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                  {split.split_name}
                </h3>

                <div className="space-y-1 mb-1">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Days:</span>
                    <span className="text-gray-900">{daysCount}</span>
                  </div>

                  {split.days && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Exercises:</span>
                      <span className="text-gray-900">{exerciseCount}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-0.5 border-t pt-1.5">
                  <button
                    onClick={() => setViewSplit(split)}
                    className="flex-1 bg-gray-100 text-gray-700 py-1 rounded hover:bg-gray-200 transition-colors font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEditSplit(split)}
                    className="flex-1 bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSplit(split.id)}
                    className="flex-1 bg-red-500 text-white py-1 rounded hover:bg-red-600 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    <AddSplitModal
      isOpen={showAddModal}
      onClose={() => setShowAddModal(false)}
      onSplitAdded={handleSplitAdded}
    />

    {viewSplit && <SplitCard split={viewSplit} onClose={() => setViewSplit(null)} />}
  </div>
);

    };

export default SplitLibrary;