import React from "react";

const MemberCard = ({ member, onClose }) => {
  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 relative animate-fade-in overflow-hidden">

    
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-white hover:text-gray-200 text-2xl font-bold z-10"
            aria-label="Close"
          >
            &times;
          </button>
        )}

        {/* 🎟️ Subscription Cover */}
        <div className="relative w-full h-80">
          <img
            src={`http://localhost:5000/${member.profile_image_url}`}
            alt={member.full_name}
            className="absolute inset-0 w-full h-full object-cover brightness-90"
          />
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
            <h2 className="text-white text-lg font-bold">{member.full_name}</h2>
            <p className="text-sm text-white/80">
              {member.subscription_type || "Subscription Member"}
            </p>
          </div>
        </div>

        {/* 📋 Info Section */}
        <div className="px-6 py-4 text-sm text-gray-700">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <p><span className="font-semibold">RFID:</span> {member.rfid_tag}</p>
            <p><span className="font-semibold">Age:</span> {member.age}</p>
            <p><span className="font-semibold">Phone:</span> {member.phone_number}</p>
            <p><span className="font-semibold">Email:</span> {member.email}</p>
            <p><span className="font-semibold">Address:</span> {member.address}</p>
            <p><span className="font-semibold">Joined:</span> {new Date(member.created_at).toLocaleDateString()}</p>
            <p><span className="font-semibold">Plan:</span> {member.subscription_type || "N/A"}</p>
            <p><span className="font-semibold">Expires:</span> {new Date(member.subscription_expiry).toLocaleDateString()}</p>
            <p><span className="font-semibold">Status:</span>{" "}
              <span className={`px-2 py-1 rounded-full font-semibold ${
                member.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {member.status}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
