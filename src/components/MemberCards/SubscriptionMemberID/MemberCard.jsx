import React from "react";

const MemberCard = ({ member, onClose }) => {
  if (!member) return null;

  const baseUrl = import.meta.env.VITE_IP;
  
  const imageUrl = member.profile_image_url
    ? `${baseUrl}/${member.profile_image_url}`
    : `${baseUrl}/default-profile.png`;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "N/A";
    }
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Member Information</h2>

          <div className="flex gap-3">
            <div className="flex-1 grid gap-2 text-sm">
              <div>
                <label className="text-gray-500 text-xs">Full Name</label>
                <p className="text-gray-800 font-medium">{member.full_name}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">RFID Tag</label>
                <p className="text-gray-800 font-medium">{member.rfid_tag}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Age</label>
                <p className="text-gray-800 font-medium">{member.age}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Gender</label>
                <p className="text-gray-800 font-medium">{member.gender || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Phone Number</label>
                <p className="text-gray-800 font-medium">{member.phone_number}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Email</label>
                <p className="text-gray-800 font-medium break-all">{member.email}</p>
              </div>
            </div>

            <div className="flex-1 grid gap-2 text-sm">
              <div>
                <label className="text-gray-500 text-xs">Address</label>
                <p className="text-gray-800 font-medium">{member.address}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Subscription Plan</label>
                <p className="text-gray-800 font-medium">{member.subscription_type || "N/A"}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Expiry Date</label>
                <p className="text-gray-800 font-medium">{formatDate(member.subscription_expiry)}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Joined Date</label>
                <p className="text-gray-800 font-medium">{formatDate(member.created_at)}</p>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Status</label>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    member.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {member.status}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={member.full_name}
                className="w-50 h-70 object-cover rounded border border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;