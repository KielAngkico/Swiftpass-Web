import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddPartnerModal from "../../components/Modals/AddPartnerModal";
import ViewPartnerModal from "../../components/Modals/ViewPartnerModal";
import { API_URL } from "../../config";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ToastManager";

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
  
  // ✅ FIX: Include packages in initial state
const [formData, setFormData] = useState({
  admin_name: "",
  address: "",
  email: "",
  password: "",
  gym_name: "",
  system_type: "",
  package_id: "",
  payment_method: "Cash",  // ← Add this
  reference_number: "",     // ← Add this
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
    paymentOptions  // ← Add this
  }));
}, [packages, paymentOptions]);  // ← Add paymentOptions dependency

  useEffect(() => {
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pending-registrations`);
      setPendingRegistrations(response.data);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
    }
  };

  // ✅ FIX: Include packages when populating from registration
const handleRegistrationClick = (registration) => {
  setFormData({
    admin_name: registration.admin_name || "",
    address: registration.address || "",
    email: registration.email || "",
    password: registration.password || "",
    gym_name: registration.gym_name || "",
    system_type: registration.system_type || "",
    package_id: registration.package_id || "",
    payment_method: "Cash",      // ← Add this
    reference_number: "",         // ← Add this
    profile_image_url: registration.profile_image_url ? `${API_URL}${registration.profile_image_url}` : null,
    rfid_tag: "",
    rfid_tag_2: "",
    packages: packages,
    paymentOptions: paymentOptions,  // ← Add this
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

useEffect(() => {
  const handleSlotScan = () => {
    if (!waitingForSlot || !editingAdmin) return;

    const scannedRfid = sessionStorage.getItem("pendingSlotRfid");
    const scannedAt = sessionStorage.getItem("rfidScannedAt");

    if (scannedRfid && scannedAt) {
      const scanAge = Date.now() - parseInt(scannedAt, 10);
      if (scanAge < 3000) {
        console.log(`📨 RFID scanned for slot ${waitingForSlot}:`, scannedRfid);

        // Update correct slot
        if (waitingForSlot === 1) {
          setFormData((prev) => ({ ...prev, rfid_tag: scannedRfid }));
        } else if (waitingForSlot === 2) {
          setFormData((prev) => ({ ...prev, rfid_tag_2: scannedRfid }));
        }

        showToast({ message: `✅ RFID Slot ${waitingForSlot} scanned!`, type: "success" });
        setWaitingForSlot(null);

        // Clear sessionStorage
        sessionStorage.removeItem("pendingSlotRfid");
        sessionStorage.removeItem("rfidScannedAt");
      }
    }
  };

  window.addEventListener("rfid-slot-scanned", handleSlotScan);

  return () => {
    window.removeEventListener("rfid-slot-scanned", handleSlotScan);
  };
}, [waitingForSlot, editingAdmin]);


  const handleChange = (e) => {
    if (e.target.type === "file") {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleScanSlot = (slotNumber) => {
    setWaitingForSlot(slotNumber);
    showToast({ 
      message: `🔄 Waiting for RFID Slot ${slotNumber}... Please scan now`, 
      type: "info",
      duration: 5000
    });
    
    setTimeout(() => {
      setWaitingForSlot((current) => {
        if (current === slotNumber) {
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
    if (modalMode === "edit" && editingAdmin) {
      // 1️⃣ Check if RFID changed
      const rfid1Changed = formData.rfid_tag !== originalRfid;
      const rfid2Changed = formData.rfid_tag_2 !== originalRfid2;

      if ((rfid1Changed && formData.rfid_tag) || (rfid2Changed && formData.rfid_tag_2)) {
        await axios.put(`${API_URL}/api/update-admin-rfid/${editingAdmin.id}`, {
          new_rfid_tag: formData.rfid_tag || null,
          new_rfid_tag_2: formData.rfid_tag_2 || null,
        });
        showToast({ message: "RFID updated successfully!", type: "success" });
      }

      // 2️⃣ Update other fields separately
      const generalPayload = new FormData();
      generalPayload.append("admin_name", formData.admin_name);
      generalPayload.append("address", formData.address);
      generalPayload.append("email", formData.email);
      generalPayload.append("gym_name", formData.gym_name);
      generalPayload.append("system_type", formData.system_type);
      generalPayload.append("package_id", formData.package_id || "");

      if (formData.profile_image_url && typeof formData.profile_image_url !== "string") {
        generalPayload.append("profile_image_url", formData.profile_image_url);
      }

      await axios.put(`${API_URL}/api/update-admin-general/${editingAdmin.id}`, generalPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast({ message: "Partner information updated!", type: "success" });
    }
  } catch (error) {
    showToast({ message: "Failed to update partner. Please try again.", type: "error" });
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
      system_type: admin.system_type,
      package_id: admin.package_id || "",
      payment_method: "Cash",      // ← Add this
      reference_number: "",         // ← Add this
      profile_image_url: admin.profile_image_url ? `${API_URL}${admin.profile_image_url}` : null,
      rfid_tag: admin.rfid_tag || "",
      rfid_tag_2: admin.rfid_tag_2 || "",
      packages: packages,
      paymentOptions: paymentOptions,  // ← Add this
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

  // ✅ FIX: Keep packages when closing modal
  const handleCloseModal = () => {
    setShowAddForm(false);
    setEditingAdmin(null);
    setModalMode("add");
    setWaitingForSlot(null);
    setOriginalRfid("");
    setOriginalRfid2("");
    sessionStorage.removeItem('pendingSlotRfid');
    sessionStorage.removeItem('rfidScannedAt');
    setFormData({
      admin_name: "",
      address: "",
      email: "",
      password: "",
      gym_name: "",
      system_type: "",
      package_id: "",
      profile_image_url: null,
      rfid_tag: "",
      rfid_tag_2: "",
      packages: packages, // ← Added
    });
  };

  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt);
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
                      <p className="text-xs text-gray-500">
                        Expires: {getTimeRemaining(registration.created_at)}
                      </p>
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