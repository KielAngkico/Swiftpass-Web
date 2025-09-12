import React from 'react';

const AddPartnerModal = ({ 
  isOpen, 
  onClose, 
  formData, 
  onFormChange, 
  onSubmit 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Add New Partner</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Admin Name
              </label>
              <input 
                type="text" 
                name="admin_name" 
                value={formData.admin_name} 
                onChange={onFormChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Age
              </label>
              <input 
                type="number" 
                name="age" 
                value={formData.age} 
                onChange={onFormChange} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={onFormChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={onFormChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Name
            </label>
            <input 
              type="text" 
              name="gym_name" 
              value={formData.gym_name} 
              onChange={onFormChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gym Address
            </label>
            <textarea 
              name="address" 
              value={formData.address} 
              onChange={onFormChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" 
              rows="2"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              System Type
            </label>
            <select 
              name="system_type" 
              value={formData.system_type} 
              onChange={onFormChange} 
              className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all' 
              required
            >     
              <option value="">-- Select System Type --</option>
              <option value="prepaid_entry">Prepaid Entry</option>
              <option value="subscription">Subscription Membership</option>
            </select>
          </div>
          
          {formData.system_type === "prepaid_entry" && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Fee (₱)
              </label>
              <input
                type="number"
                name="session_fee"
                value={formData.session_fee}
                onChange={onFormChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter session fee amount"
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Add Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartnerModal;