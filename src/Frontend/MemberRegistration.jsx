import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from "../config";

const MemberRegistration = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const termsContentRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    gender: '',
    age: '',
    phone_number: '',
    email: '',
    password: '',
    emergency_contact_person: '',
    emergency_contact_number: '',
    emergency_contact_relationship: '',
    admin_id: ''
  });

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/available-gyms`);
      const data = await response.json();
      setGyms(data);
    } catch (error) {
      console.error('Failed to fetch gyms:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'admin_id') {
      const gym = gyms.find(g => g.id === parseInt(value));
      setSelectedGym(gym);
    }
  };

  const handleTermsScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isScrolledToBottom) {
      setHasScrolledTerms(true);
    }
  };

  useEffect(() => {
    if (showTerms && termsContentRef.current) {
      const element = termsContentRef.current;
      const isScrollable = element.scrollHeight > element.clientHeight;
      if (!isScrollable) {
        setHasScrolledTerms(true);
      }
    }
  }, [showTerms]);

  const handleSubmit = async () => {
    if (!termsAccepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    if (!formData.admin_id) {
      alert('Please select a gym');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/member-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();

      if (response.ok) {
        setRegistrationNumber(data.registration_number);
        setSubmitStatus('success');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Network error: ${error.message}. Please check console for details.`);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your registration has been submitted successfully. The gym staff will review your application shortly.
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
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Member Registration</h1>
            <p className="text-gray-600">Join your gym with SwiftPass Tech</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input 
                  type="text" 
                  name="full_name" 
                  value={formData.full_name} 
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                  <input 
                    type="number" 
                    name="age" 
                    value={formData.age} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input 
                  type="text" 
                  name="phone_number" 
                  value={formData.phone_number} 
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Gym *</label>
                <select 
                  name="admin_id" 
                  value={formData.admin_id} 
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  required
                >
                  <option value="">-- Select Gym --</option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.gym_name} - {gym.address}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGym && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {selectedGym.gym_name}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-semibold text-gray-800">{selectedGym.admin_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-semibold text-gray-800">{selectedGym.address}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">System:</span>
                      <span className="font-semibold text-gray-800">
                        {selectedGym.system_type === 'prepaid_entry' ? 'Prepaid Entry' : 'Subscription'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Emergency Contact</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Person</label>
                    <input 
                      type="text" 
                      name="emergency_contact_person" 
                      value={formData.emergency_contact_person} 
                      onChange={handleChange}
                      placeholder="Full name"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Number</label>
                    <input 
                      type="text" 
                      name="emergency_contact_number" 
                      value={formData.emergency_contact_number} 
                      onChange={handleChange}
                      placeholder="Phone number"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Relationship</label>
                    <input 
                      type="text" 
                      name="emergency_contact_relationship" 
                      value={formData.emergency_contact_relationship} 
                      onChange={handleChange}
                      placeholder="e.g., Mother, Father, Spouse"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <label className="flex items-start cursor-pointer mb-4">
              <input 
                type="checkbox" 
                checked={termsAccepted} 
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 mt-0.5 mr-3 text-blue-600 border-gray-300 rounded" 
                required
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-blue-500 hover:text-blue-700 font-medium underline"
                >
                  Terms & Conditions
                </button>
              </span>
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-3 rounded-md text-sm transition-colors"
            >
              Submit Registration
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
          onClick={() => setShowTerms(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h2 className="text-xl font-bold text-gray-800">Terms and Conditions</h2>
                <button 
                  onClick={() => setShowTerms(false)} 
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div 
                ref={termsContentRef}
                onScroll={handleTermsScroll}
                className="space-y-4 text-sm text-gray-700 overflow-y-auto flex-1 pr-2"
                style={{ maxHeight: 'calc(85vh - 200px)' }}
              >
                <section>
                  <h3 className="font-bold text-base mb-2">1. Account Registration</h3>
                  <p>By registering as a partner, you agree to provide accurate, current, and complete information about your gym and maintain the confidentiality of your account credentials. You are responsible for all activities that occur under your account.</p>
                </section>
                
                <section>
                  <h3 className="font-bold text-base mb-2">2. Service Usage</h3>
                  <p>SwiftPass Tech provides gym management software designed to streamline your operations. You agree to use the service in compliance with all applicable laws and regulations. Any misuse of the platform may result in account suspension or termination.</p>
                </section>
                
                <section>
                  <h3 className="font-bold text-base mb-2">3. Data Privacy</h3>
                  <p>We collect and process your data in accordance with our Privacy Policy and applicable data protection laws. You retain ownership of your gym's data, including member information. We implement industry-standard security measures to protect your data.</p>
                </section>
                
                <section>
                  <h3 className="font-bold text-base mb-2">4. Payment Terms</h3>
                  <p>Subscription fees are charged based on your selected plan. Payment is due at the beginning of each billing cycle. We reserve the right to modify pricing with 30 days advance notice. Failure to pay may result in service suspension.</p>
                </section>
                
                <section>
                  <h3 className="font-bold text-base mb-2">5. Service Availability</h3>
                  <p>We strive to maintain 99.9% uptime for our services. However, we do not guarantee uninterrupted service and are not liable for any downtime due to maintenance, technical issues, or circumstances beyond our control.</p>
                </section>

                <section>
                  <h3 className="font-bold text-base mb-2">6. Intellectual Property</h3>
                  <p>All content, features, and functionality of SwiftPass Tech are owned by us and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our explicit permission.</p>
                </section>

                <section>
                  <h3 className="font-bold text-base mb-2">7. Termination</h3>
                  <p>Either party may terminate this agreement with 30 days written notice. Upon termination, you will have 60 days to export your data before it is permanently deleted from our servers.</p>
                </section>
              </div>

            <div className="mt-4 pt-4 border-t">
              <label className="flex items-start cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={!hasScrolledTerms}
                  className="w-5 h-5 mt-0.5 mr-3 text-blue-600 border-gray-300 rounded disabled:opacity-50" 
                />
                <span className="text-sm text-gray-700">
                  {hasScrolledTerms ? (
                    "I have read and agree to the Terms and Conditions"
                  ) : (
                    <span className="text-gray-500">Please scroll to the bottom to enable acceptance</span>
                  )}
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium px-4 py-2 rounded-md text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  disabled={!termsAccepted}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberRegistration;