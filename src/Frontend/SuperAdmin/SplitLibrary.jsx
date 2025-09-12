import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import SplitCard from "../../components/SplitCard";
import AddSplitModal from "../../components/Modals/AddSplitModal"; 
import { API_URL } from "../../config";

const SplitLibrary = () => {
  const [splits, setSplits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewSplit, setViewSplit] = useState(null);
  const [loading, setLoading] = useState(true);


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
      console.error("Failed to fetch splits:", err);
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
    if (window.confirm("Are you sure you want to delete this split?")) {
      try {
        await axios.delete(`${API_URL}/api/splits/${splitId}`);
        fetchSplits(); 
      } catch (error) {
        console.error("Failed to delete split:", error);
        alert("Failed to delete split. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <SuperAdminSidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">🏋️ Split Library</h1>
          <p className="text-gray-600">Create and manage workout splits for your clients</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Splits</h3>
            <p className="text-2xl font-bold text-black">{splits.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Male Focused</h3>
            <p className="text-2xl font-bold text-black">
              {splits.filter(s => s.target_gender === 'male').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Female Focused</h3>
            <p className="text-2xl font-bold text-black">
              {splits.filter(s => s.target_gender === 'female').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Unisex</h3>
            <p className="text-2xl font-bold text-black">
              {splits.filter(s => s.target_gender === 'unisex').length}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              onClick={() => setShowAddModal(true)}
            >
              <span>➕</span>
              <span>Create New Split</span>
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            {splits.length} split{splits.length !== 1 ? 's' : ''} total
          </div>
        </div>

        {/* Splits Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading splits...</div>
          </div>
        ) : splits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🏋️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No splits created yet</h3>
            <p className="text-gray-600 mb-6">Create your first workout split to get started</p>
            <button
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              onClick={() => setShowAddModal(true)}
            >
              Create Your First Split
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {splits.map((split) => {
              const daysCount = split.workout_days || (split.days ? split.days.length : 0);
              const genderColor = {
                male: 'bg-blue-100 text-blue-800',
                female: 'bg-pink-100 text-pink-800',
                unisex: 'bg-gray-100 text-gray-800'
              };

              return (
                <div
                  key={split.id}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-black line-clamp-2">
                      {split.split_name}
                    </h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setViewSplit(split)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleDeleteSplit(split.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete Split"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Days:</span>
                      <span className="font-semibold text-black">{daysCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Target:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${genderColor[split.target_gender] || genderColor.unisex}`}>
                        {split.target_gender}
                      </span>
                    </div>

                    {split.days && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Exercises:</span>
                        <span className="font-semibold text-black">
                          {split.days.reduce((total, day) => total + (day.exercises?.length || 0), 0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setViewSplit(split)}
                      className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      View Full Split
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Split Modal */}
      <AddSplitModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSplitAdded={handleSplitAdded}
      />

      {/* View Split Modal */}
      {viewSplit && (
        <SplitCard 
          split={viewSplit} 
          onClose={() => setViewSplit(null)} 
        />
      )}
    </div>
  );
};

export default SplitLibrary;