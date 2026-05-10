import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddPartnerModal from "../../components/Modals/AddPartnerModal";
import ViewPartnerModal from "../../components/Modals/ViewPartnerModal";
import { API_URL } from "../../config";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ToastManager";
import { useWebSocket } from "../../contexts/WebSocketContext";

const AddClient = () => {
  const location = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [waitingForSlot, setWaitingForSlot] = useState(null);
  const [originalRfid, setOriginalRfid] = useState("");
  const [originalRfid2, setOriginalRfid2] = useState("");
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [showRegistrations, setShowRegistrations] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  const [formData, setFormData] = useState({
    admin_name: "",
    address: "",
    email: "",
    password: "pass123",
    gym_name: "",
    gym_code: "",
    system_type: "",
    package_id: "",
    payment_method: "Cash",
    reference_number: "",
    profile_image_url: null,
    rfid_tag: "",
    rfid_tag_2: "",
    packages: [],
  });

  const [admins, setAdmins] = useState([]);
  const [packages, setPackages] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const { showToast, showConfirm } = useToast();

  const {
    scannedRfidForPartner,
    enablePartnerScanMode,
    disablePartnerScanMode,
    clearScannedPartnerRfid
  } = useWebSocket();

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subscription-packages`);
      setPackages(response.data);
    } catch (error) {
      showToast({ message: "Failed to load packages", type: "error" });
    }
  };

  const fetchPaymentOptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payment-options`);
      setPaymentOptions(response.data);
    } catch (error) {
      console.error("Failed to fetch payment options:", error);
    }
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admins`);
        setAdmins(response.data);
      } catch (error) {
        showToast({ message: "Error fetching partners. Please try again.", type: "error" });
      }
    };
    fetchAdmins();
    fetchPackages();
    fetchPaymentOptions();
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, packages, paymentOptions }));
  }, [packages, paymentOptions]);

  useEffect(() => {
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePartnerSlotError = (e) => {
      showToast({ message: e.detail.reason, type: "error" });
      setWaitingForSlot(null);
      disablePartnerScanMode();
    };
    window.addEventListener('partner-slot-error', handlePartnerSlotError);
    return () => window.removeEventListener('partner-slot-error', handlePartnerSlotError);
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pending-registrations`);
      setPendingRegistrations(response.data);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
    }
  };

  const handleRegistrationClick = async (registration) => {
    let imageFile = null;
    if (registration.profile_image_url) {
      try {
        const response = await fetch(`${API_URL}${registration.profile_image_url}`);
        const blob = await response.blob();
        const filename = registration.profile_image_url.split("/").pop();
        imageFile = new File([blob], filename, { type: blob.type });
      } catch (err) {
        console.error("Failed to fetch registration image:", err);
      }
    }

    setFormData({
      admin_name: registration.admin_name || "",
      address: registration.address || "",
      email: registration.email || "",
      password: registration.password || "pass123",
      gym_name: registration.gym_name || "",
      gym_code: registration.gym_code || "",
      system_type: registration.system_type || "",
      package_id: registration.package_id ? String(registration.package_id) : "",
      payment_method: "Cash",
      reference_number: "",
      profile_image_url: imageFile,
      rfid_tag: "",
      rfid_tag_2: "",
      packages: packages,
      paymentOptions: paymentOptions,
    });

    setModalMode("registration");
    setEditingAdmin({ registrationNumber: registration.registration_number });
    setShowAddForm(true);
  };

  const handleDeleteRegistration = async (registrationNumber, e) => {
    e.stopPropagation();
    showConfirm("Delete this registration request?", async () => {
      try {
        await axios.delete(`${API_URL}/api/pending-registrations/${registrationNumber}`);
        fetchPendingRegistrations();
        showToast({ message: "Registration deleted successfully!", type: "success" });
      } catch (error) {
        showToast({ message: "Failed to delete registration", type: "error" });
      }
    });
  };

  useEffect(() => {
    if (location.state?.openModal) {
      setShowAddForm(true);
      setModalMode("add");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

useEffect(() => {
    if (scannedRfidForPartner && waitingForSlot) {
      const { rfid_tag, slot } = scannedRfidForPartner;
      if (slot === 1) {
        setFormData((prev) => ({ ...prev, rfid_tag: rfid_tag }));
        showToast({ message: "RFID Slot 1 scanned successfully", type: "success" });
      } else if (slot === 2) {
        setFormData((prev) => ({ ...prev, rfid_tag_2: rfid_tag }));
        showToast({ message: "RFID Slot 2 scanned successfully", type: "success" });
      }
      setWaitingForSlot(null);
      disablePartnerScanMode();
      clearScannedPartnerRfid();
    }
  }, [scannedRfidForPartner, waitingForSlot]);

  useEffect(() => {
    const handleTimeout = (e) => {
      if (e.detail?.status === "timeout") {
        setWaitingForSlot(null);
        disablePartnerScanMode();
        showToast({ message: "Scan timed out — please try again", type: "warning" });
      }
    };
    window.addEventListener("partner-slot-scan-result", handleTimeout);
    return () => window.removeEventListener("partner-slot-scan-result", handleTimeout);
  }, []);

  const handleChange = (e) => {
    if (e.target.type === "file") {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    } else if (e.target.name === "gym_code") {
      setFormData({ ...formData, gym_code: e.target.value.toUpperCase() });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleScanSlot = (slotNumber) => {
    setWaitingForSlot(slotNumber);
    enablePartnerScanMode(slotNumber, editingAdmin?.id);
    showToast({ message: `Waiting for RFID Slot ${slotNumber} — scan the card now`, type: "info", duration: 5000 });

    setTimeout(() => {
      setWaitingForSlot((current) => {
        if (current === slotNumber) {
          disablePartnerScanMode();
          showToast({ message: "Scan timeout — please try again", type: "warning" });
          return null;
        }
        return current;
      });
    }, 10000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "edit" && editingAdmin && !editingAdmin.registrationNumber) {
        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("email", formData.email);
        formPayload.append("address", formData.address);
        formPayload.append("gym_name", formData.gym_name);
        formPayload.append("gym_code", formData.gym_code || "");
        formPayload.append("system_type", formData.system_type);
        if (formData.password) formPayload.append("password", formData.password);
        if (formData.profile_image_url instanceof File) {
          formPayload.append("profile_image_url", formData.profile_image_url);
        }

        await axios.put(`${API_URL}/api/update-admin/${editingAdmin.id}`, formPayload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const rfid1Changed = formData.rfid_tag !== originalRfid;
        const rfid2Changed = formData.rfid_tag_2 !== originalRfid2;
        if ((rfid1Changed && formData.rfid_tag) || (rfid2Changed && formData.rfid_tag_2)) {
          await axios.put(`${API_URL}/api/update-admin-rfid/${editingAdmin.id}`, {
            new_rfid_tag: formData.rfid_tag || null,
            new_rfid_tag_2: formData.rfid_tag_2 || null,
          });
        }

        showToast({ message: "Partner updated successfully!", type: "success" });

        setAdmins(admins.map((admin) =>
          admin.id === editingAdmin.id
            ? {
                ...admin,
                admin_name: formData.admin_name,
                email: formData.email,
                address: formData.address,
                gym_name: formData.gym_name,
                gym_code: formData.gym_code,
                system_type: formData.system_type,
                rfid_tag: formData.rfid_tag,
                rfid_tag_2: formData.rfid_tag_2,
              }
            : admin
        ));

      } else {
        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("address", formData.address);
        formPayload.append("email", formData.email);
        formPayload.append("password", formData.password);
        formPayload.append("gym_name", formData.gym_name);
        formPayload.append("gym_code", formData.gym_code || "");
        formPayload.append("system_type", formData.system_type);
        formPayload.append("package_id", formData.package_id || "");
        formPayload.append("payment_method", formData.payment_method || "Cash");
        formPayload.append("reference_number", formData.reference_number || "");
        if (formData.profile_image_url) {
          formPayload.append("profile_image_url", formData.profile_image_url);
        }

        const response = await axios.post(`${API_URL}/api/add-client`, formPayload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        showToast({ message: "Partner added successfully!", type: "success" });

        if (modalMode === "registration" && editingAdmin?.registrationNumber) {
          await axios.delete(`${API_URL}/api/pending-registrations/${editingAdmin.registrationNumber}`);
          fetchPendingRegistrations();
        }

        setAdmins([...admins, {
          id: response.data.id,
          admin_name: formData.admin_name,
          address: formData.address,
          email: formData.email,
          gym_name: formData.gym_name,
          gym_code: formData.gym_code || "",
          system_type: formData.system_type,
          package_id: formData.package_id,
          profile_image_url: response.data.profile_image_url || null,
          rfid_tag: null,
          rfid_tag_2: null,
          is_archived: 0,
        }]);
      }

      setShowAddForm(false);
      setEditingAdmin(null);
      setModalMode("add");
      setWaitingForSlot(null);
      setOriginalRfid("");
      setOriginalRfid2("");
      disablePartnerScanMode();
      setFormData({
        admin_name: "", address: "", email: "", password: "",
        gym_name: "", gym_code: "", system_type: "", package_id: "",
        payment_method: "Cash", reference_number: "",
        profile_image_url: null, rfid_tag: "", rfid_tag_2: "",
        packages: packages, paymentOptions: paymentOptions,
      });
    } catch (error) {
      showToast({ message: `Failed to ${modalMode === "edit" ? "update" : "add"} partner. Please try again.`, type: "error" });
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setModalMode("edit");
    setOriginalRfid(admin.rfid_tag || "");
    setOriginalRfid2(admin.rfid_tag_2 || "");
    setFormData({
      admin_name: admin.admin_name,
      address: admin.address,
      email: admin.email,
      password: "",
      gym_name: admin.gym_name,
      gym_code: admin.gym_code || "",
      system_type: admin.system_type,
      package_id: admin.package_id || "",
      payment_method: "Cash",
      reference_number: "",
      profile_image_url: admin.profile_image_url ? `${API_URL}${admin.profile_image_url}` : null,
      rfid_tag: admin.rfid_tag || "",
      rfid_tag_2: admin.rfid_tag_2 || "",
      packages: packages,
      paymentOptions: paymentOptions,
    });
    setShowAddForm(true);
  };

  const handleArchive = async (id, isArchived) => {
    const endpoint = isArchived ? "restore-admin" : "archive-admin";
    const action = isArchived ? "restore" : "archive";
    showConfirm(`Are you sure you want to ${action} this partner?`, async () => {
      try {
        await axios.put(`${API_URL}/api/${endpoint}/${id}`);
        setAdmins(admins.map((admin) => admin.id === id ? { ...admin, is_archived: isArchived ? 0 : 1 } : admin));
        showToast({ message: `Partner ${action}d successfully!`, type: "success" });
      } catch (error) {
        showToast({ message: `Failed to ${action} partner. Please try again.`, type: "error" });
      }
    });
  };

  const handleDelete = async (id, adminName) => {
    const admin = admins.find((a) => a.id === id);
    if (!admin || admin.is_archived === 0) {
      showToast({ message: "Only archived accounts can be deleted", type: "error" });
      return;
    }
    showConfirm(`Permanently delete "${adminName}"? This cannot be undone.`, () => {
      showConfirm(`FINAL WARNING: This will delete all members, transactions, and logs for "${adminName}".`, async () => {
        try {
          await axios.delete(`${API_URL}/api/delete-admin/${id}`);
          setAdmins(admins.filter((admin) => admin.id !== id));
          setSelectedAdmin(null);
          showToast({ message: `${adminName} deleted permanently!`, type: "success" });
        } catch (error) {
          showToast({ message: `Failed to delete ${adminName}. Please try again.`, type: "error" });
        }
      });
    });
  };

  const handleCloseModal = () => {
    setShowAddForm(false);
    setEditingAdmin(null);
    setModalMode("add");
    setWaitingForSlot(null);
    setOriginalRfid("");
    setOriginalRfid2("");
    disablePartnerScanMode();
    setFormData({
      admin_name: "", address: "", email: "", password: "",
      gym_name: "", gym_code: "", system_type: "", package_id: "",
      payment_method: "Cash", reference_number: "",
      profile_image_url: null, rfid_tag: "", rfid_tag_2: "",
      packages: packages, paymentOptions: paymentOptions,
    });
  };

  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + 60 * 60 * 1000);
    const diff = expiresAt - new Date();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min left`;
  };

  const activePartners = admins.filter(a => !a.is_archived);
  const archivedPartners = admins.filter(a => a.is_archived);
  const displayedAdmins = activeTab === "active" ? activePartners : archivedPartners;

  const tabs = [
    { id: "active", label: "Active Partners", count: activePartners.length },
    { id: "archived", label: "Archived Partners", count: archivedPartners.length },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Partner Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage gym partners and their account information</p>
        </div>

        {/* Pending Registrations */}
        {pendingRegistrations.length > 0 && (
          <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">Pending Registrations</span>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {pendingRegistrations.length}
                </span>
              </div>
              <button
                onClick={() => setShowRegistrations(!showRegistrations)}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              >
                {showRegistrations ? "Hide" : "Show"}
              </button>
            </div>

            {showRegistrations && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {pendingRegistrations.map((registration) => {
                  const timeLeft = getTimeRemaining(registration.created_at);
                  const isExpired = timeLeft === "Expired";
                  return (
                    <div
                      key={registration.registration_number}
                      onClick={() => handleRegistrationClick(registration)}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col cursor-pointer hover:border-blue-400 hover:ring-1 hover:ring-blue-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                          {registration.registration_number}
                        </span>
                        <button
                          onClick={(e) => handleDeleteRegistration(registration.registration_number, e)}
                          className="bg-white text-red-500 border border-red-100 hover:bg-red-50 w-5 h-5 rounded-full text-xs font-medium transition-colors flex items-center justify-center leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate mb-1">{registration.gym_name}</p>
                      <p className="text-[11px] text-gray-400 truncate mb-auto">{registration.admin_name}</p>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className={`text-[11px] font-medium ${isExpired ? "text-red-500" : "text-gray-400"}`}>
                          {isExpired ? "Expired" : timeLeft}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tabs + Add Button Row */}
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
            onClick={() => { setModalMode("add"); setEditingAdmin(null); setShowAddForm(true); }}
          >
            Add New Partner
          </button>
        </div>

        <AddPartnerModal
          isOpen={showAddForm}
          onClose={handleCloseModal}
          formData={formData}
          onFormChange={handleChange}
          onSubmit={handleSubmit}
          mode={modalMode}
          onScanSlot={handleScanSlot}
          waitingForSlot={waitingForSlot}
        />

        <ViewPartnerModal
          isOpen={!!selectedAdmin}
          onClose={() => setSelectedAdmin(null)}
          admin={selectedAdmin}
          onEdit={handleEdit}
        />

        {/* Active Tab */}
        {activeTab === "active" && (
          <>
            {activePartners.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs font-medium text-gray-400 mb-1">No active partners yet</p>
                <p className="text-xs text-gray-400 mb-3">Add your first partner to get started</p>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  onClick={() => { setModalMode("add"); setEditingAdmin(null); setShowAddForm(true); }}
                >
                  Add Partner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {activePartners.map((admin) => (
                  <div
                    key={admin.id}
                    className="bg-white border border-gray-200 rounded-xl flex flex-col hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    {admin.profile_image_url && (
                      <img
                        src={`${API_URL}${admin.profile_image_url}`}
                        alt={admin.gym_name}
                        className="w-full h-28 object-cover rounded-t-xl"
                      />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-900 truncate flex-1">{admin.gym_name}</p>
                        {admin.gym_code && (
                          <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                            {admin.gym_code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mb-0.5">{admin.admin_name}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mb-auto">{admin.address}</p>
                      <span className="mt-2 text-[11px] bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5 w-fit">
                        Active
                      </span>
                      <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                        <button
                          className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          onClick={() => setSelectedAdmin(admin)}
                        >
                          View
                        </button>
                        <button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                          onClick={() => handleEdit(admin)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          onClick={() => handleArchive(admin.id, admin.is_archived)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Archived Tab */}
        {activeTab === "archived" && (
          <>
            {archivedPartners.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-xs font-medium text-gray-400 mb-1">No archived partners</p>
                <p className="text-xs text-gray-400">Archived partners will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {archivedPartners.map((admin) => (
                  <div
                    key={admin.id}
                    className="bg-white border border-red-200 ring-1 ring-red-100 rounded-xl flex flex-col opacity-80"
                  >
                    {admin.profile_image_url && (
                      <img
                        src={`${API_URL}${admin.profile_image_url}`}
                        alt={admin.gym_name}
                        className="w-full h-28 object-cover rounded-t-xl"
                      />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-900 truncate flex-1">{admin.gym_name}</p>
                        {admin.gym_code && (
                          <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                            {admin.gym_code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mb-0.5">{admin.admin_name}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mb-auto">{admin.address}</p>
                      <span className="mt-2 text-[11px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5 w-fit">
                        Archived
                      </span>
                      <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                        <button
                          className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          onClick={() => setSelectedAdmin(admin)}
                        >
                          View
                        </button>
                        <button
                          className="flex-1 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          onClick={() => handleArchive(admin.id, admin.is_archived)}
                        >
                          Restore
                        </button>
                        <button
                          className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          onClick={() => handleDelete(admin.id, admin.gym_name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddClient;