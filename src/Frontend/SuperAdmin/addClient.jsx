import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddPartnerModal from "../../components/Modals/AddPartnerModal";
import { API_URL } from "../../config";

const AddClient = () => {
  const [showAddForm, setShowAddForm] = useState(false);
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
  });
  const [message, setMessage] = useState("");
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

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
      showNotification("Age must be a valid number.");
      return;
    }

    const sessionFeeValue = formData.session_fee
      ? Number(formData.session_fee)
      : 0;

    try {
      const formPayload = new FormData();
      formPayload.append("admin_name", formData.admin_name);
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

      showNotification("Partner added successfully!", "success");
      setShowAddForm(false);

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
      });

      setAdmins([...admins, { id: response.data.id, ...response.data }]);
    } catch (error) {
      showNotification("Failed to add partner. Please try again.");
    }
  };

  const handleArchive = async (id, isArchived) => {
    try {
      const endpoint = isArchived ? "restore-admin" : "archive-admin";
      const action = isArchived ? "restore" : "archive";

      if (window.confirm(`Are you sure you want to ${action} this partner?`)) {
        await axios.put(`${API_URL}/api/${endpoint}/${id}`);

        setAdmins(
          admins.map((admin) =>
            admin.id === id ? { ...admin, is_archived: !isArchived } : admin
          )
        );

        showNotification(`Partner ${action}d successfully!`, "success");
      }
    } catch (error) {
      showNotification(
        `Failed to ${isArchived ? "restore" : "archive"} partner. Please try again.`
      );
    }
  };

  const handleCloseModal = () => {
    setShowAddForm(false);
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
    });
  };

  const NotificationMessage = ({ message }) => {
    if (!message) return null;

    const isSuccess = message.includes("success");
    const bgColor = isSuccess
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-700";

    return (
      <div className={`p-3 mb-4 rounded-md border ${bgColor} text-sm`}>
        {message}
      </div>
    );
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
          onClick={() => setShowAddForm(true)}
        >
          + Add New Partner
        </button>
      </div>

      <NotificationMessage message={message} />
      <AddPartnerModal
        isOpen={showAddForm}
        onClose={handleCloseModal}
        formData={formData}
        onFormChange={handleChange}
        onSubmit={handleSubmit}
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
                  <span className="font-bold">Owner:</span>{" "}
                  {admin.admin_name}
                </p>
                <p className="text-black text-xs line-clamp-2">
                  <span className="font-bold">Address:</span>{" "}
                  {admin.address}
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors text-xs font-medium"
                    onClick={() => setSelectedAdmin(admin)}
                  >
                    View
                  </button>

                  <button
                    className={`flex-1 px-2 py-1 rounded-md text-white text-xs font-medium transition-colors ${
                      admin.is_archived
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                    onClick={() => handleArchive(admin.id, admin.is_archived)}
                  >
                    {admin.is_archived ? "Restore" : "Archive"}
                  </button>
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
              <strong>Session Fee:</strong> {selectedAdmin.session_fee}
            </p>
            <div className="mt-4 flex justify-end">
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
