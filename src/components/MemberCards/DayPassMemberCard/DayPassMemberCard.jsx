import React from "react";

const DayPassMemberCard = ({ guest, onClose }) => {
  if (!guest) return null;

  const baseUrl = import.meta.env.VITE_IP;

  const getImageUrl = () => {
    const imageUrl = guest.profile_image_url;

    if (imageUrl && imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl) return `${baseUrl}/${imageUrl}`;
    return `${baseUrl}/uploads/members/default.jpg`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try { return new Date(dateString).toLocaleDateString(); } catch { return "N/A"; }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try { return new Date(dateString).toLocaleString(); } catch { return "N/A"; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Close"
          >
            &times;
          </button>
        )}

        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Day Pass Guest Information</h2>

          <div className="flex gap-3">
            <div className="flex-1 grid gap-2 text-sm">
              <div>
                <label className="text-gray-500 text-xs">Guest Name</label>
                <p className="text-gray-800 font-medium">{guest.guest_name || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">RFID Tag</label>
                <p className="text-gray-800 font-medium">{guest.rfid_tag || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Gender</label>
                <p className="text-gray-800 font-medium capitalize">{guest.gender || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Mobile Number</label>
                <p className="text-gray-800 font-medium">{guest.mobile_number || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Email</label>
                <p className="text-gray-800 font-medium break-all">{guest.email || "N/A"}</p>
              </div>
            </div>

            <div className="flex-1 grid gap-2 text-sm">
              <div>
                <label className="text-gray-500 text-xs">Processed By</label>
                <p className="text-gray-800 font-medium">{guest.staff_name || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Paid Amount</label>
                <p className="text-green-600 font-bold">
                  ₱{parseFloat(guest.paid_amount || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Joined At</label>
                <p className="text-gray-800 font-medium">{formatDate(guest.created_at)}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Expires At</label>
                <p className="text-gray-800 font-medium">{formatDateTime(guest.expires_at)}</p>
              </div>
              {guest.renewed_at && (
                <div>
                  <label className="text-gray-500 text-xs">Last Renewed</label>
                  <p className="text-gray-800 font-medium">{formatDateTime(guest.renewed_at)}</p>
                </div>
              )}
              <div>
                <label className="text-gray-500 text-xs">Status</label>
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  guest.status === "active" ? "bg-green-100 text-green-700"
                  : guest.status === "returned" ? "bg-gray-100 text-gray-600"
                  : "bg-red-100 text-red-700"
                }`}>
                  {guest.status}
                </span>
              </div>
              {guest.notes && (
                <div>
                  <label className="text-gray-500 text-xs">Notes</label>
                  <p className="text-gray-800 font-medium">{guest.notes}</p>
                </div>
              )}
            </div>

            <div className="flex-shrink-0">
              <img
                src={getImageUrl()}
                alt={guest.guest_name}
                className="w-50 h-70 object-cover rounded border border-gray-300"
                onError={(e) => {
                  e.currentTarget.src = `${baseUrl}/uploads/members/default.jpg`;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayPassMemberCard;