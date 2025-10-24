import React from 'react';

const AddPartnerModal = ({
  isOpen,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  mode = "add",
  onReplaceRfid,
  isReplacingRfid = false,
}) => {
  if (!isOpen) return null;

  const isEditMode = mode === "edit";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditMode ? "Edit Partner" : "Add New Partner"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isReplacingRfid && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-700">
              <strong>RFID Replacement Mode:</strong> Please scan the new RFID tag now
            </p>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gym Name</label>
                <input
                  type="text"
                  name="gym_name"
                  value={formData.gym_name}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Name</label>
                <input
                  type="text"
                  name="admin_name"
                  value={formData.admin_name}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* RFID Tag */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">RFID Tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="rfid_tag"
                    value={formData.rfid_tag}
                    onChange={onFormChange}
                    className={`flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                      isEditMode && !isReplacingRfid ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder={isReplacingRfid ? "Waiting for scan..." : isEditMode ? "Current RFID Tag" : "Scan RFID tag or enter manually"}
                    readOnly={isEditMode && !isReplacingRfid}
                  />
                  {isEditMode && !isReplacingRfid && (
                    <button
                      type="button"
                      onClick={onReplaceRfid}
                      className="px-3 py-2 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors whitespace-nowrap"
                    >
                      Replace RFID
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password {isEditMode && <span className="text-gray-500">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required={!isEditMode}
                  placeholder={isEditMode ? "Enter new password to change" : ""}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gym Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">System Type</label>
                <select
                  name="system_type"
                  value={formData.system_type}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Select System Type --</option>
                  <option value="prepaid_entry">Prepaid Entry</option>
                  <option value="subscription">Subscription Membership</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Session Fee (₱)</label>
                <input
                  type="number"
                  name="session_fee"
                  value={formData.session_fee}
                  onChange={onFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter session fee amount"
                  required
                />
              </div>
            </div>

            {/* Column 3 (Image upload) */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-60 h-60 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
                {formData.profile_image_url ? (
                  <img
                    src={
                      typeof formData.profile_image_url === 'string'
                        ? formData.profile_image_url
                        : URL.createObjectURL(formData.profile_image_url)
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              <label className="cursor-pointer bg-blue-500 text-white text-xs px-4 py-2 rounded-md hover:bg-blue-600">
                Upload Picture
                <input
                  type="file"
                  accept="image/*"
                  name="profile_image_url"
                  onChange={onFormChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-xs hover:bg-gray-600"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-xs"
            >
              {isEditMode ? "Update Partner" : "Add Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartnerModal;
