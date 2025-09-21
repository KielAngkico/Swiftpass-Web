import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import AddEmployeeModal from "../../components/Modals/AddEmployeeModal";
import api from "../../api";

const StaffManagement = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data?.authenticated || !data?.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch {
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id && !user?.adminId) return;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-employees/${adminId}`);
        setEmployees(data.employees || []);
      } catch (error) {
        console.error(error);
        setMessage("Failed to load staff.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [user]);

  const handleDelete = async (id, name) => {
    if (!id || !window.confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/api/staff/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.user_id !== id));
      setMessage("Staff deleted successfully!");
    } catch {
      setMessage("Failed to delete staff.");
    }
  };

  const handleEmployeeAdded = (newEmployee) => {
    setEmployees((prev) => [...prev, newEmployee]);
    setShowAddForm(false);
  };

  const ProfilePicture = ({ employee }) => {
    if (!employee?.profile_image_url) {
      return (
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold flex items-center justify-center text-lg">
          {employee?.name?.charAt(0).toUpperCase() || "N"}
        </div>
      );
    }
    return (
      <img
        src={employee.profile_image_url}
        alt={employee.name || "Staff member"}
        className="w-20 h-20 object-cover"
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 p-4">
        <div className="mb-3 p-2">
        <h2 className="text-lg sm:text-xl font-semibold mb-1">Staff Management</h2>
          <p className="text-gray-500 text-xs">Manage your team members</p>
        </div>
        <div className="mb-3">
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            onClick={() => setShowAddForm(true)}
          >
            + Add New Staff
          </button>
        </div>

        {message && (
          <div className="p-2 mb-2 rounded border text-xs bg-red-50 border-red-200 text-red-700">{message}</div>
        )}
        <AddEmployeeModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onEmployeeAdded={handleEmployeeAdded}
          adminId={user?.adminId || user?.id}
        />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
            <span className="ml-2 text-gray-500 text-xs">Loading staff...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-6 bg-white rounded border text-xs">
            <p className="text-gray-400 mb-1">No staff members found</p>
            <p className="text-gray-500 mb-2">Add your first staff to get started</p>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
              onClick={() => setShowAddForm(true)}
            >
              Add Staff
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.user_id}
                className="rounded-lg border shadow-sm hover:shadow-md transition-all text-xs bg-white flex justify-between items-center p-3"
              >
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-black text-sm truncate">{emp.name}</h3>
                  <p className="text-black text-xs truncate">{emp.email || "No email"}</p>
                  <p className="text-black text-xs">Age: {emp.age || "N/A"}</p>
                  <p className="text-black text-xs">Contact: {emp.contact_number || "N/A"}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-xs font-medium"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      View
                    </button>
                    <button
                      className="flex-1 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs font-medium"
                      onClick={() => handleDelete(emp.user_id, emp.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ProfilePicture employee={emp} />
              </div>
            ))}
          </div>
        )}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm shadow-lg">
              {selectedEmployee.profile_image_url && (
                <img
                  src={selectedEmployee.profile_image_url}
                  alt={selectedEmployee.name}
                  className="w-full h-36 object-cover rounded mb-2"
                />
              )}
              <h2 className="text-lg font-semibold mb-1">{selectedEmployee.name}</h2>
              <p className="text-sm text-gray-700">Email: {selectedEmployee.email}</p>
              <p className="text-sm text-gray-700">Age: {selectedEmployee.age}</p>
              <p className="text-sm text-gray-700">Contact: {selectedEmployee.contact_number}</p>
              <p className="text-sm text-gray-700">Address: {selectedEmployee.address}</p>

              <div className="mt-3 flex justify-end">
                <button
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffManagement;
