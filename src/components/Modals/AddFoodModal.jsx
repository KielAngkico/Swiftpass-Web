import React, { useState, useEffect } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import { API_URL } from "../../config";
import { USDA_SEARCH_URL, API_KEY } from "../../usda";

const AddFoodModal = ({ isOpen, onClose, onFoodAdded }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [allergensList, setAllergensList] = useState([]);
  const [foodGroupNames, setFoodGroupNames] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState(null);

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/me`, { withCredentials: true });
        setUser(res.data);
      } catch {
        setUser(null);
      }
    };
    if (isOpen) fetchUser();
  }, [isOpen]);

  useEffect(() => {
    const fetchAllergens = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/allergens`);
        setAllergensList(res.data);
      } catch {}
    };
    if (isOpen) fetchAllergens();
  }, [isOpen]);

  useEffect(() => {
    const fetchFoodGroupNames = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/food-groups/names`);
        console.log("Food groups received:", res.data);
        setFoodGroupNames(res.data);
      } catch (err) {
        console.error("Error fetching food group names:", err);
      }
    };
    if (isOpen) fetchFoodGroupNames();
  }, [isOpen]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    food.foodNutrients.forEach(n => {
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
      onFoodAdded();
      onClose();
      resetForm();
    } catch {
      alert("Failed to save food.");
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  // Convert food group names to react-select options
  const foodGroupOptions = foodGroupNames.map(name => ({
    value: name,
    label: name
  }));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center  z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white p-6 rounded-md shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add New Food Item</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* USDA Search Section */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search Food Database (USDA)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., chicken, banana"
              className="flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-500 text-white px-3 py-2 rounded-md text-xs hover:bg-blue-600 transition-colors"
            >
              {isSearching ? "..." : "Go"}
            </button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
            {searchResults.map(item => (
              <div
                key={item.fdcId}
                className={`p-2 rounded-md cursor-pointer text-sm ${selectedFoodId === item.fdcId ? "bg-blue-100" : "hover:bg-gray-100"}`}
                onClick={() => handleSelectFood(item)}
              >
                {item.description}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Food Name - Full Width */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Food Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Food Name"
              className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Row 2: General Group (1/2) + Allergens (1/2) */}
		<div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                General Group <span className="text-gray-500 text-[10px]">(type to add new)</span>
              </label>
              <CreatableSelect
                isClearable
                options={foodGroupOptions}
                value={formData.general_group ? { value: formData.general_group, label: formData.general_group } : null}
                onChange={(selected) => setFormData(prev => ({ ...prev, general_group: selected ? selected.value : "" }))}
                placeholder="Select or type new group..."
                className="text-xs"
                formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    fontSize: '0.75rem'
                  }),
                  menu: (base) => ({
                    ...base,
                    fontSize: '0.75rem'
                  })
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Allergens</label>
              <Select
                isMulti
                options={allergensList.map(a => ({ value: a.id, label: a.name }))}
                value={formData.allergens.map(id => {
                  const allergen = allergensList.find(a => a.id === id);
                  return { value: id, label: allergen?.name || "" };
                })}
                onChange={selected => setFormData(prev => ({ ...prev, allergens: selected.map(s => s.value) }))}
                placeholder="Select allergens..."
                className="text-xs"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    fontSize: '0.75rem'
                  }),
                  menu: (base) => ({
                    ...base,
                    fontSize: '0.75rem'
                  })
                }}
              />
            </div>
          </div>

          {/* Row 3: Category (1/2) + Reference Weight + Meat Checkboxes (1/2) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select category</option>
                <option value="Protein">Protein</option>
                <option value="Carb">Carb</option>
                <option value="Fruit">Fruit</option>
                <option value="Vegetable">Vegetable</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ref (g)</label>
                <input
                  type="number"
                  name="grams_reference"
                  value={formData.grams_reference}
                  onChange={handleInputChange}
                  placeholder="100"
                  className="w-full p-2 border border-gray-300 rounded-md text-xs text-center bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meat</label>
                <label className="flex items-center justify-center border border-gray-300 rounded-md p-2 cursor-pointer hover:bg-gray-50 transition-colors h-[38px]">
                  <input
                    type="checkbox"
                    checked={formData.is_meat}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_meat: e.target.checked }))}
                    className="mr-1.5"
                  />
                  <span className="text-xs">Yes</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Red</label>
                <label className="flex items-center justify-center border border-gray-300 rounded-md p-2 cursor-pointer hover:bg-gray-50 transition-colors h-[38px]">
                  <input
                    type="checkbox"
                    checked={formData.is_red_meat}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_red_meat: e.target.checked }))}
                    className="mr-1.5"
                  />
                  <span className="text-xs">Yes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 4: All Macros - 4 Equal Columns */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Calories</label>
              <input
                type="number"
                name="calories"
                value={formData.calories}
                onChange={handleInputChange}
                placeholder="Calories"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Protein (g)</label>
              <input
                type="number"
                name="protein"
                value={formData.protein}
                onChange={handleInputChange}
                placeholder="Protein"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Carbs (g)</label>
              <input
                type="number"
                name="carbs"
                value={formData.carbs}
                onChange={handleInputChange}
                placeholder="Carbs"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fats (g)</label>
              <input
                type="number"
                name="fats"
                value={formData.fats}
                onChange={handleInputChange}
                placeholder="Fats"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md text-xs hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-xs hover:bg-blue-700"
            >
              Save Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFoodModal;
