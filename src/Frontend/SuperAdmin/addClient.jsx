import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddPartnerModal from "../../components/Modals/AddPartnerModal";
import { API_URL } from "../../config";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ToastManager";

const AddClient = () => {
  const location = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [isReplacingRfid, setIsReplacingRfid] = useState(false);
  const [originalRfid, setOriginalRfid] = useState(""); // Track original RFID

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
        setMessage("Error fetching partners. Please try again.");
      }
    };
    fetchAdmins();
  }, []);

  // Handle RFID scan from navigation
  useEffect(() => {
    if (location.state?.rfid_tag && location.state?.is_registered === true) {
      console.log("📨 RFID scanned:", location.state.rfid_tag);

      // ✅ ONLY UPDATE FORM FIELD - NO BACKEND CALL YET
      setFormData((prev) => ({
        ...prev,
        rfid_tag: location.state.rfid_tag,
      }));

      // If in replace mode, turn off the flag and show success
      if (isReplacingRfid) {
        setIsReplacingRfid(false);
showToast({ message: " RFID scanned! Click 'Update Partner' to save", type: "success" });
      }

      // For add mode, open the modal
      if (!editingAdmin) {
        setShowAddForm(true);
        setModalMode("add");
      }

      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const showNotification = (msg, type = "error") => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleChange = (e) => {
    if (e.target.type === "file") {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (isNaN(formData.age) || String(formData.age).trim() === "") {
showToast({ message: "Age must be a valid number.", type: "error" });
      return;
    }

    const sessionFeeValue = formData.session_fee ? Number(formData.session_fee) : 0;

    try {
      if (modalMode === "edit" && editingAdmin) {
        // ✅ CHECK IF RFID CHANGED
        const rfidChanged = formData.rfid_tag !== originalRfid;

        if (rfidChanged && originalRfid) {
          console.log("🔄 RFID changed - calling replace API");
          console.log("   Old:", originalRfid);
          console.log("   New:", formData.rfid_tag);

          // ⚡ Call replace-admin-rfid API
          await axios.put(
            `${API_URL}/api/replace-admin-rfid/${editingAdmin.id}`,
            { new_rfid_tag: formData.rfid_tag }
          );

          console.log("✅ RFID replaced in database");
        }

        // ✅ UPDATE OTHER FIELDS
        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("age", Number(formData.age));
        formPayload.append("address", formData.address);
        formPayload.append("email", formData.email);
        formPayload.append("gym_name", formData.gym_name);
        formPayload.append("system_type", formData.system_type);
        formPayload.append("session_fee", sessionFeeValue);

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

        // Update admins list
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
                }
              : admin
          )
        );
      } else {
        // ✅ ADD NEW PARTNER
        const formPayload = new FormData();
        formPayload.append("admin_name", formData.admin_name);
        formPayload.append("rfid_tag", formData.rfid_tag);
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

showToast({ message: " Partner added successfully!", type: "success" });

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
            is_archived: 0,
          },
        ]);
      }

      // Reset form
      setShowAddForm(false);
      setEditingAdmin(null);
      setModalMode("add");
      setIsReplacingRfid(false);
      setOriginalRfid("");
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
      });
    } catch (error) {
      console.error("Partner operation error:", error.response?.data || error);
showToast({ message: `Failed to ${modalMode === "edit" ? "update" : "add"} partner. Please try again.`, type: "error" });

    }
  };

  // Open edit modal
  const handleEdit = (admin) => {
    console.log("✏️ Editing admin:", admin);
    setEditingAdmin(admin);
    setModalMode("edit");
    setOriginalRfid(admin.rfid_tag || ""); // ✅ Store original RFID
    setFormData({
      admin_name: admin.admin_name,
      age: admin.age,
      address: admin.address,
      email: admin.email,
      password: "",
      gym_name: admin.gym_name,
      system_type: admin.system_type,
      session_fee: admin.session_fee,
      profile_image_url: admin.profile_image_url
        ? `${API_URL}${admin.profile_image_url}`
        : null,
      rfid_tag: admin.rfid_tag || "",
    });
    setShowAddForm(true);
  };

  // Set flag for RFID replacement mode
  const handleReplaceRfid = () => {
    console.log("🔄 Replace RFID button clicked");
    setIsReplacingRfid(true);
showToast({ message: "Scan the new RFID tag now...", type: "info" });
  };

  const handleArchive = async (id, isArchived) => {
    try {
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
    } catch (error) {
showToast({ message: `Failed to ${isArchived ? "restore" : "archive"} partner. Please try again.`, type: "error" });

    }
  };

  const handleDelete = async (id, adminName) => {
    const admin = admins.find((a) => a.id === id);
    if (!admin || admin.is_archived === 0) {
showToast({ message: "Only archived accounts can be deleted", type: "error" });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${adminName}"?\n\nThis action cannot be undone and will remove all associated data.`
      )
    ) {
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
          console.error("Delete admin error:", error);
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
    setIsReplacingRfid(false);
    setOriginalRfid("");
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
          onReplaceRfid={handleReplaceRfid}
          isReplacingRfid={isReplacingRfid}
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

        {selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-lg">
              {selectedAdmin.profile_image_url && (
                <img
                  src={`${API_URL}${selectedAdmin.profile_image_url}`}
                  alt={selectedAdmin.gym_name}
                  className="w-full h-36 object-cover rounded-md mb-3"
                />
              )}
              <h2 className="text-lg font-semibold mb-2">
                {selectedAdmin.gym_name}
              </h2>
              <p className="text-sm text-gray-700">
                <strong>Owner:</strong> {selectedAdmin.admin_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {selectedAdmin.email}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Age:</strong> {selectedAdmin.age}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Address:</strong> {selectedAdmin.address}
              </p>
              <p className="text-sm text-gray-700">
                <strong>System:</strong> {selectedAdmin.system_type}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Session Fee:</strong> ₱{selectedAdmin.session_fee}
              </p>
              <p className="text-sm text-gray-700">
                <strong>RFID Tag:</strong> {selectedAdmin.rfid_tag || "N/A"}
              </p>
              <div className="mt-4 flex justify:end">
                <button
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs hover:bg-gray-300"
                  onClick={() => setSelectedAdmin(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddClient;
