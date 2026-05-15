import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import AddEmployeeModal from "../../components/Modals/AddEmployeeModal";
import ViewStaffModal from "../../components/Modals/ViewstaffModal";
import api from "../../api";
import { generateStaffSessionLogsPDF } from "../../utils/StaffSessionLogsReports";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from "../../components/ToastManager";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white";

const StaffManagement = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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
const [sessionPage, setSessionPage] = useState(1);
const SESSION_ROWS_PER_PAGE = 10;
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();

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
        showToast({ message: "Failed to load staff.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [user]);

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
  }, [user]);

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
  }, [user]);

  useEffect(() => {
    let filtered = sessionLogs;
    if (selectedStaffFilter !== "All") filtered = filtered.filter(log => log.staff_name === selectedStaffFilter);
    if (startDate) filtered = filtered.filter(log => new Date(log.login_time) >= startDate);
    if (endDate) filtered = filtered.filter(log => new Date(log.login_time) <= endDate);
setFilteredSessionLogs(filtered);
setSessionPage(1);
  }, [selectedStaffFilter, startDate, endDate, sessionLogs]);

  const handleArchive = async (id, name) => {
    showConfirm(`Archive ${name}? They will not be able to access the system.`, async () => {
      try {
        await api.put(`/api/staff/${id}/archive`);
        setEmployees(prev => prev.filter(emp => emp.user_id !== id));
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-archived-employees/${adminId}`);
        setArchivedEmployees(data.employees || []);
        showToast({ message: `${name} archived successfully!`, type: "success" });
      } catch (error) {
        showToast({ message: error.response?.data?.message || "Failed to archive staff.", type: "error" });
      }
    });
  };

  const handleRestore = async (id, name) => {
    showConfirm(`Restore ${name}? They will be able to access the system again.`, async () => {
      try {
        await api.put(`/api/staff/${id}/restore`);
        setArchivedEmployees(prev => prev.filter(emp => emp.user_id !== id));
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/get-employees/${adminId}`);
        setEmployees(data.employees || []);
        showToast({ message: `${name} restored successfully!`, type: "success" });
      } catch (error) {
        showToast({ message: error.response?.data?.message || "Failed to restore staff.", type: "error" });
      }
    });
  };

  const handlePermanentDelete = async (id, name) => {
    showConfirm(`PERMANENTLY DELETE ${name}? This cannot be undone!`, () => {
      showConfirm(`Are you ABSOLUTELY SURE? This will delete all data for ${name}.`, async () => {
        try {
          await api.delete(`/api/staff/${id}/permanent`);
          setArchivedEmployees(prev => prev.filter(emp => emp.user_id !== id));
          showToast({ message: `${name} permanently deleted!`, type: "success" });
        } catch (error) {
          showToast({ message: error.response?.data?.message || "Failed to delete staff.", type: "error" });
        }
      });
    });
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
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);
      let totalHours = 0;
      filteredSessionLogs.forEach(log => {
        if (log.logout_time) {
          const login = new Date(log.login_time);
          const logout = new Date(log.logout_time);
          totalHours += (logout - login) / (1000 * 60 * 60);
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
      showToast({ message: `PDF generated: ${filename}`, type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };
const sessionTotalPages = Math.max(1, Math.ceil(filteredSessionLogs.length / SESSION_ROWS_PER_PAGE));
const paginatedSessionLogs = filteredSessionLogs.slice((sessionPage - 1) * SESSION_ROWS_PER_PAGE, sessionPage * SESSION_ROWS_PER_PAGE);
  const ProfilePicture = ({ employee }) => {
    if (!employee?.profile_image_url) {
      return (
        <div className="w-14 h-14 bg-blue-50 border border-blue-100 text-blue-600 font-semibold flex items-center justify-center text-base rounded-xl flex-shrink-0">
          {employee?.name?.charAt(0).toUpperCase() || "?"}
        </div>
      );
    }
    return (
      <img
        src={employee.profile_image_url}
        alt={employee.name || "Staff member"}
        className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-gray-200"
      />
    );
  };

  const tabs = [
    { id: "active", label: "Active Staff", count: employees.length },
    { id: "archived", label: "Archived Staff", count: archivedEmployees.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 min-w-0 p-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your team members</p>
        </div>

        {/* Tabs + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5 leading-none">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            onClick={() => { setModalMode("add"); setEditingEmployee(null); setShowAddForm(true); }}
          >
            Add New Staff
          </button>
        </div>

        {/* Modals */}
        <AddEmployeeModal
          isOpen={showAddForm}
          onClose={handleCloseModal}
          onEmployeeAdded={handleEmployeeAdded}
          onEmployeeUpdated={handleEmployeeUpdated}
          adminId={user?.adminId || user?.id}
          mode={modalMode}
          editingEmployee={editingEmployee}
          showToast={showToast}
        />

        <ViewStaffModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          onEdit={handleEdit}
        />

        {/* Active Tab */}
        {activeTab === "active" && (
          <>
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs text-gray-400">Loading staff...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs font-medium text-gray-400 mb-1">No active staff members found</p>
                <p className="text-xs text-gray-400 mb-3">Add your first staff to get started</p>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  onClick={() => setShowAddForm(true)}
                >
                  Add Staff
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-6">
                {employees.map((emp) => (
                  <div
                    key={emp.user_id}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-3 mb-3">
                      <ProfilePicture employee={emp} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{emp.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{emp.email || "No email"}</p>
                        <p className="text-[11px] text-gray-400">Age: {emp.age || "N/A"}</p>
                        <p className="text-[11px] text-gray-400">Contact: {emp.contact_number || "N/A"}</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                        RFID: {emp.rfid_tag || "Not assigned"}
                      </span>
                    </div>
                    <span className="text-[11px] bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5 w-fit mb-2">
                      Active
                    </span>
                    <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                      <button
                        className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        View
                      </button>
                      <button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                        onClick={() => handleEdit(emp)}
                      >
                        Edit
                      </button>
                      <button
                        className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                        onClick={() => handleArchive(emp.user_id, emp.name)}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Session Logs */}
            {employees.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-2">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Staff Session Logs</p>
                    <p className="text-xs text-gray-400 mt-0.5">Track staff login and logout activities</p>
                  </div>
                  <button
                    onClick={handleDownloadSessionLogsPDF}
                    disabled={filteredSessionLogs.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    Download PDF
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-36"
                    value={selectedStaffFilter}
                    onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  >
                    <option value="All">All Staff</option>
                    {employees.map((emp) => (
                      <option key={emp.user_id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    maxDate={new Date()}
                    dateFormat="yyyy-MM-dd"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-36"
                    placeholderText="Start date"
                    isClearable
                  />
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    minDate={startDate}
                    maxDate={new Date()}
                    dateFormat="yyyy-MM-dd"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-36"
                    placeholderText="End date"
                    isClearable
                  />
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {filteredSessionLogs.length} {filteredSessionLogs.length === 1 ? "record" : "records"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Staff Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Login Time</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Logout Time</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">Loading logs...</td>
                        </tr>
                      ) : filteredSessionLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">No session logs found.</td>
                        </tr>
                      ) : (
                        paginatedSessionLogs.map((log, index) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 text-xs font-medium text-gray-800">{log.staff_name}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(log.login_time).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {log.logout_time ? new Date(log.logout_time).toLocaleString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {calculateDuration(log.login_time, log.logout_time)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                log.status === 'online'
                                  ? 'bg-green-50 text-green-700 border-green-100'
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                                {log.status === 'online' ? 'Online' : 'Offline'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
</tbody>
                  </table>
                  {filteredSessionLogs.length > 0 && (
  <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
    <p className="text-xs text-gray-400">
      Showing {(sessionPage - 1) * SESSION_ROWS_PER_PAGE + 1}–{Math.min(sessionPage * SESSION_ROWS_PER_PAGE, filteredSessionLogs.length)} of {filteredSessionLogs.length}
    </p>
    <div className="flex items-center gap-1">
      <button
        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
        disabled={sessionPage === 1}
        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
      >
        Prev
      </button>
      {Array.from({ length: sessionTotalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === sessionTotalPages || Math.abs(p - sessionPage) <= 1)
        .reduce((acc, p, idx, arr) => {
          if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>
          ) : (
            <button
              key={p}
              onClick={() => setSessionPage(p)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                sessionPage === p
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          )
        )}
      <button
        onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}
        disabled={sessionPage === sessionTotalPages}
        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
      >
        Next
      </button>
    </div>
  </div>
)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Archived Tab */}
        {activeTab === "archived" && (
          <>
            {archivedLoading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs text-gray-400">Loading archived staff...</p>
              </div>
            ) : archivedEmployees.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs font-medium text-gray-400 mb-1">No archived staff members</p>
                <p className="text-xs text-gray-400">Archived staff will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {archivedEmployees.map((emp) => (
                  <div
                    key={emp.user_id}
                    className="bg-white border border-red-200 ring-1 ring-red-100 rounded-xl p-4 flex flex-col opacity-80"
                  >
                    <div className="flex gap-3 mb-3">
                      <ProfilePicture employee={emp} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{emp.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{emp.email || "No email"}</p>
                        <p className="text-[11px] text-gray-400">Age: {emp.age || "N/A"}</p>
                        <p className="text-[11px] text-gray-400">Contact: {emp.contact_number || "N/A"}</p>
                      </div>
                    </div>
                    <span className="text-[11px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5 w-fit mb-2">
                      Archived
                    </span>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Archived: {new Date(emp.archived_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                      <button
                        className="flex-1 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                        onClick={() => handleRestore(emp.user_id, emp.name)}
                      >
                        Restore
                      </button>
                      <button
                        className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                        onClick={() => handlePermanentDelete(emp.user_id, emp.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StaffManagement;