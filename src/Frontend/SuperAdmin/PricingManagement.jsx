import React, { useEffect, useState } from "react";
import API from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";

export default function PricingManagement() {
  const [packages, setPackages] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", duration_days: "" });
  const [packageItems, setPackageItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [editingPackage, setEditingPackage] = useState(null);

  useEffect(() => {
    fetchPackages();
    fetchInventory();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await API.get("/api/packages");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.packages || [];
      setPackages(data);
    } catch (err) {
      console.error("Error fetching packages:", err);
      setPackages([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await API.get("/api/inventory");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.inventory || [];
      setInventory(data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setInventory([]);
    }
  };

  const addItem = () => {
    if (!selectedItem || selectedQty <= 0) return;
    const item = inventory.find((i) => i.id === parseInt(selectedItem));
    if (!item) return;
    setPackageItems([
      ...packageItems,
      { item_name: item.name, quantity: selectedQty },
    ]);
    setSelectedItem("");
    setSelectedQty(1);
  };

  const removeItem = (index) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingPackage) {
        // 🟡 Update existing promo
        await API.put(`/api/packages/${editingPackage.id}`, {
          ...form,
          items: packageItems,
        });
        alert("✅ Promo updated successfully!");
      } else {
        // 🟢 Create new promo
        await API.post("/api/packages", {
          ...form,
          items: packageItems,
        });
        alert("✅ Promo created successfully!");
      }

      // Reset form after submit
      setForm({ name: "", price: "", duration_days: "" });
      setPackageItems([]);
      setEditingPackage(null);
      fetchPackages();
    } catch (err) {
      console.error("Error submitting promo:", err);
      alert("❌ Failed to save promo");
    }
  };

  const deletePackage = async (id) => {
    if (!window.confirm("Delete this promo?")) return;
    try {
      await API.delete(`/api/packages/${id}`);
      alert("✅ Promo deleted");
      fetchPackages();
    } catch (err) {
      console.error("Error deleting package:", err);
      alert("❌ Failed to delete promo");
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setForm({
      name: pkg.name,
      price: pkg.price,
      duration_days: pkg.duration_days,
    });
    setPackageItems(pkg.items || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingPackage(null);
    setForm({ name: "", price: "", duration_days: "" });
    setPackageItems([]);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <main className="flex-1 p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Gym Promos & Packages
          </h1>
          <p className="text-gray-600 text-xs">
            Create yearly/monthly gym promos with included items (shirts, tumblers, etc.)
          </p>
        </div>

        {/* FORM SECTION */}
        <div className="flex gap-4 mb-5">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 bg-white p-4 rounded-md shadow-sm max-w-4xl w-full"
          >
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Promo Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-300 p-2 flex-1 text-xs rounded"
                required
              />
              <input
                type="number"
                placeholder="Price (₱)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border border-gray-300 p-2 w-32 text-xs rounded"
                required
              />
              <input
                type="number"
                placeholder="Duration (days)"
                value={form.duration_days}
                onChange={(e) =>
                  setForm({ ...form, duration_days: e.target.value })
                }
                className="border border-gray-300 p-2 w-40 text-xs rounded"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="border border-gray-300 p-2 flex-1 text-xs rounded"
              >
                <option value="">Select Item</option>
                {inventory.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} (Available: {inv.quantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={selectedQty}
                onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                className="border border-gray-300 p-2 w-20 text-xs rounded"
              />
              <button
                type="button"
                onClick={addItem}
                className="bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700"
                disabled={!selectedItem}
              >
                Add Item
              </button>
            </div>

            {packageItems.length > 0 && (
              <div className="border border-gray-200 p-3 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2 text-xs">Included Items</h4>
                <ul className="text-xs">
                  {packageItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center border-b py-1"
                    >
                      <span>
                        {item.item_name} — {item.quantity} pcs
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                type="submit"
                className={`${
                  editingPackage
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white px-4 py-2 rounded text-xs`}
              >
                {editingPackage ? "✏️ Update Promo" : "💾 Save Promo"}
              </button>
              {editingPackage && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-400 text-white px-4 py-2 rounded text-xs hover:bg-gray-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* TABLE SECTION */}
        <div className="max-w-4xl w-full bg-white rounded-md shadow-sm overflow-auto">
          <div className="p-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-sm">Available Promos</h2>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">Promo Name</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Duration</th>
                <th className="p-2 border">Included Items</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.length > 0 ? (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="border p-2 font-medium">{pkg.name}</td>
                    <td className="border p-2 text-center">₱{pkg.price}</td>
                    <td className="border p-2 text-center">{pkg.duration_days} days</td>
                    <td className="border p-2">
                      {pkg.items?.length ? (
                        <ul className="list-disc list-inside text-xs">
                          {pkg.items.map((it, j) => (
                            <li key={j}>
                              {it.item_name} ({it.quantity} pcs)
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">No items</span>
                      )}
                    </td>
                    <td className="border p-2 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePackage(pkg.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-gray-500">
                    No promos created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
