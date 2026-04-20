import React from "react";

const ViewStaffModal = ({ isOpen, onClose, employee, onEdit }) => {
  if (!isOpen || !employee) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Staff Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">{employee.name}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Profile Image */}
        {employee.profile_image_url ? (
          <img
            src={employee.profile_image_url}
            alt={employee.name}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-blue-50 flex items-center justify-center">
            <span className="text-4xl font-semibold text-blue-400">
              {employee.name?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        )}

        <div className="p-5">
          {/* Fields */}
          <div className="space-y-3 mb-4">

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={employee.name || "—"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Age</label>
                <input
                  type="text"
                  value={employee.age || "—"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Address</label>
              <input
                type="text"
                value={employee.email || "—"}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Contact Number</label>
              <input
                type="text"
                value={employee.contact_number || "—"}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <textarea
                value={employee.address || "—"}
                readOnly
                rows="2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">RFID Tag</label>
              <input
                type="text"
                value={employee.rfid_tag || "Not assigned"}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
              />
            </div>

            {/* Status badge */}
            <div className="pt-1">
              <span className="text-[11px] bg-green-50 text-green-600 border border-green-100 rounded-full px-2.5 py-0.5">
                Active
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button
              className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            {onEdit && (
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                onClick={() => { onClose(); onEdit(employee); }}
              >
                Edit Staff
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStaffModal;