import React from "react";
import { API_URL } from "../../config";

const ViewPartnerModal = ({ isOpen, onClose, admin, onEdit }) => {
  if (!isOpen || !admin) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Partner Details
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Archived Badge */}
        {admin.is_archived === 1 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700">
              <strong>⚠️ This partner is archived</strong>
            </p>
          </div>
        )}

        {/* Form-like Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ======================== COLUMN 1 ======================== */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gym Name
              </label>
              <input
                type="text"
                value={admin.gym_name}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gym Address
              </label>
              <textarea
                value={admin.address}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed resize-none"
                rows="2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Admin Name
              </label>
              <input
                type="text"
                value={admin.admin_name}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="text"
                value={admin.age}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={admin.email}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value="••••••••"
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* ======================== COLUMN 2 ======================== */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                RFID Tag 1
              </label>
              <input
                type="text"
                value={admin.rfid_tag || "N/A"}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                RFID Tag 2 <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={admin.rfid_tag_2 || "N/A"}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                System Type
              </label>
              <input
                type="text"
                value={admin.system_type}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Session Fee (₱)
              </label>
              <input
                type="text"
                value={admin.session_fee}
                readOnly
                className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* ======================== COLUMN 3 ======================== */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-48 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
              {admin.profile_image_url ? (
                <img
                  src={`${API_URL}${admin.profile_image_url}`}
                  alt={admin.gym_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-gray-400">No Image</span>
              )}
            </div>
          </div>
        </div>

        {/* ======================== BUTTONS ======================== */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-xs hover:bg-gray-600"
            onClick={onClose}
          >
            Close
          </button>
          {admin.is_archived === 0 && onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(admin);
                onClose();
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-xs"
            >
              Edit Partner
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPartnerModal;