import React from "react";
import { API_URL } from "../../config";

const ViewPartnerModal = ({ isOpen, onClose, admin, onEdit }) => {
  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Partner Details</h2>
            <p className="text-sm text-gray-500">View partner information</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {admin.is_archived === 1 && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
              ⚠️ This partner is archived
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Image */}
            {admin.profile_image_url && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image
                </label>
                <img
                  src={`${API_URL}${admin.profile_image_url}`}
                  alt={admin.gym_name}
                  className="w-full h-48 object-cover rounded-md border border-gray-300"
                />
              </div>
            )}

            {/* Gym Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gym Name
              </label>
              <input
                type="text"
                value={admin.gym_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name
              </label>
              <input
                type="text"
                value={admin.admin_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="text"
                value={admin.age}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={admin.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={admin.address}
                readOnly
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed resize-none"
              />
            </div>

            {/* System Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Type
              </label>
              <input
                type="text"
                value={admin.system_type}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Session Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₱</span>
                <input
                  type="text"
                  value={admin.session_fee}
                  readOnly
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* RFID Tag 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFID Tag 1
              </label>
              <input
                type="text"
                value={admin.rfid_tag || "N/A"}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* RFID Tag 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFID Tag 2
              </label>
              <input
                type="text"
                value={admin.rfid_tag_2 || "N/A"}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end rounded-b-lg">
          {admin.is_archived === 0 && onEdit && (
            <button
              onClick={() => {
                onEdit(admin);
                onClose();
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors font-medium"
            >
              Edit Partner
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPartnerModal;