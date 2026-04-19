import React from "react";
import { API_URL } from "../../config";

const ViewPartnerModal = ({ isOpen, onClose, admin, onEdit }) => {
  if (!isOpen || !admin) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Partner Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">{admin.gym_name}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {admin.is_archived === 1 && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs text-red-600 font-medium">This partner account is archived</p>
          </div>
        )}

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100">Gym Information</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Name</label>
                <input
                  type="text"
                  value={admin.gym_name}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Code</label>
                <input
                  type="text"
                  value={admin.gym_code || "Not set"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Address</label>
                <textarea
                  value={admin.address}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed resize-none"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin Name</label>
                <input
                  type="text"
                  value={admin.admin_name}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={admin.email}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  value="••••••••"
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100">System & Subscription</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">RFID Tag 1</label>
                <input
                  type="text"
                  value={admin.rfid_tag || "Not assigned"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  RFID Tag 2 <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={admin.rfid_tag_2 || "Not assigned"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">System Type</label>
                <input
                  type="text"
                  value={admin.system_type || "Not set"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Package / Promo</label>
                <input
                  type="text"
                  value={admin.package_name || "No package selected"}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
                {admin.package_price && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    ₱{parseFloat(admin.package_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} • {admin.package_duration} days
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Package Period</label>
                <input
                  type="text"
                  value={
                    admin.subscription_start_date && admin.subscription_end_date
                      ? `${new Date(admin.subscription_start_date).toLocaleDateString()} — ${new Date(admin.subscription_end_date).toLocaleDateString()}`
                      : "Not activated"
                  }
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              {admin.subscription_end_date && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Days Remaining</label>
                  <input
                    type="text"
                    value={
                      admin.days_remaining !== null && admin.days_remaining !== undefined
                        ? admin.days_remaining > 0
                          ? `${admin.days_remaining} days`
                          : "Expired"
                        : "N/A"
                    }
                    readOnly
                    className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 cursor-not-allowed ${
                      admin.days_remaining <= 0 ? "text-red-600 font-medium" : "text-gray-900"
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100 w-full text-center">Profile Photo</p>
              <div className="w-40 h-40 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                {admin.profile_image_url ? (
                  <img
                    src={`${API_URL}${admin.profile_image_url}`}
                    alt={admin.gym_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No image</span>
                )}
              </div>

              {admin.is_archived === 0 && (
                <span className="text-[11px] bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-0.5">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            {admin.is_archived === 0 && onEdit && (
              <button
                type="button"
                onClick={() => { onEdit(admin); onClose(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                Edit Partner
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPartnerModal;