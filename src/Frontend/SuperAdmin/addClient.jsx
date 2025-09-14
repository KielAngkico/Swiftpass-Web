import React, { useState, useEffect } from 'react';
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import AddPartnerModal from "../../components/Modals/AddPartnerModal"; 
import { API_URL } from "../../config";

const AddClient = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    admin_name: '',
    age: '',
    address: '',
    email: '',
    password: '',
    gym_name: '',
    system_type: '',
    session_fee: '',
  });
  const [message, setMessage] = useState('');
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admins`);
        setAdmins(response.data);
      } catch (error) {
        console.error('Error fetching admins:', error);
      }
    };
    fetchAdmins();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage('');

  // Validate age
  if (isNaN(formData.age) || formData.age.trim() === "") {
    setMessage('Age must be a valid number.');
    return;
  }

  // Ensure session_fee is a number, default to 0 if empty
  const sessionFeeValue = formData.session_fee ? Number(formData.session_fee) : 0;

  try {
    // Build payload with normalized session_fee
    const payload = {
      ...formData,
      age: Number(formData.age),
      session_fee: sessionFeeValue
    };

    const response = await axios.post(`${API_URL}/api/add-client`, payload);
    setMessage('Client added successfully!');
    setShowAddForm(false);

    // Reset form
    setFormData({
      admin_name: '',
      age: '',
      address: '',
      email: '',
      password: '',
      gym_name: '',
      system_type: '',
      session_fee: '',
    });

    // Update admins list
    setAdmins([...admins, { id: response.data.id, ...payload }]);
  } catch (error) {
    console.error(error);
    setMessage('Failed to add client. Please try again.');
  }
};


  const handleArchive = async (id, isArchived) => {
    try {
      const endpoint = isArchived ? 'restore-admin' : 'archive-admin';
      const action = isArchived ? 'restore' : 'archive';
      
      if (window.confirm(`Are you sure you want to ${action} this admin?`)) {
        await axios.put(`${API_URL}/api/${endpoint}/${id}`);

        setAdmins(admins.map(admin => 
          admin.id === id 
            ? { ...admin, is_archived: !isArchived }
            : admin
        ));
        
        setMessage(`Admin ${action}d successfully!`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error(`${isArchived ? 'Restore' : 'Archive'} request failed:`, error);
      setMessage(`Failed to ${isArchived ? 'restore' : 'archive'} admin. Please try again.`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCloseModal = () => {
    setShowAddForm(false);
 
    setFormData({
      admin_name: '',
      age: '',
      address: '',
      email: '',
      password: '',
      gym_name: '',
      system_type: '',
      session_fee: '',
    });
  };

  return (
    <div className='flex bg-gray-300'>
      <SuperAdminSidebar />
      <div className="p-6 w-full">
        <h2 className="text-2xl font-bold mb-4">Partner's Management</h2>
        
        {/* Actions Bar with Stats */}
        <div className="flex justify-between items-center mb-4 bg-white p-4 rounded shadow">
          <button 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600" 
            onClick={() => setShowAddForm(true)}
          >
            Add Partner
          </button>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Active: {admins.filter(a => !a.is_archived).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Archived: {admins.filter(a => a.is_archived).length}</span>
            </div>
          </div>
        </div>
        
        {/* Feedback Message */}
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Add Partner Modal Component */}
        <AddPartnerModal
          isOpen={showAddForm}
          onClose={handleCloseModal}
          formData={formData}
          onFormChange={handleChange}
          onSubmit={handleSubmit}
        />

        {/* Simple Admin Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <div key={admin.id} className={`p-4 border rounded shadow-md w-80 ${
              admin.is_archived ? 'bg-red-100 border-red-300' : 'bg-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">{admin.admin_name}</h3>
                {admin.is_archived && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">ARCHIVED</span>
                )}
              </div>
              <p><strong>Gym:</strong> {admin.gym_name}</p>
              <p><strong>System Type:</strong> {admin.system_type}</p>
              <p><strong>Age:</strong> {admin.age}</p>
              <p><strong>Email:</strong> {admin.email}</p>
              <p><strong>Address:</strong> {admin.address}</p>
              
              <div className="mt-3 flex justify-between gap-2">
                <button 
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex-1" 
                  onClick={() => alert(`Viewing details for ${admin.admin_name}`)}
                >
                  View Details
                </button>
                
                <button
                  className={`px-3 py-1 rounded text-white flex-1 ${
                    admin.is_archived 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                  onClick={() => handleArchive(admin.id, admin.is_archived)}
                >
                  {admin.is_archived ? 'Restore' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddClient;