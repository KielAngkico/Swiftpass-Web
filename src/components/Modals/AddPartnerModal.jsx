import React from 'react';

const AddPartnerModal = ({
  isOpen,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  mode = "add",
  onScanSlot,
  waitingForSlot = null,
}) => {
  if (!isOpen) return null;

  const isEditMode = mode === "edit";

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-gray-900">
              {isEditMode ? "Edit Partner" : mode === "registration" ? "Approve Registration" : "Add New Partner"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditMode ? "Update partner details and RFID tags" : "Fill in the partner account details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {waitingForSlot && (
          <div className="mx-5 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">
              Waiting for RFID Slot {waitingForSlot} — scan the card now
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100">Gym Information</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Name</label>
                <input
                  type="text"
                  name="gym_name"
                  value={formData.gym_name}
                  onChange={onFormChange}
                  placeholder='Enter Gym Name'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Code</label>
                <input
                  type="text"
                  name="gym_code"
                  value={formData.gym_code}
                  onChange={onFormChange}
                  maxLength={10}
                  placeholder='Enter Gym Code'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">Short unique code, max 10 characters</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={onFormChange}
                  placeholder='Enter Gym Address'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin Name</label>
                <input
                  type="text"
                  name="admin_name"
                  value={formData.admin_name}
                  onChange={onFormChange}
                  placeholder='Enter Admin Name'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onFormChange}
                  placeholder='Enter Email Address'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

            {!isEditMode && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input
                  type="text"
                  name="password"
                  value="pass123"
                  readOnly
                  className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">Default password — can be changed after login</p>
              </div>
            )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100">
                {isEditMode ? "RFID & System" : "System & Package"}
              </p>

              {isEditMode && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">RFID Tag 1</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        name="rfid_tag"
                        value={formData.rfid_tag}
                        onChange={onFormChange}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={waitingForSlot === 1 ? "Scanning..." : "Scan or enter manually"}
                        readOnly={waitingForSlot === 1}
                      />
                      <button
                        type="button"
                        onClick={() => onScanSlot(1)}
                        disabled={waitingForSlot !== null}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          waitingForSlot === 1
                            ? "bg-blue-50 text-blue-600 border-blue-200 cursor-wait"
                            : waitingForSlot !== null
                            ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed"
                            : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {waitingForSlot === 1 ? "Scanning..." : "Scan"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      RFID Tag 2 <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        name="rfid_tag_2"
                        value={formData.rfid_tag_2 || ""}
                        onChange={onFormChange}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={waitingForSlot === 2 ? "Scanning..." : "Scan or enter manually"}
                        readOnly={waitingForSlot === 2}
                      />
                      <button
                        type="button"
                        onClick={() => onScanSlot(2)}
                        disabled={waitingForSlot !== null}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          waitingForSlot === 2
                            ? "bg-blue-50 text-blue-600 border-blue-200 cursor-wait"
                            : waitingForSlot !== null
                            ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed"
                            : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {waitingForSlot === 2 ? "Scanning..." : "Scan"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">System Type</label>
                <select
                  name="system_type"
                  value={formData.system_type}
                  onChange={onFormChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select system type</option>
                  <option value="prepaid_entry">Prepaid Entry</option>
                  <option value="subscription">Subscription Membership</option>
                </select>
              </div>

{!isEditMode && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Package / Promo <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="package_id"
                    value={formData.package_id || ""}
                    onChange={onFormChange}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select package</option>
                    {formData.packages?.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — ₱{parseFloat(pkg.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} ({pkg.duration_days} days)
                      </option>
                    ))}
                  </select>
                </div>
              )}

 {!isEditMode && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method || "Cash"}
                    onChange={onFormChange}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    {formData.paymentOptions?.map((option) => (
                      <option key={option.id} value={option.payment_method}>
                        {option.payment_method}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isEditMode && formData.payment_method && formData.payment_method !== "Cash" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    value={formData.reference_number || ""}
                    onChange={onFormChange}
                    placeholder="Enter reference / transaction number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100 w-full text-center">Profile Photo</p>
              <div className="w-80 h-80 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
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
                  <span className="text-xs text-gray-400">No image</span>
                )}
              </div>
              <label className="cursor-pointer bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
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

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              {isEditMode ? "Update Partner" : mode === "registration" ? "Approve & Add Partner" : "Add Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartnerModal;