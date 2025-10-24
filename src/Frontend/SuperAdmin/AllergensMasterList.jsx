import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const Allergens = () => {
  const [allergens, setAllergens] = useState([]);
  const [newAllergen, setNewAllergen] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    fetchAllergens();
  }, []);

  const fetchAllergens = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/allergens`);
      setAllergens(res.data);
    } catch (err) {
      console.error("Error fetching allergens:", err);
showToast({ message: "Failed to fetch allergens", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAllergen.trim()) {
showToast({ message: "Please enter an allergen name", type: "error" });
      return;
    }

    try {
      await axios.post(`${API_URL}/api/allergens`, { name: newAllergen.trim() });
      setNewAllergen("");
      fetchAllergens();
showToast({ message: "Allergen added successfully!", type: "success" });
    } catch (err) {
      console.error("Error adding allergen:", err);
showToast({ message: "Failed to add allergen", type: "error" });
    }
  };

 const handleDelete = async (id, name) => {
  showConfirm(
    `Are you sure you want to delete "${name}"?`,
    async () => {
      try {
        await axios.delete(`${API_URL}/api/allergens/${id}`);
        fetchAllergens();
        showToast({ message: "Allergen deleted successfully!", type: "success" });
      } catch (err) {
        console.error("Error deleting allergen:", err);
        showToast({ message: "Failed to delete allergen", type: "error" });
      }
    }
  );
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Allergens Management</h1>
          <div className="text-sm text-gray-600">
            Total Allergens: <span className="font-semibold">{allergens.length}</span>
          </div>
        </div>

        {/* Add allergen form */}
        <div className="bg-white p-4 rounded shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-3">Add New Allergen</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergen}
              onChange={(e) => setNewAllergen(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter allergen name (e.g., Gluten, Dairy, Nuts)"
              className="flex-1 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              disabled={!newAllergen.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Add Allergen
            </button>
          </div>
        </div>

        {/* Allergen list */}
        <div className="bg-white rounded shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Current Allergens</h2>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <span className="mt-2 text-gray-600">Loading allergens...</span>
              </div>
            ) : allergens.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No allergens found</h3>
                <p className="text-gray-500">Add your first allergen using the form above.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allergens.map((allergen, index) => (
                    <div
                      key={allergen.id}
                      className="flex justify-between items-center border border-gray-200 p-3 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-3">#{index + 1}</span>
                        <span className="font-medium text-gray-800">{allergen.name}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(allergen.id, allergen.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                        title={`Delete ${allergen.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Allergens;