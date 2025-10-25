import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children, currentUserRole, currentGymId }) => {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  // Show toast (supports multiple toasts, role, and gym filtering)
  const showToast = useCallback(
    ({ message, type = "info", duration = 2500, role = null, gymId = null }) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type, role, gymId }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    },
    []
  );

  // Show confirm modal
  const showConfirm = useCallback((message, onYes, onNo) => {
    setConfirm({ message, onYes, onNo });
  }, []);

const handleYes = () => {
  const yes = confirm?.onYes;
  setConfirm(null);
  if (typeof yes === "function") {
    setTimeout(() => yes(), 50);
  }
};

const handleNo = () => {
  const no = confirm?.onNo;
  setConfirm(null);
  if (typeof no === "function") {
    setTimeout(() => no(), 50);
  }
};


  const getBorderColor = (type) => {
    switch (type) {
      case "success":
        return "border-green-500";
      case "error":
        return "border-red-500";
      default:
        return "border-blue-500";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Multiple Toasts */}
      {toasts
        .filter(toast => !toast.role || toast.role === currentUserRole)
        .filter(toast => !toast.gymId || toast.gymId === currentGymId)
        .map(toast => (
          <div
            key={toast.id}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down"
          >
            <div
              className={`px-4 py-2 border ${getBorderColor(toast.type)} bg-white text-sm text-gray-800 rounded-md min-w-[280px] max-w-md`}
            >
              {toast.message}
            </div>
          </div>
        ))}

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-50 border border-gray-300 rounded-md p-6 w-[90%] max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-700 mb-4">{confirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={handleNo}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleYes}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.3s ease-in forwards; }
      `}</style>
    </ToastContext.Provider>
  );
};
