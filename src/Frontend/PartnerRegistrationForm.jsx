import React, { useState } from 'react';
import { Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "";

const PartnerRegistration = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [formData, setFormData] = useState({
    gym_name: '',
    admin_name: '',
    age: '',
    email: '',
    password: '',
    address: '',
    system_type: '',
    session_fee: '',
    profile_image: null
  });
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    const payload = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) payload.append(key, formData[key]);
    });

    try {
      const response = await fetch('/api/partner-registration', {
        method: 'POST',
        body: payload
      });
      const data = await response.json();

      if (response.ok) {
        setRegistrationNumber(data.registration_number);
        setSubmitStatus('success');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your registration has been submitted successfully. Our team will review your application shortly.
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your Registration Number:</p>
            <p className="text-2xl font-bold text-blue-600">{registrationNumber}</p>
          </div>
          <p className="text-sm text-gray-500">⏱️ This registration will expire in <strong>1 hour</strong> if not reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Registration</h1>
            <p className="text-gray-600">Join SwiftPass Tech - Gym Management System</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gym Name</label>
                <input type="text" name="gym_name" value={formData.gym_name} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gym Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Name</label>
                <input type="text" name="admin_name" value={formData.admin_name} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">System Type</label>
                <select name="system_type" value={formData.system_type} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500">
                  <option value="">-- Select System Type --</option>
                  <option value="prepaid_entry">Prepaid Entry</option>
                  <option value="subscription">Subscription Membership</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Session Fee (₱)</label>
                <input type="number" name="session_fee" value={formData.session_fee} onChange={handleChange}
                  className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-48 h-48 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              <label className="cursor-pointer bg-blue-500 text-white text-xs px-3 py-1.5 rounded-md hover:bg-blue-600">
                Upload Picture
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <button onClick={() => setShowTerms(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-xs">
              Continue to Terms & Conditions
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Terms and Conditions</h2>
            
            <div className="space-y-4 text-sm text-gray-700 mb-6">
              <section>
                <h3 className="font-semibold text-base mb-2">1. Account Registration</h3>
                <p>By registering as a partner, you agree to provide accurate information and maintain account confidentiality.</p>
              </section>
              <section>
                <h3 className="font-semibold text-base mb-2">2. Service Usage</h3>
                <p>SwiftPass Tech provides gym management software. You agree to use the service in compliance with all applicable laws.</p>
              </section>
              <section>
                <h3 className="font-semibold text-base mb-2">3. Data Privacy</h3>
                <p>We collect and process your data in accordance with our Privacy Policy. You retain ownership of your data.</p>
              </section>
              <section>
                <h3 className="font-semibold text-base mb-2">4. Payment Terms</h3>
                <p>Subscription fees are charged based on your plan. We reserve the right to modify pricing with 30 days notice.</p>
              </section>
              <section>
                <h3 className="font-semibold text-base mb-2">5. Service Availability</h3>
                <p>We strive for 99.9% uptime but do not guarantee uninterrupted service.</p>
              </section>
            </div>

            <label className="flex items-start space-x-3 cursor-pointer mb-6">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 mt-1 text-blue-600 border-gray-300 rounded" />
              <span className="text-sm text-gray-700">I have read and agree to the Terms and Conditions</span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setShowTerms(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!termsAccepted}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold ${
                  termsAccepted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}>
                Submit Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerRegistration;