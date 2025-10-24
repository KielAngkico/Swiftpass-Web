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
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const categories = ["all", "Protein", "Carb", "Fruit", "Vegetable"];
  const [allergens, setAllergens] = useState([]);
  const [newAllergen, setNewAllergen] = useState("");
  const [loadingAllergens, setLoadingAllergens] = useState(true);
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

  // ===== FOOD LOGIC =====
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

  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFoods = filteredFoods.slice(startIndex, endIndex);

  const goToPage = (page) => setCurrentPage(page);
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
const FoodCard = ({ food }) => (
  <div className="bg-white p-2 rounded border shadow-sm hover:shadow-md transition-shadow text-xs">
    <div className="flex justify-between items-start mb-1">
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">{food.name}</h4>
        <p className="text-[11px] text-gray-600">{food.general_group}</p>
        <span className="inline-block bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded mt-0.5">
          {food.category}
        </span>
      </div>
      <button
        onClick={() => handleDeleteFood(food.id)}
        className="text-red-500 hover:text-red-700 text-lg leading-none"
      >
        ×
      </button>
    </div>
    <div className="space-y-0.5 text-gray-700">
      <p className="text-[11px]">Calories: {food.calories || "N/A"}</p>
      <p className="text-[11px]">
        Protein: {food.protein || "N/A"}g | Carbs: {food.carbs || "N/A"}g | Fats: {food.fats || "N/A"}g
      </p>
      <p className="text-[10px] text-gray-500">Per {food.grams_reference || 100}g</p>
    </div>
  </div>
);


  const Pagination = () => {
    if (totalPages <= 1) return null;
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, "...");
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1, "...");
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push("...", totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex justify-center items-center space-x-2 mt-6 pb-4">
        <button onClick={goToPreviousPage} disabled={currentPage === 1} className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Previous
        </button>
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && goToPage(page)}
            disabled={typeof page !== "number"}
            className={`px-3 py-1 rounded border ${
              page === currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : typeof page === "number"
                ? "bg-white hover:bg-gray-50"
                : "bg-white cursor-default"
            }`}
          >
            {page}
          </button>
        ))}
        <button onClick={goToNextPage} disabled={currentPage === totalPages} className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
    );
  };

  // ===== ALLERGEN LOGIC =====
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
    if (e.key === "Enter") {
      handleAddAllergen();
    }
  };

return (
<div className="flex h-screen bg-gray-100 overflow-hidden">
  <SuperAdminSidebar />

  <main className="flex-1 p-5 overflow-hidden flex flex-col">
    <div className="flex justify-between items-start mb-2">
      <div className="w-full lg:w-[60%]">
        <h1 className="text-2xl font-semibold text-gray-800">Food Library</h1>
        <p className="text-xs text-gray-600">
          {filteredFoods.length} items
          {searchQuery && ` matching "${searchQuery}"`}
          {selectedCategory !== "all" && ` in ${selectedCategory}`}
        </p>
      </div>

      <div className="w-full lg:w-[40%] text-left">
        <h1 className="text-2xl font-semibold text-gray-800">Allergens</h1>
        <p className="text-xs text-gray-600">
          {allergens.length} {allergens.length === 1 ? "item" : "items"}
        </p>
      </div>
    </div>

    <div className="flex flex-1 gap-3 overflow-hidden">
      <div className="w-full lg:w-[60%] flex flex-col space-y-2 overflow-hidden">
        <div className="bg-white p-3 rounded shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search food..."
              className="flex-1 p-2 text-xs border rounded focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="p-2 text-xs border rounded focus:ring-1 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All" : category}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAddFoodModalOpen(true)}
              className="bg-green-600 text-white px-3 py-1.5 text-xs rounded hover:bg-green-700"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-3 flex-1 overflow-auto">
          {loadingFoods ? (
            <div className="text-center py-8 text-xs">Loading...</div>
          ) : currentFoods.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No matching food items</div>
          ) : (
            <>
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedCategory === "all" ? "All Foods" : selectedCategory}
                </h3>
                <p className="text-xs text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredFoods.length)} of {filteredFoods.length}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentFoods.map((food) => (
                  <FoodCard key={food.id} food={food} />
                ))}
              </div>

              <Pagination />
            </>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[40%] flex flex-col space-y-2 overflow-hidden">
        <div className="bg-white p-3 rounded shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergen}
              onChange={(e) => setNewAllergen(e.target.value)}
              onKeyPress={handleAllergenKeyPress}
              placeholder="Search or add allergen..."
              className="flex-1 p-2 text-xs border rounded focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddAllergen}
              disabled={!newAllergen.trim()}
              className="bg-green-600 text-white px-3 py-1.5 text-xs rounded hover:bg-green-700 disabled:opacity-50"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="bg-white p-3 rounded shadow-sm flex-1 overflow-auto">
          <h2 className="text-sm font-semibold mb-2">All Allergens</h2>
          {loadingAllergens ? (
            <div className="text-center text-gray-500 text-sm py-4">Loading allergens...</div>
          ) : allergens.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">No allergens added.</div>
          ) : (
            <div className="space-y-1">
              {allergens.map((allergen, index) => (
                <div
                  key={allergen.id}
                  className="bg-white p-2 rounded border text-xs shadow-sm hover:shadow-md flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{allergen.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAllergen(allergen.id, allergen.name)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    <AddFoodModal
      isOpen={isAddFoodModalOpen}
      onClose={() => setIsAddFoodModalOpen(false)}
      onFoodAdded={fetchFoodItems}
    />
  </main>
</div>



);





};

export default FoodLibrary;
