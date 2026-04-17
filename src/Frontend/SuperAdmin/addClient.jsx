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

  const [formData, setFormData] = useState({
    admin_name: "",
    address: "",
    email: "",
    password: "",
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

  // ✅ WebSocket for RFID scanning
  const {
    scannedRfidForPartner,
    enablePartnerScanMode,
    disablePartnerScanMode,
    clearScannedPartnerRfid
  } = useWebSocket();

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subscription-packages`);
      console.log("📦 Fetched packages:", response.data);
      setPackages(response.data);
    } catch (error) {
      console.error("Failed to fetch packages:", error);
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
    setFormData(prev => ({
      ...prev,
      packages,
      paymentOptions
    }));
  }, [packages, paymentOptions]);

  useEffect(() => {
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30000);
    return () => clearInterval(interval);
  }, []);
useEffect(() => {
  const handlePartnerSlotError = (e) => {
    showToast({ message: `❌ ${e.detail.reason}`, type: "error" });
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
    password: registration.password || "",
    gym_name: registration.gym_name || "",
    system_type: registration.system_type || "",
    package_id: registration.package_id || "",
    payment_method: "Cash",
    reference_number: "",
    profile_image_url: imageFile, // ✅ File object, not a URL string
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
    showConfirm(
      "Delete this registration request?",
      async () => {
        try {
          await axios.delete(`${API_URL}/api/pending-registrations/${registrationNumber}`);
          fetchPendingRegistrations();
          showToast({ message: "Registration deleted successfully!", type: "success" });
        } catch (error) {
          showToast({ message: "Failed to delete registration", type: "error" });
        }
      }
    );
  };

  useEffect(() => {
    if (location.state?.openModal) {
      console.log("📨 Opening Add Partner modal (from RFID scan)");
      setShowAddForm(true);
      setModalMode("add");

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // ✅ Handle scanned partner RFID from WebSocket
  useEffect(() => {
    if (scannedRfidForPartner && waitingForSlot) {
      const { rfid_tag, slot } = scannedRfidForPartner;

      console.log(`📨 Partner RFID scanned for slot ${slot}:`, rfid_tag);

      if (slot === 1) {
        setFormData((prev) => ({ ...prev, rfid_tag: rfid_tag }));
        showToast({ message: "✅ RFID Slot 1 scanned!", type: "success" });
      } else if (slot === 2) {
        setFormData((prev) => ({ ...prev, rfid_tag_2: rfid_tag }));
        showToast({ message: "✅ RFID Slot 2 scanned!", type: "success" });
      }

      setWaitingForSlot(null);
      disablePartnerScanMode();
      clearScannedPartnerRfid();
    }
  }, [scannedRfidForPartner, waitingForSlot]);

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
  enablePartnerScanMode(slotNumber, editingAdmin?.id); // ← pass adminId

  showToast({
    message: `🔄 Waiting for RFID Slot ${slotNumber}... Scan the Partner card`,
    type: "info",
    duration: 5000
  });

  setTimeout(() => {
    setWaitingForSlot((current) => {
      if (current === slotNumber) {
        disablePartnerScanMode();
        showToast({ message: "⏱️ Scan timeout - please try again", type: "warning" });
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
        const rfid1Changed = formData.rfid_tag !== originalRfid;
        const rfid2Changed = formData.rfid_tag_2 !== originalRfid2;

        if ((rfid1Changed && formData.rfid_tag) || (rfid2Changed && formData.rfid_tag_2)) {
          await axios.put(`${API_URL}/api/update-admin-rfid/${editingAdmin.id}`, {
            new_rfid_tag: formData.rfid_tag || null,
            new_rfid_tag_2: formData.rfid_tag_2 || null,
          });

          showToast({ message: "RFID updated successfully!", type: "success" });

          setAdmins(admins.map((admin) =>
            admin.id === editingAdmin.id
              ? { ...admin, rfid_tag: formData.rfid_tag, rfid_tag_2: formData.rfid_tag_2 }
              : admin
          ));

          setShowAddForm(false);
          setEditingAdmin(null);
          setOriginalRfid("");
          setOriginalRfid2("");
          setWaitingForSlot(null);
          disablePartnerScanMode();
          return;
        }
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

        const response = await axios.post(
          `${API_URL}/api/add-client`,
          formPayload,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        showToast({ message: "Partner added successfully!", type: "success" });

        if (modalMode === "registration" && editingAdmin?.registrationNumber) {
          await axios.delete(`${API_URL}/api/pending-registrations/${editingAdmin.registrationNumber}`);
          fetchPendingRegistrations();
        }

        setAdmins([
          ...admins,
          {
            id: response.data.id,
            admin_name: formData.admin_name,
            address: formData.address,
            email: formData.email,
            gym_name: formData.gym_name,
            gym_code: "",
            system_type: formData.system_type,
            package_id: formData.package_id,
            profile_image_url: response.data.profile_image_url || null,
            rfid_tag: null,
            rfid_tag_2: null,
            is_archived: 0,
          },
        ]);
      }

      setShowAddForm(false);
      setEditingAdmin(null);
      setModalMode("add");
      setWaitingForSlot(null);
      setOriginalRfid("");
      setOriginalRfid2("");
      disablePartnerScanMode();
      
      setFormData({
        admin_name: "",
        address: "",
        email: "",
        password: "",
        gym_name: "",
        system_type: "",
        package_id: "",
        payment_method: "Cash",
        reference_number: "",
        profile_image_url: null,
        rfid_tag: "",
        rfid_tag_2: "",
        packages: packages,
        paymentOptions: paymentOptions,
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

    showConfirm(
      `Are you sure you want to ${action} this partner?`,
      async () => {
        try {
          await axios.put(`${API_URL}/api/${endpoint}/${id}`);
          setAdmins(admins.map((admin) => admin.id === id ? { ...admin, is_archived: !isArchived } : admin));
          showToast({ message: `Partner ${action}d successfully!`, type: "success" });
        } catch (error) {
          showToast({ message: `Failed to ${isArchived ? "restore" : "archive"} partner. Please try again.`, type: "error" });
        }
      }
    );
  };

  const handleDelete = async (id, adminName) => {
    const admin = admins.find((a) => a.id === id);
    if (!admin || admin.is_archived === 0) {
      showToast({ message: "Only archived accounts can be deleted", type: "error" });
      return;
    }

    showConfirm(
      `Are you sure you want to permanently delete "${adminName}"?\n\nThis action cannot be undone and will remove all associated data.`,
      () => {
        showConfirm(
          `FINAL WARNING: Permanently delete "${adminName}"? This will delete all members, transactions, and logs associated with this account.`,
          async () => {
            try {
              await axios.delete(`${API_URL}/api/delete-admin/${id}`);
              setAdmins(admins.filter((admin) => admin.id !== id));
              setSelectedAdmin(null);
              showToast({ message: `${adminName} deleted permanently!`, type: "success" });
            } catch (error) {
              showToast({ message: `Failed to delete ${adminName}. Please try again.`, type: "error" });
            }
          }
        );
      }
    );
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
      admin_name: "",
      address: "",
      email: "",
      password: "",
      gym_name: "",
      system_type: "",
      package_id: "",
      payment_method: "Cash",
      reference_number: "",
      profile_image_url: null,
      rfid_tag: "",
      rfid_tag_2: "",
      packages: packages,
      paymentOptions: paymentOptions,
    });
  };

const getTimeRemaining = (createdAt) => {
  const created = new Date(createdAt); // ISO format parses fine as-is
  const expiresAt = new Date(created.getTime() + 60 * 60 * 1000);
  const now = new Date();
  const diff = expiresAt - now;

  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / 60000);
  return `${minutes} min left`;
};
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 p-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-800">
            Partner Management
          </h1>
          <p className="text-gray-600 text-xs">
            Manage your gym partners and their information
          </p>
        </div>

        {pendingRegistrations.length > 0 && (
          <div className="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Pending Registrations ({pendingRegistrations.length})
                </h2>
                <p className="text-xs text-gray-600">Click a registration to review and approve</p>
              </div>
              <button
                onClick={() => setShowRegistrations(!showRegistrations)}
                className="text-gray-700 hover:text-gray-900 text-xs font-medium underline"
              >
                {showRegistrations ? "Hide" : "Show"}
              </button>
            </div>

            {showRegistrations && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pendingRegistrations.map((registration) => (
                  <div
                    key={registration.registration_number}
                    onClick={() => handleRegistrationClick(registration)}
                    className="bg-white border border-gray-300 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-gray-500 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium">
                        {registration.registration_number}
                      </span>
                      <button
                        onClick={(e) => handleDeleteRegistration(registration.registration_number, e)}
                        className="text-gray-400 hover:text-red-600 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>

                    <h3 className="font-semibold text-base text-gray-900">
                      {registration.gym_name}
                    </h3>
<div className="mt-2 pt-2 border-t border-gray-200">
  {getTimeRemaining(registration.created_at) === "Expired" ? (
    <p className="text-xs text-red-500 font-medium">Expired</p>
  ) : (
    <p className="text-xs text-gray-500">
      Expires in: {getTimeRemaining(registration.created_at)}
    </p>
  )}
</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium w-full sm:w-auto"
            onClick={() => {
              setModalMode("add");
              setEditingAdmin(null);
              setShowAddForm(true);
            }}
          >
            + Add New Partner
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

        {admins.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-md border">
            <div className="text-gray-400 text-sm mb-1">No partners found</div>
            <div className="text-gray-500 text-xs">
              Add your first partner to get started
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className={`rounded-lg border shadow-sm transition-all text-xs ${
                  admin.is_archived
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200 hover:shadow-md"
                }`}
              >
                {admin.profile_image_url && (
                  <img
                    src={`${API_URL}${admin.profile_image_url}`}
                    alt={admin.gym_name}
                    className="w-full h-28 object-cover rounded-t-lg"
                  />
                )}

                <div className="p-3">
                  <h3 className="font-bold text-black text-sm truncate">
                    {admin.gym_name}
                  </h3>
                  <p className="text-black text-xs truncate">
                    <span className="font-bold">Owner:</span> {admin.admin_name}
                  </p>
                  <p className="text-black text-xs line-clamp-2">
                    <span className="font-bold">Address:</span> {admin.address}
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button
                      className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors text-xs font-medium"
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      View
                    </button>

                    {admin.is_archived ? (
                      <>
                        <button
                          className="flex-1 px-2 py-1 rounded-md text-white text-xs font-medium transition-colors bg-green-500 hover:bg-green-600"
                          onClick={() =>
                            handleArchive(admin.id, admin.is_archived)
                          }
                        >
                          Restore
                        </button>
                        <button
                          className="flex-1 px-2 py-1 rounded-md text-white text-xs font-medium transition-colors bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(admin.id, admin.gym_name)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex-1 bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors text-xs font-medium"
                          onClick={() => handleEdit(admin)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 px-2 py-1 rounded-md text-white text-xs font-medium transition-colors bg-red-500 hover:bg-red-600"
                          onClick={() =>
                            handleArchive(admin.id, admin.is_archived)
                          }
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddClient;
