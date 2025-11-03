import React, { useState, useRef, useEffect } from 'react';
  import { API_URL } from "../config";

  const PartnerRegistration = () => {
    const [showTerms, setShowTerms] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [showSystemTypeFAQ, setShowSystemTypeFAQ] = useState(false);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const termsContentRef = useRef(null);
    
    const [formData, setFormData] = useState({
      gym_name: '',
      admin_name: '',
      email: '',
      password: '',
      address: '',
      system_type: '',
      package_id: '',
      profile_image_url: null
    });
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
      fetchPackages();
    }, []);

    const fetchPackages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/subscription-packages-with-items`);
        const data = await response.json();
        setPackages(data);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      }
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
      
      if (name === 'package_id') {
        const pkg = packages.find(p => p.id === parseInt(value));
        setSelectedPackage(pkg);
      }
    };

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setFormData({ ...formData, profile_image_url: file });
        setImagePreview(URL.createObjectURL(file));
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

      if (!formData.package_id) {
        alert('Please select a package');
        return;
      }

      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) payload.append(key, formData[key]);
      });

      try {
        const response = await fetch(`${API_URL}/api/partner-registration`, {
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
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Partner Registration</h1>
              <p className="text-gray-600">Join SwiftPass Tech - Gym Management System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gym Name *</label>
                  <input 
                    type="text" 
                    name="gym_name" 
                    value={formData.gym_name} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gym Address *</label>
                  <textarea 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Name *</label>
                  <input 
                    type="text" 
                    name="admin_name" 
                    value={formData.admin_name} 
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

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">System Type *</label>
                    <button
                      type="button"
                      onClick={() => setShowSystemTypeFAQ(!showSystemTypeFAQ)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      What's this?
                    </button>
                  </div>
                  
                  {showSystemTypeFAQ && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-gray-700">
                      <p className="font-semibold mb-2">System Type Guide:</p>
                      <ul className="space-y-2">
                        <li>
                          <strong>Subscription Membership:</strong> Your gym offers monthly or yearly subscription plans. Members pay upfront for a period and get unlimited access during that time.
                        </li>
                        <li>
                          <strong>Prepaid Entry:</strong> Your gym offers per-entry deductions with promos/packages. Members load credits and pay per visit, but you can also offer day passes for non-members.
                        </li>
                      </ul>
                    </div>
                  )}

                  <select 
                    name="system_type" 
                    value={formData.system_type} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    required
                  >
                    <option value="">-- Select System Type --</option>
                    <option value="subscription">Subscription Membership</option>
                    <option value="prepaid_entry">Prepaid Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture (Optional)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">No Image</span>
                      )}
                    </div>
                    <label className="cursor-pointer bg-blue-500 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-600">
                      Upload Picture
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Package *</label>
                  <select 
                    name="package_id" 
                    value={formData.package_id} 
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    required
                  >
                    <option value="">-- Select Package --</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - ₱{parseFloat(pkg.price).toLocaleString('en-PH', {minimumFractionDigits: 2})} ({pkg.duration_days} days)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPackage && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {selectedPackage.name} Package
                    </h3>
                    
                    <div className="mb-4 pb-3 border-b border-blue-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Price:</span>
                        <span className="text-xl font-bold text-blue-600">
                          ₱{parseFloat(selectedPackage.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Duration:</span>
                        <span className="text-sm font-semibold text-gray-800">{selectedPackage.duration_days} days</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Included Items:
                      </h4>
                      <ul className="space-y-1.5">
                        {selectedPackage.items.map((item, index) => (
                          <li key={index} className="flex items-center justify-between text-xs bg-white rounded-md p-2 shadow-sm">
                            <span className="text-gray-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              {item.item_name}
                            </span>
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              {item.quantity} {item.quantity > 1 ? 'pcs' : 'pc'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-600 flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>This package includes all necessary hardware and RFID cards to get your gym started with SwiftPass Tech.</span>
                      </p>
                    </div>
                  </div>
                )}
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

  export default PartnerRegistration;