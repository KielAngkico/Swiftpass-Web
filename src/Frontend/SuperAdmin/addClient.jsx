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
  
  const [formData, setFormData] = useState({
    admin_name: "",
    age: "",
    address: "",
    email: "",
    password: "",
    gym_name: "",
    system_type: "",
    session_fee: "",
    profile_image_url: null,
    rfid_tag: "",
    rfid_tag_2: "",
  });
  
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const { showToast, showConfirm } = useToast();

  // Fetch all admins
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
  }, []);

  // Handle navigation from RFID scan
  useEffect(() => {
    if (location.state?.openModal) {
      console.log("📨 Opening Add Partner modal (from RFID scan)");
      setShowAddForm(true);
      setModalMode("add");
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Listen for slot-specific RFID scans
  useEffect(() => {
    const handleSlotScan = () => {
      if (!waitingForSlot) return;

      const scannedRfid = sessionStorage.getItem('pendingSlotRfid');
      const scannedAt = sessionStorage.getItem('rfidScannedAt');
      
      if (scannedRfid && scannedAt) {
        const scanAge = Date.now() - parseInt(scannedAt);
        if (scanAge < 3000) {
          console.log(`📨 RFID scanned for slot ${waitingForSlot}:`, scannedRfid);
          
          if (waitingForSlot === 1) {
            setFormData((prev) => ({ ...prev, rfid_tag: scannedRfid }));
            showToast({ message: "✅ RFID Slot 1 scanned!", type: "success" });
          } else if (waitingForSlot === 2) {
            setFormData((prev) => ({ ...prev, rfid_tag_2: scannedRfid }));
            showToast({ message: "✅ RFID Slot 2 scanned!", type: "success" });
          }
          
          setWaitingForSlot(null);
          
          sessionStorage.removeItem('pendingSlotRfid');
          sessionStorage.removeItem('rfidScannedAt');
        }
      }
    };

    window.addEventListener('rfid-slot-scanned', handleSlotScan);
    
    return () => {
      window.removeEventListener('rfid-slot-scanned', handleSlotScan);
    };
  }, [waitingForSlot]);

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

    if (isNaN(formData.age) || String(formData.age).trim() === "") {
      showToast({ message: "Age must be a valid number.", type: "error" });
      return;
    }

    const sessionFeeValue = formData.session_fee ? Number(formData.session_fee) : 0;

    try {
      if (modalMode === "edit" && editingAdmin) {
        const rfid1Changed = formData.rfid_tag !== originalRfid;
        const rfid2Changed = formData.rfid_tag_2 !== originalRfid2;

        if (rfid1Changed && originalRfid) {
          await axios.put(
            `${API_URL}/api/replace-admin-rfid/${editingAdmin.id}`,
            { 
              new_rfid_tag: formData.rfid_tag,
              rfid_slot: 1 
            }
          );
        }

        if (rfid2Changed && originalRfid2) {
          await axios.put(
            `${API_URL}/api/replace-admin-rfid/${editingAdmin.id}`,
            { 
              new_rfid_tag: formData.rfid_tag_2,
              rfid_slot: 2 
            }
          );
        }

        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("age", Number(formData.age));
        formPayload.append("address", formData.address);
        formPayload.append("email", formData.email);
        formPayload.append("gym_name", formData.gym_name);
        formPayload.append("system_type", formData.system_type);
        formPayload.append("session_fee", sessionFeeValue);
        formPayload.append("rfid_tag_2", formData.rfid_tag_2 || "");

        if (formData.password && formData.password.trim() !== "") {
          formPayload.append("password", formData.password);
        }

        if (
          formData.profile_image_url &&
          typeof formData.profile_image_url !== "string"
        ) {
          formPayload.append("profile_image_url", formData.profile_image_url);
        }

        const response = await axios.put(
          `${API_URL}/api/update-admin/${editingAdmin.id}`,
          formPayload,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        showToast({ message: "Partner updated successfully!", type: "success" });

        setAdmins(
          admins.map((admin) =>
            admin.id === editingAdmin.id
              ? {
                  ...admin,
                  admin_name: formData.admin_name,
                  age: formData.age,
                  address: formData.address,
                  email: formData.email,
                  gym_name: formData.gym_name,
                  system_type: formData.system_type,
                  session_fee: sessionFeeValue,
                  profile_image_url:
                    response.data.profile_image_url || admin.profile_image_url,
                  rfid_tag: formData.rfid_tag,
                  rfid_tag_2: formData.rfid_tag_2,
                }
              : admin
          )
        );
      } else {
        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("rfid_tag", formData.rfid_tag);
        formPayload.append("rfid_tag_2", formData.rfid_tag_2 || "");
        formPayload.append("age", Number(formData.age));
        formPayload.append("address", formData.address);
        formPayload.append("email", formData.email);
        formPayload.append("password", formData.password);
        formPayload.append("gym_name", formData.gym_name);
        formPayload.append("system_type", formData.system_type);
        formPayload.append("session_fee", sessionFeeValue);

        if (formData.profile_image_url) {
          formPayload.append("profile_image_url", formData.profile_image_url);
        }

        const response = await axios.post(
          `${API_URL}/api/add-client`,
          formPayload,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        showToast({ message: "Partner added successfully!", type: "success" });

        setAdmins([
          ...admins,
          {
            id: response.data.id,
            admin_name: formData.admin_name,
            age: formData.age,
            address: formData.address,
            email: formData.email,
            gym_name: formData.gym_name,
            system_type: formData.system_type,
            session_fee: sessionFeeValue,
            profile_image_url: response.data.profile_image_url || null,
            rfid_tag: formData.rfid_tag,
            rfid_tag_2: formData.rfid_tag_2,
            is_archived: 0,
          },
        ]);
      }

      // Reset form
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
        age: "",
        address: "",
        email: "",
        password: "",
        gym_name: "",
        system_type: "",
        session_fee: "",
        profile_image_url: null,
        rfid_tag: "",
        rfid_tag_2: "",
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
      age: admin.age,
      address: admin.address,
      email: admin.email,
      password: "",
      gym_name: admin.gym_name,
      system_type: admin.system_type,
      session_fee: admin.session_fee,
      profile_image_url: admin.profile_image_url ? `${API_URL}${admin.profile_image_url}` : null,
      rfid_tag: admin.rfid_tag || "",
      rfid_tag_2: admin.rfid_tag_2 || "",
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
    sessionStorage.removeItem('pendingSlotRfid');
    sessionStorage.removeItem('rfidScannedAt');
    setFormData({
      admin_name: "",
      age: "",
      address: "",
      email: "",
      password: "",
      gym_name: "",
      system_type: "",
      session_fee: "",
      profile_image_url: null,
      rfid_tag: "",
      rfid_tag_2: "",
    });
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