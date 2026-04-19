import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import SplitCard from "../../components/SplitCard";
import AddSplitModal from "../../components/Modals/AddSplitModal";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const ITEMS_PER_PAGE = 12;

const SplitLibrary = () => {
  const [splits, setSplits] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSplit, setEditSplit] = useState(null);
  const [viewSplit, setViewSplit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast, showConfirm } = useToast();

  const fetchSplits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/splits`);
      setSplits(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast({ message: "Failed to fetch splits", type: "error" });
      setSplits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSplits(); }, []);

  const openAdd = () => { setEditSplit(null); setModalOpen(true); };
  const openEdit = (split) => { setEditSplit(split); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditSplit(null); };

  const handleSaved = () => { fetchSplits(); setCurrentPage(1); closeModal(); };

  const handleDelete = (splitId) => {
    showConfirm("Are you sure you want to delete this split?", async () => {
      try {
        await axios.delete(`${API_URL}/api/splits/${splitId}`);
        fetchSplits();
        showToast({ message: "Split deleted successfully!", type: "success" });
      } catch {
        showToast({ message: "Failed to delete split. Please try again.", type: "error" });
      }
    });
  };

  const totalPages = Math.ceil(splits.length / ITEMS_PER_PAGE);
  const paginatedSplits = splits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Split Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create and manage workout splits for your clients</p>
        </div>

<div className="flex justify-between items-center mb-3">
  <button
    onClick={openAdd}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
  >
    Create New Split
  </button>

  <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
    {splits.length} {splits.length === 1 ? "split" : "splits"}
  </span>
</div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="text-xs text-gray-400">Loading splits...</span>
          </div>
        ) : splits.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No splits created yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create your first workout split to get started</p>
            <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
              Create Your First Split
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {paginatedSplits.map((split) => {
                const daysCount = split.workout_days || (split.days ? split.days.length : 0);
                const exerciseCount = split.days?.reduce((total, day) => total + (day.exercises?.length || 0), 0);

                return (
                  <div key={split.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col hover:border-blue-400 hover:ring-1 hover:ring-blue-200 transition-all">
                    <h3 className="text-xs font-medium text-gray-900 line-clamp-2 mb-2">{split.split_name}</h3>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">
                        {daysCount} {daysCount === 1 ? "day" : "days"}
                      </span>
                      {split.days && (
                        <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                          {exerciseCount} exercises
                        </span>
                      )}
                      {split.target_gender && split.target_gender !== "unisex" && (
                        <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                          {split.target_gender}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                      <button onClick={() => setViewSplit(split)} className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
                        View
                      </button>
                      <button onClick={() => openEdit(split)} className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(split.id)} className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={page === currentPage ? "bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AddSplitModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSplitAdded={handleSaved}
        splitToEdit={editSplit}
      />

      {viewSplit && <SplitCard split={viewSplit} onClose={() => setViewSplit(null)} />}
    </div>
  );
};

export default SplitLibrary;