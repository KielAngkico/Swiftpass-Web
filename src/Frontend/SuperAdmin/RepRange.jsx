import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { API_URL } from "../../config";

const RepRange = () => {
  const [repRanges, setRepRanges] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    body_goal: "",
    gender: "unisex",
    reps_low: "",
    reps_high: "",
  });

  useEffect(() => {
    fetchRepRanges();
  }, []);

  const fetchRepRanges = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rep-ranges`);
      if (Array.isArray(res.data)) {
        setRepRanges(res.data);
      } else {
        console.error("Unexpected rep ranges response:", res.data);
        setRepRanges([]);
      }
    } catch (err) {
      console.error("Error fetching rep ranges:", err);
      setRepRanges([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await axios.put(`${API_URL}/api/rep-ranges/${editing.id}`, formData);
      } else {
        await axios.post(`${API_URL}/api/rep-ranges`, formData);
      }
      setFormData({ body_goal: "", gender: "unisex", reps_low: "", reps_high: "" });
      setShowModal(false);
      setEditing(null);
      fetchRepRanges();
    } catch (err) {
      console.error("Error saving rep range:", err);
    }
  };

  const handleEdit = (range) => {
    setFormData(range);
    setEditing(range);
    setShowModal(true);
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <SuperAdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-black mb-6">📋 Rep Range Library</h1>

        {/* Add Rep Range Button */}
        <button
          className="bg-black text-white px-4 py-2 rounded-md mb-6 hover:bg-gray-900 transition"
          onClick={() => {
            setEditing(null);
            setFormData({ body_goal: "", gender: "unisex", reps_low: "", reps_high: "" });
            setShowModal(true);
          }}
        >
          ➕ Add Rep Range
        </button>

        {/* Rep Range Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repRanges.length ? (
            repRanges.map((range) => (
              <div
                key={range.id}
                className="bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold text-black mb-1">{range.body_goal}</h3>
                <p className="text-sm text-gray-600">Gender: {range.gender}</p>
                <p className="text-sm text-gray-600">
                  Reps: {range.reps_low} – {range.reps_high}
                </p>
                <button
                  className="mt-3 px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-900 transition"
                  onClick={() => handleEdit(range)}
                >
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No rep ranges found.</p>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 overflow-auto pt-10 pb-10">
            <div className="bg-white p-6 rounded-lg w-[90%] max-w-md shadow-lg">
              <h2 className="text-lg font-bold text-black mb-4">
                {editing ? "✏️ Edit Rep Range" : "➕ Add Rep Range"}
              </h2>

              <label className="block mb-1 font-semibold">Body Goal</label>
              <input
                type="text"
                name="body_goal"
                value={formData.body_goal}
                onChange={handleInputChange}
                className="input w-full mb-3 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g. Muscle Gain"
              />

              <label className="block mb-1 font-semibold">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="input w-full mb-3 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="unisex">Unisex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <label className="block mb-1 font-semibold">Reps Low</label>
                  <input
                    type="number"
                    name="reps_low"
                    value={formData.reps_low}
                    onChange={handleInputChange}
                    className="input w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-semibold">Reps High</label>
                  <input
                    type="number"
                    name="reps_high"
                    value={formData.reps_high}
                    onChange={handleInputChange}
                    className="input w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="border px-4 py-2 rounded hover:bg-gray-100"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
                  onClick={handleSubmit}
                >
                  {editing ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepRange;
