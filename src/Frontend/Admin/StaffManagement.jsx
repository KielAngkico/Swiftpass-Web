import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import AddEmployeeModal from "../../components/Modals/AddEmployeeModal";
import api from "../../api";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { generateStaffSessionLogsPDF } from "../../utils/StaffSessionLogsReports";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from "../../components/ToastManager";

const StaffManagement = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // ✅ ADDED THIS LINE
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [loading, setLoading] = useState(true);
  const [archivedLoading, setArchivedLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  const [sessionLogs, setSessionLogs] = useState([]);
  const [filteredSessionLogs, setFilteredSessionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { scannedRfidForStaff } = useWebSocket();
  const { showToast, showConfirm } = useToast();

  // Fetch current user
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

  // Fetch employees
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
        showToast({ message: "Failed to load staff.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [user, showToast]);

  // Fetch archived employees
  useEffect(() => {
    if (!user?.id && !user?.adminId) return;

    const fetchArchivedEmployees = async () => {
      try {
        setArchivedLoading(true);
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-archived-employees/${adminId}`);
        setArchivedEmployees(data.employees || []);
      } catch (error) {
        console.error("Failed to load archived staff:", error);
        showToast({ message: "Failed to load archived staff.", type: "error" });
      } finally {
        setArchivedLoading(false);
      }
    };
    fetchArchivedEmployees();
  }, [user, showToast]);

  // Fetch session logs
  useEffect(() => {
    if (!user?.id && !user?.adminId) return;

    const fetchSessionLogs = async () => {
      try {
        setLogsLoading(true);
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/staff-session-logs/${adminId}`);
        setSessionLogs(data.logs || []);
      } catch (error) {
        console.error("Failed to load session logs:", error);
        showToast({ message: "Failed to load session logs.", type: "error" });
      } finally {
        setLogsLoading(false);
      }
    };
    fetchSessionLogs();
  }, [user, showToast]);

  // Filter session logs
  useEffect(() => {
    let filtered = sessionLogs;
    if (selectedStaffFilter !== "All") filtered = filtered.filter(log => log.staff_name === selectedStaffFilter);
    if (startDate) filtered = filtered.filter(log => new Date(log.login_time) >= startDate);
    if (endDate) filtered = filtered.filter(log => new Date(log.login_time) <= endDate);
    setFilteredSessionLogs(filtered);
  }, [selectedStaffFilter, startDate, endDate, sessionLogs]);

const handleArchive = async (id, name) => {
  showConfirm(
    `Archive ${name}? They will not be able to access the system.`,
    async () => {
      try {
        await api.put(`/api/staff/${id}/archive`);
        setEmployees(prev => prev.filter(emp => emp.user_id !== id));
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-archived-employees/${adminId}`);
        setArchivedEmployees(data.employees || []);
        showToast({ message: "Staff archived successfully!", type: "success" });
      } catch (error) {
        showToast({ message: error.response?.data?.message || "Failed to archive staff.", type: "error" });
      }
    }
  );
};

const handleRestore = async (id, name) => {
  showConfirm(
    `Restore ${name}? They will be able to access the system again.`,
    async () => {
      try {
        await api.put(`/api/staff/${id}/restore`);
        setArchivedEmployees(prev => prev.filter(emp => emp.user_id !== id));
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-employees/${adminId}`);
        setEmployees(data.employees || []);
        showToast({ message: "Staff restored successfully!", type: "success" });
      } catch (error) {
        showToast({ message: error.response?.data?.message || "Failed to restore staff.", type: "error" });
      }
    }
  );
};
const handlePermanentDelete = async (id, name) => {
  showConfirm(
    `⚠️ PERMANENTLY DELETE ${name}? This cannot be undone!`,
    () => {
      showConfirm(
        `Are you ABSOLUTELY SURE? This will delete all data for ${name}.`,
        async () => {
          try {
            await api.delete(`/api/staff/${id}/permanent`);
            setArchivedEmployees(prev => prev.filter(emp => emp.user_id !== id));
            showToast({ message: "Staff permanently deleted!", type: "success" });
          } catch (error) {
            showToast({ message: error.response?.data?.message || "Failed to delete staff.", type: "error" });
          }
        }
      );
    }
  );
};

  const handleEmployeeAdded = (newEmployee) => {
    setEmployees(prev => [...prev, newEmployee]);
    setShowAddForm(false);
    showToast({ message: "Employee added successfully!", type: "success" });
  };

  const handleEmployeeUpdated = (updatedEmployee) => {
    setEmployees(prev => prev.map(emp => emp.user_id === updatedEmployee.user_id ? updatedEmployee : emp));
    setShowAddForm(false);
    setEditingEmployee(null);
    setModalMode("add");
    showToast({ message: "Employee updated successfully!", type: "success" });
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setModalMode("edit");
    setShowAddForm(true);
  };

  const handleCloseModal = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setModalMode("add");
  };

  const calculateDuration = (loginTime, logoutTime) => {
    if (!logoutTime) return "Active";
    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const diff = logout - login;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleDownloadSessionLogsPDF = async () => {
    if (filteredSessionLogs.length === 0) {
      showToast({ message: "No session log data to download", type: "error" });
      return;
    }

    try {
      showToast({ message: "Generating PDF...", type: "info", duration: 0 });

      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) {
        throw new Error("Not authenticated");
      }

      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");

      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);

      let totalHours = 0;
      filteredSessionLogs.forEach(log => {
        if (log.logout_time) {
          const login = new Date(log.login_time);
          const logout = new Date(log.logout_time);
          const hours = (logout - login) / (1000 * 60 * 60);
          totalHours += hours;
        }
      });

      const logsData = {
        logs: filteredSessionLogs,
        total_sessions: filteredSessionLogs.length,
        online_sessions: filteredSessionLogs.filter(log => log.status === 'online').length,
        offline_sessions: filteredSessionLogs.filter(log => log.status !== 'online').length,
        total_hours: `${Math.floor(totalHours)}h ${Math.floor((totalHours % 1) * 60)}m`
      };

      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        selected_staff: selectedStaffFilter !== "All" ? selectedStaffFilter : null
      };

      const filename = generateStaffSessionLogsPDF(logsData, filterData);

      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };

  const ProfilePicture = ({ employee }) => {
    if (!employee?.profile_image_url) {
      return (
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold flex items-center justify-center text-lg rounded">
          {employee?.name?.charAt(0).toUpperCase() || "N"}
        </div>
      );
    }
    return (
      <img
        src={employee.profile_image_url}
        alt={employee.name || "Staff member"}
        className="w-20 h-20 object-cover rounded"
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
            onClick={() => {
              setModalMode("add");
              setEditingEmployee(null);
              setShowAddForm(true);
            }}
          >
            + Add New Staff
          </button>
        </div>

        <div className="mb-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("active")}
            >
              Active Staff ({employees.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "archived"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("archived")}
            >
              Archived Staff ({archivedEmployees.length})
            </button>
          </div>
        </div>

        <AddEmployeeModal
          isOpen={showAddForm}
          onClose={handleCloseModal}
          onEmployeeAdded={handleEmployeeAdded}
          onEmployeeUpdated={handleEmployeeUpdated}
          adminId={user?.adminId || user?.id}
          mode={modalMode}
          editingEmployee={editingEmployee}
        />

        {activeTab === "active" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
                <span className="ml-2 text-gray-500 text-xs">Loading staff...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6 bg-white rounded border text-xs">
                <p className="text-gray-400 mb-1">No active staff members found</p>
                <p className="text-gray-500 mb-2">Add your first staff to get started</p>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                  onClick={() => setShowAddForm(true)}
                >
                  Add Staff
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                      <p className="text-black text-xs truncate">
                        <span className="font-semibold">RFID:</span> {emp.rfid_tag || "Not assigned"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-xs font-medium"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          View
                        </button>
                        <button
                          className="flex-1 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs font-medium"
                          onClick={() => handleEdit(emp)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 text-xs font-medium"
                          onClick={() => handleArchive(emp.user_id, emp.name)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                    <ProfilePicture employee={emp} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "archived" && (
          <>
            {archivedLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
                <span className="ml-2 text-gray-500 text-xs">Loading archived staff...</span>
              </div>
            ) : archivedEmployees.length === 0 ? (
              <div className="text-center py-6 bg-white rounded border text-xs">
                <p className="text-gray-400 mb-1">No archived staff members</p>
                <p className="text-gray-500 text-xs">Archived staff will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {archivedEmployees.map((emp) => (
                  <div
                    key={emp.user_id}
                    className="rounded-lg border shadow-sm hover:shadow-md transition-all text-xs bg-gray-50 flex justify-between items-center p-3 opacity-75"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-black text-sm truncate">{emp.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-medium">
                          ARCHIVED
                        </span>
                      </div>
                      <p className="text-black text-xs truncate">{emp.email || "No email"}</p>
                      <p className="text-black text-xs">Age: {emp.age || "N/A"}</p>
                      <p className="text-black text-xs">Contact: {emp.contact_number || "N/A"}</p>
                      <p className="text-black text-xs truncate">
                        <span className="font-semibold">RFID:</span> {emp.rfid_tag || "Not assigned"}
                      </p>
                      <p className="text-gray-500 text-[10px] mt-1">
                        Archived: {new Date(emp.archived_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="flex-1 bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs font-medium"
                          onClick={() => handleRestore(emp.user_id, emp.name)}
                        >
                          Restore
                        </button>
                        <button
                          className="flex-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-xs font-medium"
                          onClick={() => handlePermanentDelete(emp.user_id, emp.name)}
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
          </>
        )}

        {activeTab === "active" && employees.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Staff Session Logs</h3>
                <p className="text-xs text-gray-500">Track staff login and logout activities</p>
              </div>

              <button
                onClick={handleDownloadSessionLogsPDF}
                disabled={filteredSessionLogs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                title="Download PDF Report"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <select
                className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
              >
                <option value="All">All Staff</option>
                {employees.map((emp) => (
                  <option key={emp.user_id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
                placeholderText="Start Date"
                isClearable
              />

              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                minDate={startDate}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
                placeholderText="End Date"
                isClearable
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[10px] sm:text-xs text-left border-collapse">
                <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-[10px]">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Staff Name</th>
                    <th className="px-3 py-2">Login Time</th>
                    <th className="px-3 py-2">Logout Time</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-6 text-center bg-white">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div>
                          <span className="ml-2 text-gray-500 text-xs">Loading logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSessionLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-6 text-center bg-white text-xs text-gray-400">
                        No session logs found
                      </td>
                    </tr>
                  ) : (
                    filteredSessionLogs.map((log, index) => (
                      <tr key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{log.staff_name}</td>
                        <td className="px-3 py-2">
                          {new Date(log.login_time).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {log.logout_time
                            ? new Date(log.logout_time).toLocaleString()
                            : <span className="text-blue-600 font-medium">-</span>
                          }
                        </td>
                        <td className="px-3 py-2">
                          {calculateDuration(log.login_time, log.logout_time)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-medium ${
                            log.status === 'online'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
              <p className="text-sm text-gray-700">
                <strong>RFID Tag:</strong> {selectedEmployee.rfid_tag || "Not assigned"}
              </p>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                  onClick={() => {
                    setSelectedEmployee(null);
                    handleEdit(selectedEmployee);
                  }}
                >
                  Edit
                </button>
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