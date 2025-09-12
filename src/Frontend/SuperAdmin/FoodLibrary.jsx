import React, { useState, useEffect } from "react";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddFoodModal from "../../components/Modals/AddFoodModal";
import axios from "axios";
import { API_URL } from "../../config";

const FoodLibrary = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); 

  const categories = ["all", "Protein", "Carb", "Fruit", "Vegetable"];

  const fetchFoodItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/food-database`);
      setFoodItems(response.data);
      setFilteredFoods(response.data);
    } catch (error) {
      console.error("Error fetching food items:", error);
      alert("Failed to fetch food items");
    } finally {
      setLoading(false);
    }
  };

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
    if (window.confirm("Are you sure you want to delete this food item?")) {
      try {
        await axios.delete(`${API_URL}/api/food-database/${foodId}`);
        fetchFoodItems();
        alert("Food item deleted successfully!");
      } catch (error) {
        console.error("Error deleting food item:", error);
        alert("Failed to delete food item");
      }
    }
  };

  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFoods = filteredFoods.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const FoodCard = ({ food }) => (
    <div className="bg-white p-4 rounded border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{food.name}</h4>
          <p className="text-sm text-gray-600">{food.general_group}</p>
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
            {food.category}
          </span>
        </div>
        <button
          onClick={() => handleDeleteFood(food.id)}
          className="text-red-500 hover:text-red-700 text-xl leading-none"
        >
          ×
        </button>
      </div>
      
      <div className="text-sm space-y-1 text-gray-700">
        <p>Calories: {food.calories || 'N/A'}</p>
        <p>Protein: {food.protein || 'N/A'}g | Carbs: {food.carbs || 'N/A'}g | Fats: {food.fats || 'N/A'}g</p>
        <p className="text-xs text-gray-500">Per {food.grams_reference || 100}g</p>
      </div>
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex justify-center items-center space-x-2 mt-6 pb-4">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && goToPage(page)}
            disabled={typeof page !== 'number'}
            className={`px-3 py-1 rounded border ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : typeof page === 'number'
                ? 'bg-white hover:bg-gray-50'
                : 'bg-white cursor-default'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SuperAdminSidebar />

      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Food Library</h1>
            <p className="text-gray-600 text-sm mt-1">
              {filteredFoods.length} food items
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedCategory !== "all" && ` in ${selectedCategory}`}
            </p>
          </div>
          <button
            onClick={() => setIsAddFoodModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            + Add Food
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded shadow-sm mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search foods by name or group..."
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        </div>

        {/* Food Items Grid */}
        <div className="bg-white rounded shadow-sm p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : currentFoods.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== "all" 
                  ? `No results found${searchQuery ? ` for "${searchQuery}"` : ""}${selectedCategory !== "all" ? ` in ${selectedCategory}` : ""}`
                  : "No food items available"
                }
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCategory === "all" ? "All Foods" : selectedCategory}
                </h3>
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredFoods.length)} of {filteredFoods.length} items
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentFoods.map((food) => (
                  <FoodCard key={food.id} food={food} />
                ))}
              </div>

              <Pagination />
            </>
          )}
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