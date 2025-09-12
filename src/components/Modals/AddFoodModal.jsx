import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import { API_URL } from "../../config";

const API_KEY = "IocRqBoJAYd1hcjOzcIkbi8j6CUzCwPBnxC8xoIJ";
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

const AddFoodModal = ({ isOpen, onClose, onFoodAdded }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [allergensList, setAllergensList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [user, setUser] = useState(null);

useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/me`, { withCredentials: true });
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user info", err);
      setUser(null);
    }
  };

  if (isOpen) fetchUser();
}, [isOpen]);


  const [formData, setFormData] = useState({
    name: "",
    general_group: "",
    category: "",
    grams_reference: 100,
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    allergens: [],
    is_meat: false,
    is_red_meat: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      general_group: "",
      category: "",
      grams_reference: 100,
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      allergens: [],
      is_meat: false,
      is_red_meat: false,
    });
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFoodId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    setIsSearching(true);
    try {
      const res = await axios.get(USDA_SEARCH_URL, {
        params: {
          query: searchQuery,
          api_key: API_KEY,
          dataType: "Foundation",
          pageSize: 10,
        },
      });

      setSearchResults(res.data.foods || []);
    } catch (err) {
      console.error("USDA API error:", err);
      alert("Failed to fetch food data.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFood = (food) => {
    setSelectedFoodId(food.fdcId);

    const nutrients = { calories: "", protein: "", carbs: "", fats: "" };

    food.foodNutrients.forEach((n) => {
      const name = n.nutrientName.toLowerCase();
      if (name.includes("energy")) nutrients.calories = n.value;
      if (name.includes("protein")) nutrients.protein = n.value;
      if (name.includes("carbohydrate")) nutrients.carbs = n.value;
      if (name.includes("total lipid")) nutrients.fats = n.value;
    });

    setFormData(prev => ({
      ...prev,
      name: food.description || "",
      calories: nutrients.calories || "",
      protein: nutrients.protein || "",
      carbs: nutrients.carbs || "",
      fats: nutrients.fats || "",
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await axios.post(`${API_URL}/api/food-database`, {
      ...formData,
      created_by: user?.name || "Unknown",
    });
    alert("Food item saved successfully!");
    onFoodAdded(); 
    onClose();
    resetForm();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Failed to save food.");
  }
};

  const handleClose = () => {
    onClose();
    resetForm();
  };

  useEffect(() => {
    const fetchAllergens = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/allergens`);
        setAllergensList(res.data);
      } catch (err) {
        console.error("Error fetching allergens:", err);
      }
    };
    
    if (isOpen) {
      fetchAllergens();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4" 
      onClick={handleClose}
    >
      <div 
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Add New Food Item</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Section */}
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search Food Database (USDA)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., chicken breast, banana, rice"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-3 text-gray-700">Search Results</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`border p-3 rounded-lg cursor-pointer transition-all ${
                    selectedFoodId === item.fdcId 
                      ? "bg-blue-100 border-blue-300" 
                      : "bg-white hover:bg-gray-100 border-gray-200"
                  }`}
                  onClick={() => handleSelectFood(item)}
                >
                  <div className="font-medium text-gray-800">{item.description}</div>
                  <div className="text-sm text-gray-500">FDC ID: {item.fdcId}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Food Name
              </label>
              <input
                type="text"
                name="name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                General Group
              </label>
              <input
                type="text"
                name="general_group"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Chicken, Beef, Avocado"
                value={formData.general_group}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Select category</option>
                <option value="Protein">Protein</option>
                <option value="Carb">Carb</option>
                <option value="Fruit">Fruits</option>
                <option value="Vegetable">Vegetable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Weight (g)
              </label>
              <input
                type="number"
                name="grams_reference"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.grams_reference}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Default is 100g (USDA standard). Nutrients are stored relative to this.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Calories
              </label>
              <input
                type="number"
                name="calories"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.calories}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Protein (g)
              </label>
              <input
                type="number"
                name="protein"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.protein}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Carbs (g)
              </label>
              <input
                type="number"
                name="carbs"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.carbs}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fats (g)
              </label>
              <input
                type="number"
                name="fats"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.fats}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  name="is_meat"
                  checked={formData.is_meat || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_meat: e.target.checked,
                    }))
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Is Meat
              </label>
              <p className="text-xs text-gray-600 ml-7">Check if this is animal-based</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  name="is_red_meat"
                  checked={formData.is_red_meat || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_red_meat: e.target.checked,
                    }))
                  }
                  className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Is Red Meat
              </label>
              <p className="text-xs text-gray-600 ml-7">Check if this is red meat (e.g., beef, pork)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Allergens
            </label>
            <Select
              isMulti
              options={allergensList.map((a) => ({ value: a.id, label: a.name }))}
              value={formData.allergens.map((id) => {
                const allergen = allergensList.find((a) => a.id === id);
                return { value: id, label: allergen?.name || "" };
              })}
              onChange={(selected) =>
                setFormData((prev) => ({
                  ...prev,
                  allergens: selected.map((s) => s.value),
                }))
              }
              placeholder="Type to search allergens..."
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '48px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  '&:focus': {
                    borderColor: '#3B82F6',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                  }
                })
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Start typing to search and select allergens.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Save Food Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFoodModal;