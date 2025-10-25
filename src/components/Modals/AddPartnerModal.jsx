import React from 'react';

const AddPartnerModal = ({
  isOpen,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  mode = "add",
  onScanSlot, // ✅ NEW PROP for RFID scan
  waitingForSlot = null, // ✅ NEW PROP to show scanning status
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
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditMode ? "Edit Partner" : "Add New Partner"}
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

        {/* ✅ Waiting indicator */}
        {waitingForSlot && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md animate-pulse">
            <p className="text-xs text-blue-700">
              <strong>⏳ Waiting for RFID Slot {waitingForSlot}...</strong> Please scan
              the card now
            </p>
          </div>
        )}

        <form onSubmit={onSubmit}>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ======================== COLUMN 1 ======================== */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gym Name
                </label>
                <input
                  type="text"
                  name="gym_name"
                  value={formData.gym_name}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gym Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Admin Name
                </label>
                <input
                  type="text"
                  name="admin_name"
                  value={formData.admin_name}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password{" "}
                  {isEditMode && (
                    <span className="text-gray-500">(leave blank to keep current)</span>
                  )}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required={!isEditMode}
                  placeholder={isEditMode ? "Enter new password to change" : ""}
                />
              </div>
            </div>

            {/* ======================== COLUMN 2 ======================== */}
            <div className="space-y-2">
              {/* ✅ RFID Tag 1 with Scan Now */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  RFID Tag 1 {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    name="rfid_tag"
                    value={formData.rfid_tag}
                    onChange={onFormChange}
                    className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      waitingForSlot === 1
                        ? "Scanning..."
                        : "Click 'Scan Now' or enter manually"
                    }
                    readOnly={waitingForSlot === 1}
                    required={!isEditMode}
                  />
                  <button
                    type="button"
                    onClick={() => onScanSlot(1)}
                    disabled={waitingForSlot !== null}
                    className={`px-2.5 py-1.5 text-white text-xs rounded-md whitespace-nowrap transition-colors ${
                      waitingForSlot === 1
                        ? "bg-blue-400 cursor-wait"
                        : waitingForSlot !== null
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {waitingForSlot === 1 ? "Scanning..." : "Scan Now"}
                  </button>
                </div>
              </div>

              {/* ✅ RFID Tag 2 with Scan Now */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  RFID Tag 2 <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    name="rfid_tag_2"
                    value={formData.rfid_tag_2 || ""}
                    onChange={onFormChange}
                    className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      waitingForSlot === 2
                        ? "Scanning..."
                        : "Click 'Scan Now' or enter manually"
                    }
                    readOnly={waitingForSlot === 2}
                  />
                  <button
                    type="button"
                    onClick={() => onScanSlot(2)}
                    disabled={waitingForSlot !== null}
                    className={`px-2.5 py-1.5 text-white text-xs rounded-md whitespace-nowrap transition-colors ${
                      waitingForSlot === 2
                        ? "bg-blue-400 cursor-wait"
                        : waitingForSlot !== null
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {waitingForSlot === 2 ? "Scanning..." : "Scan Now"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  System Type
                </label>
                <select
                  name="system_type"
                  value={formData.system_type}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Select System Type --</option>
                  <option value="prepaid_entry">Prepaid Entry</option>
                  <option value="subscription">Subscription Membership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Session Fee (₱)
                </label>
                <input
                  type="number"
                  name="session_fee"
                  value={formData.session_fee}
                  onChange={onFormChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter session fee amount"
                  required
                />
              </div>
            </div>

            {/* ======================== COLUMN 3 ======================== */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-48 h-48 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
                {formData.profile_image_url ? (
                  <img
                    src={
                      typeof formData.profile_image_url === "string"
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

              <label className="cursor-pointer bg-blue-500 text-white text-xs px-3 py-1.5 rounded-md hover:bg-blue-600">
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

          {/* ======================== BUTTONS ======================== */}
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
