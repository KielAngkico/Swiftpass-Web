import React from "react";
import { API_URL } from "../../config";

const ViewPartnerModal = ({ isOpen, onClose, admin, onEdit }) => {
  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-lg max-h-[90vh] overflow-y-auto">
        {admin.profile_image_url && (
          <img
            src={`${API_URL}${admin.profile_image_url}`}
            alt={admin.gym_name}
            className="w-full h-36 object-cover rounded-md mb-3"
          />
        )}
        
        <h2 className="text-lg font-semibold mb-2">{admin.gym_name}</h2>
        
        <div className="space-y-1.5">
          <p className="text-sm text-gray-700">
            <strong>Owner:</strong> {admin.admin_name}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Email:</strong> {admin.email}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Age:</strong> {admin.age}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Address:</strong> {admin.address}
          </p>
          <p className="text-sm text-gray-700">
            <strong>System:</strong> {admin.system_type}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Session Fee:</strong> ₱{admin.session_fee}
          </p>
          <p className="text-sm text-gray-700">
            <strong>RFID Tag 1:</strong> {admin.rfid_tag || "N/A"}
          </p>
          <p className="text-sm text-gray-700">
            <strong>RFID Tag 2:</strong> {admin.rfid_tag_2 || "N/A"}
          </p>
          {admin.is_archived === 1 && (
            <div className="mt-2 px-2 py-1 bg-red-100 border border-red-300 rounded text-red-700 text-xs font-medium">
              ⚠️ This partner is archived
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          {admin.is_archived === 0 && onEdit && (
            <button
              className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs hover:bg-blue-600 transition-colors font-medium"
              onClick={() => {
                onEdit(admin);
                onClose();
              }}
            >
              Edit
            </button>
          )}
          <button
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs hover:bg-gray-300 transition-colors font-medium"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPartnerModal;