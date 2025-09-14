import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import AddEmployeeModal from "../../components/Modals/AddEmployeeModal";
import api from "../../api";

const StaffManagement = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data?.authenticated || !data?.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
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
        console.error("❌ Failed to fetch employees:", error);
        alert("Failed to load employees. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user]);

  const handleDelete = async (id, name) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/api/staff/${id}`);
      setEmployees((prev) => prev.filter((emp) => (emp.user_id || emp.id) !== id));
      alert("✅ Staff account archived and deleted successfully.");
    } catch (error) {
      console.error("❌ Failed to delete staff:", error);
      alert("Failed to delete staff. Please try again.");
    }
  };

  const handleEmployeeAdded = (newEmployee) => {
    setEmployees((prev) => [...prev, newEmployee]);
    setIsModalOpen(false);
  };

  const filteredEmployees = employees.filter((employee) =>
    selectedFilter === "All" ? true : employee.branch === selectedFilter
  );

  const ProfilePicture = ({ employee, size = "w-12 h-12", textSize = "text-lg" }) => {
    const [imageError, setImageError] = useState(false);
    const handleImageError = () => setImageError(true);

    if (!employee?.profile_image_url || imageError) {
      return (
        <div
          className={`${size} rounded-full flex items-center justify-center text-white font-bold ${textSize} shadow-md bg-gradient-to-br from-blue-500 to-blue-600`}
        >
          {employee?.name ? employee.name.charAt(0).toUpperCase() : "N"}
        </div>
      );
    }

    return (
      <img
        src={employee.profile_image_url}
        alt={employee.name || "Staff member"}
        className={`${size} rounded-full object-cover shadow-md border-2 border-white`}
        onError={handleImageError}
      />
    );
  };

  return(
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage your team members and their information</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
            <span className="text-sm text-gray-500">Total Staff: </span>
            <span className="font-semibold text-blue-600">{employees.length}</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Staff
          </button>

          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Branches</option>
            {/* Add branch options dynamically */}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading staff...</span>
          </div>
        ) : filteredEmployees.length > 0 ? (
          /* Staff Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.user_id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Employee Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start">
                    <ProfilePicture employee={employee} />
                    <div className="ml-4">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight">{employee.name || "N/A"}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{employee.email || "No email"}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {employee.contact_number || "No phone"}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Age: {employee.age || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 pb-6 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-sm font-medium border border-blue-200"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDelete(employee.user_id, employee.name)}
                    className="flex-shrink-0 bg-red-50 text-red-700 py-2 px-3 rounded-lg hover:bg-red-100 transition-colors duration-200 border border-red-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No staff members found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first staff member.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Add Staff Member
            </button>
          </div>
        )}

        {/* Add Employee Modal */}
<AddEmployeeModal
  isOpen={showAddForm}
  onClose={() => setShowAddForm(false)}
  onEmployeeAdded={handleEmployeeAdded}
  adminId={user?.adminId || user?.id}
/>


        {/* View Details Modal */}
        {isModalOpen && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Staff Details</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center mb-6">
                  <ProfilePicture 
                    employee={selectedEmployee} 
                    size="w-16 h-16" 
                    textSize="text-xl"
                  />
                  <div className="ml-4">
                    <h4 className="text-xl font-semibold text-gray-900">{selectedEmployee.name}</h4>
                    <p className="text-gray-500">{selectedEmployee.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p className="font-medium text-gray-900">{selectedEmployee.age || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Contact Number</p>
                      <p className="font-medium text-gray-900">{selectedEmployee.contact_number || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">{selectedEmployee.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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