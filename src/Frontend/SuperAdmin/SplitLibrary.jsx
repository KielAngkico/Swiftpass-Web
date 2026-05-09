import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import SplitCard from "../../components/SplitCard";
import AddSplitModal from "../../components/Modals/AddSplitModal";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const ITEMS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "days_asc", label: "Days (Low-High)" },
  { value: "days_desc", label: "Days (High-Low)" },
];

const GENDER_TABS = ["All", "Unisex", "Male", "Female"];

const SplitLibrary = () => {
  const [splits, setSplits] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSplit, setEditSplit] = useState(null);
  const [viewSplit, setViewSplit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [genderFilter, setGenderFilter] = useState("All");
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
  const openEdit = (split) => { setModalOpen(false); setEditSplit(split); setTimeout(() => setModalOpen(true), 0); };
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

  const filteredSplits = splits
    .filter((s) => {
      const matchesSearch = s.split_name?.toLowerCase().includes(search.toLowerCase());
      const matchesGender =
        genderFilter === "All" ||
        (genderFilter === "Unisex" && (!s.target_gender || s.target_gender === "unisex")) ||
        s.target_gender === genderFilter.toLowerCase();
      return matchesSearch && matchesGender;
    })
    .sort((a, b) => {
      if (sort === "name_asc") return a.split_name.localeCompare(b.split_name);
      if (sort === "name_desc") return b.split_name.localeCompare(a.split_name);
      const aDays = a.workout_days || a.days?.length || 0;
      const bDays = b.workout_days || b.days?.length || 0;
      if (sort === "days_asc") return aDays - bDays;
      if (sort === "days_desc") return bDays - aDays;
      return 0;
    });

  const totalPages = Math.ceil(filteredSplits.length / ITEMS_PER_PAGE);
  const paginatedSplits = filteredSplits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setCurrentPage(1);
  };

  const handleGenderChange = (tab) => {
    setGenderFilter(tab);
    setCurrentPage(1);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Split Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create and manage workout splits for your clients</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text"
            placeholder="Search by split name..."
            value={search}
            onChange={handleSearchChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-56"
          />
          <select
            value={sort}
            onChange={handleSortChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {GENDER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleGenderChange(tab)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  genderFilter === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Create New Split
            </button>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {filteredSplits.length} {filteredSplits.length === 1 ? "split" : "splits"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="text-xs text-gray-400">Loading splits...</span>
          </div>
        ) : filteredSplits.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {splits.length === 0 ? "No splits created yet" : "No splits match your search"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {splits.length === 0 ? "Create your first workout split to get started" : "Try adjusting your filters"}
            </p>
            {splits.length === 0 && (
              <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                Create Your First Split
              </button>
            )}
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
                      {split.target_gender && split.target_gender !== "unisex" ? (
                        <span className="text-[11px] bg-purple-50 text-purple-600 border border-purple-100 rounded-full px-2 py-0.5">
                          {split.target_gender}
                        </span>
                      ) : (
                        <span className="text-[11px] bg-gray-50 text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
                          unisex
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
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
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