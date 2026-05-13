import React, { useState, useEffect } from "react";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddFoodModal from "../../components/Modals/AddFoodModal";
import axios from "axios";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";

const FoodLibrary = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [editingFoodModal, setEditingFoodModal] = useState(null);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [allergenPage, setAllergenPage] = useState(1);
const allergensPerPage = 10;
  const categories = ["all", "Protein", "Carb", "Fruit", "Vegetable"];
  const [allergens, setAllergens] = useState([]);
  const [newAllergen, setNewAllergen] = useState("");
  const [loadingAllergens, setLoadingAllergens] = useState(true);
  const [editingAllergen, setEditingAllergen] = useState(null);
  const [editAllergenName, setEditAllergenName] = useState("");

  const { showToast, showConfirm } = useToast();

  const fetchFoodItems = async () => {
    try {
      setLoadingFoods(true);
      const response = await axios.get(`${API_URL}/api/food-database`);
      setFoodItems(response.data);
      setFilteredFoods(response.data);
    } catch (error) {
      console.error("Error fetching food items:", error);
      showToast({ message: "Failed to fetch food items", type: "error" });
    } finally {
      setLoadingFoods(false);
    }
  };

  const fetchAllergens = async () => {
    try {
      setLoadingAllergens(true);
      const res = await axios.get(`${API_URL}/api/allergens`);
      setAllergens(res.data);
    } catch (err) {
      console.error("Error fetching allergens:", err);
      showToast({ message: "Failed to fetch allergens", type: "error" });
    } finally {
      setLoadingAllergens(false);
    }
  };

  useEffect(() => {
    fetchFoodItems();
    fetchAllergens();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
    filterFoods(query, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    filterFoods(searchQuery, category);
  };

  const filterFoods = (query, category) => {
    let filtered = foodItems;
    if (query) {
      filtered = filtered.filter(
        (food) =>
          food.name.toLowerCase().includes(query.toLowerCase()) ||
          food.general_group.toLowerCase().includes(query.toLowerCase())
      );
    }
    if (category !== "all") {
      filtered = filtered.filter((food) => food.category === category);
    }
    setFilteredFoods(filtered);
  };

  const handleDeleteFood = async (foodId) => {
    showConfirm(
      "Are you sure you want to delete this food item?",
      async () => {
        try {
          await axios.delete(`${API_URL}/api/food-database/${foodId}`);
          fetchFoodItems();
          showToast({ message: "Food item deleted successfully!", type: "success" });
        } catch (error) {
          console.error("Error deleting food item:", error);
          showToast({ message: "Failed to delete food item", type: "error" });
        }
      }
    );
  };

  const startEditFood = (food) => {
    setEditingFood(food.id);
    setEditFoodForm({
      name: food.name,
      general_group: food.general_group,
      category: food.category,
      calories: food.calories ?? "",
      protein: food.protein ?? "",
      carbs: food.carbs ?? "",
      fats: food.fats ?? "",
      grams_reference: food.grams_reference || 100,
    });
  };

  const cancelEditFood = () => {
    setEditingFood(null);
    setEditFoodForm({ name: "", general_group: "", category: "", calories: "", protein: "", carbs: "", fats: "", grams_reference: "" });
  };

  const saveEditFood = async (id) => {
    try {
      await axios.put(`${API_URL}/api/food-database/${id}`, editFoodForm);
      fetchFoodItems();
      setEditingFood(null);
      showToast({ message: "Food item updated successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to update food item:", error);
      showToast({ message: "Failed to update food item", type: "error" });
    }
  };

  const handleAddAllergen = async () => {
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

  const handleDeleteAllergen = async (id, name) => {
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

  const handleAllergenKeyPress = (e) => {
    if (e.key === "Enter") handleAddAllergen();
  };

  const startEditAllergen = (allergen) => {
    setEditingAllergen(allergen.id);
    setEditAllergenName(allergen.name);
  };

  const cancelEditAllergen = () => {
    setEditingAllergen(null);
    setEditAllergenName("");
  };

  const saveEditAllergen = async (id) => {
    if (!editAllergenName.trim()) {
      showToast({ message: "Allergen name cannot be empty", type: "error" });
      return;
    }
    try {
      await axios.put(`${API_URL}/api/allergens/${id}`, { name: editAllergenName.trim() });
      fetchAllergens();
      setEditingAllergen(null);
      setEditAllergenName("");
      showToast({ message: "Allergen updated successfully!", type: "success" });
    } catch (err) {
      console.error("Error updating allergen:", err);
      showToast({ message: "Failed to update allergen", type: "error" });
    }
  };

  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFoods = filteredFoods.slice(startIndex, endIndex);

  const goToPage = (page) => setCurrentPage(page);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, "...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...", totalPages);
    }
    return pages;
  };
  const allergenTotalPages = Math.ceil(allergens.length / allergensPerPage);

const allergenStartIndex = (allergenPage - 1) * allergensPerPage;
const allergenEndIndex = allergenStartIndex + allergensPerPage;

const currentAllergens = allergens.slice(allergenStartIndex, allergenEndIndex);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

<main className="flex-1 min-w-0 p-6 flex flex-col h-screen overflow-hidden">   
           <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Food Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage food items and allergens</p>
        </div>

<div className="flex gap-5 min-w-0 overflow-hidden min-h-0 flex-1 h-0">

<div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden h-full">
            <div className="bg-white border border-gray-200 rounded-xl p-1 flex-shrink-0">

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search food..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All categories" : category}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsAddFoodModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Add food
                </button>
              </div>
            </div>

<div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0 flex-1">
  <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-900">
                    {selectedCategory === "all" ? "All foods" : selectedCategory}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                    {loadingFoods ? "..." : `${filteredFoods.length} ${filteredFoods.length === 1 ? "item" : "items"}`}
                  </span>
                </div>
                {!loadingFoods && filteredFoods.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {startIndex + 1}–{Math.min(endIndex, filteredFoods.length)} of {filteredFoods.length}
                  </span>
                )}
              </div>

<div className="overflow-auto min-h-0 flex-1">              
  {loadingFoods ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Loading...</p>
                ) : currentFoods.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No matching food items</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Group</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Calories</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Protein</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Carbs</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Fats</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Per</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentFoods.map((food, index) => (
                        <tr key={food.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400">{startIndex + index + 1}</td>
<td className="px-4 py-3">
                            <span className="text-xs font-medium text-gray-800">{food.name}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{food.general_group}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">
                              {food.category}
                            </span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-800">{food.calories ?? "N/A"}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-800">{food.protein != null ? `${food.protein}g` : "N/A"}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-800">{food.carbs != null ? `${food.carbs}g` : "N/A"}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-800">{food.fats != null ? `${food.fats}g` : "N/A"}</span>
                          </td>
<td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{food.grams_reference || 100}g</span>
                          </td>
<td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => setEditingFoodModal(food)}
                                className="px-2.5 py-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-[13px] font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFood(food.id)}
                                className="px-2.5 py-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 rounded-lg text-[13px] font-medium transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 px-4 py-3 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === "number" && goToPage(page)}
                      disabled={typeof page !== "number"}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                        page === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : typeof page === "number"
                          ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          : "bg-white text-gray-400 border-gray-200 cursor-default"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

<div className="w-72 flex-shrink-0 flex flex-col gap-1 overflow-hidden">
  {/* Add allergen input */}
  <div className="bg-white border border-gray-200 rounded-xl p-1 flex-shrink-0">
    <div className="flex gap-2">
      <input
        type="text"
        value={newAllergen}
        onChange={(e) => setNewAllergen(e.target.value)}
        onKeyPress={handleAllergenKeyPress}
        placeholder="Add allergen..."
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        onClick={handleAddAllergen}
        disabled={!newAllergen.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </div>
  </div>

  {/* Allergen card — fixed height, no overflow on the card itself */}
  <div className="bg-white border border-gray-200 rounded-xl flex-1 flex flex-col min-h-0">

    {/* Sticky header */}
    <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0 rounded-t-xl">
      <p className="text-xs font-medium text-gray-500">Allergens</p>
      <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
        {allergens.length}
      </span>
    </div>

    {loadingAllergens ? (
      <div className="text-center py-8 text-xs text-gray-400">Loading allergens...</div>
    ) : allergens.length === 0 ? (
      <div className="text-center py-8 text-xs text-gray-400">No allergens added.</div>
    ) : (
      <>
        {/* Scrollable table body only */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentAllergens.map((allergen, index) => (
                <tr key={allergen.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {allergenStartIndex + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    {editingAllergen === allergen.id ? (
                      <input
                        type="text"
                        value={editAllergenName}
                        onChange={(e) => setEditAllergenName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditAllergen(allergen.id)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-800">{allergen.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      {editingAllergen === allergen.id ? (
                        <>
                          <button
                            onClick={() => saveEditAllergen(allergen.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditAllergen}
                            className="px-2.5 py-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-[13px] font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditAllergen(allergen)}
                            className="px-2.5 py-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-[13px] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAllergen(allergen.id, allergen.name)}
                            className="px-2.5 py-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 rounded-lg text-[13px] font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sticky pagination — always at bottom */}
{/* Sticky pagination — always at bottom */}
        <div className="flex justify-center items-center gap-1.5 px-4 py-3 border-t border-gray-100 flex-shrink-0 rounded-b-xl bg-white">
          <button
            onClick={() => setAllergenPage((p) => Math.max(p - 1, 1))}
            disabled={allergenPage === 1}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

<span className="text-xs text-gray-400">Page</span>
          <span className="px-3 py-1.5 rounded-lg text-[13px] font-medium border bg-blue-600 text-white border-blue-600">
            {allergenPage}
          </span>
          <span className="text-xs text-gray-400">of {Math.max(allergenTotalPages, 1)}</span>

          <button
            onClick={() => setAllergenPage((p) => Math.min(p + 1, Math.max(allergenTotalPages, 1)))}
            disabled={allergenPage >= allergenTotalPages || allergenTotalPages <= 1}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </>
    )}
  </div>
</div>
        </div>

<AddFoodModal
          isOpen={isAddFoodModalOpen || !!editingFoodModal}
          onClose={() => { setIsAddFoodModalOpen(false); setEditingFoodModal(null); }}
          onFoodAdded={fetchFoodItems}
          editFood={editingFoodModal}
        />
      </main>
    </div>
  );
};

export default FoodLibrary;