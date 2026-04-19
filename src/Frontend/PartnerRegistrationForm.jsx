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
  const [imagePreview, setImagePreview] = useState(null);
  const termsContentRef = useRef(null);

  const [formData, setFormData] = useState({
    gym_name: '',
    admin_name: '',
    email: '',
    password: 'pass123',
    address: '',
    system_type: '',
    package_id: '',
    profile_image_url: null
  });

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
      setSelectedPackage(pkg || null);
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
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      setHasScrolledTerms(true);
    }
  };

  useEffect(() => {
    if (showTerms && termsContentRef.current) {
      const el = termsContentRef.current;
      if (el.scrollHeight <= el.clientHeight) setHasScrolledTerms(true);
    }
  }, [showTerms]);

  const handleSubmit = async () => {
    if (!termsAccepted) { alert('Please accept the terms and conditions'); return; }
    if (!formData.package_id) { alert('Please select a package'); return; }

    const payload = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) payload.append(key, formData[key]);
    });

    try {
      const response = await fetch(`${API_URL}/api/partner-registration`, { method: 'POST', body: payload });
      const data = await response.json();
      if (response.ok) {
        setRegistrationNumber(data.registration_number);
        setSubmitStatus('success');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Registration Submitted</h2>
          <p className="text-xs text-gray-500 mb-6">Our team will review your application shortly.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Your Registration Number</p>
            <p className="text-xl font-semibold text-blue-600">{registrationNumber}</p>
          </div>
          <p className="text-xs text-gray-400">This registration expires in <span className="text-gray-600 font-medium">1 hour</span> if not reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Partner Registration</h1>
          <p className="text-xs text-gray-500 mt-0.5">Join SwiftPass Tech — Gym Management System</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-0">

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Gym Details</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Name</label>
                <input
                  type="text"
                  name="gym_name"
                  value={formData.gym_name}
                  onChange={handleChange}
                  placeholder="e.g. Iron Peak Fitness"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Full address"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin Name</label>
                <input
                  type="text"
                  name="admin_name"
                  value={formData.admin_name}
                  onChange={handleChange}
                  placeholder="Full name"
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
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">System Type</label>
                  <button
                    type="button"
                    onClick={() => setShowSystemTypeFAQ(!showSystemTypeFAQ)}
                    className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  >
                    {showSystemTypeFAQ ? 'Hide guide' : 'What is this?'}
                  </button>
                </div>

                {showSystemTypeFAQ && (
                  <div className="mb-2 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Subscription Membership:</span> Members pay upfront for a period and get unlimited access during that time.</p>
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Prepaid Entry:</span> Members load credits and pay per visit. Day passes for non-members are also supported.</p>
                  </div>
                )}

                <select
                  name="system_type"
                  value={formData.system_type}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select system type</option>
                  <option value="subscription">Subscription Membership</option>
                  <option value="prepaid_entry">Prepaid Entry</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 mt-6 md:mt-0">
              <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Package</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Package</label>
                <select
                  name="package_id"
                  value={formData.package_id}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ₱{parseFloat(pkg.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({pkg.duration_days} days)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPackage ? (
                <div className="bg-white border border-blue-400 ring-1 ring-blue-200 rounded-xl p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-medium text-gray-900">{selectedPackage.name}</p>
                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 w-fit flex-shrink-0 ml-2">{selectedPackage.duration_days} days</span>
                  </div>
                  <p className="text-base font-semibold text-blue-600 mb-3">
                    ₱{parseFloat(selectedPackage.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>

                  {selectedPackage.items && selectedPackage.items.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Included Items</p>
                      <div className="overflow-y-auto space-y-1" style={{ maxHeight: '160px' }}>
                        {selectedPackage.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-700">{item.item_name}</span>
                            <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-medium flex-shrink-0 ml-2">
                              {item.quantity} {item.quantity > 1 ? 'pcs' : 'pc'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center">
                  <p className="text-xs text-gray-400">Select a package to see details</p>
                </div>
              )}
            </div>

            <div className="space-y-3 mt-6 md:mt-0">
              <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Profile Photo</p>

              <div className="flex flex-col items-center gap-3">
                <div className="w-full aspect-square bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden" style={{ maxWidth: '220px' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">No image</span>
                  )}
                </div>
                <label className="cursor-pointer bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors w-fit">
                  Upload Picture
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-400">JPG, PNG, or WEBP accepted</p>
              </div>
            </div>

          </div>

          <div className="flex items-start gap-3 mt-6 pt-4 border-t border-gray-100">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
              style={{ accentColor: '#2563eb' }}
            />
            <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-blue-600 font-medium hover:underline"
              >
                Terms and Conditions
              </button>
            </label>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Submit Registration
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTerms(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Terms and Conditions</h2>
                <p className="text-xs text-gray-500 mt-0.5">SwiftPass Partner Agreement</p>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
              >
                x
              </button>
            </div>

            <div
              ref={termsContentRef}
              onScroll={handleTermsScroll}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            >
              {[
                { title: "1. Partner Registration", body: "Provide accurate gym information and keep your account credentials secure. You are responsible for all activities under your account." },
                { title: "2. Service Usage", body: "Use SwiftPass gym management software (member registration, access control, payments, assessments) in compliance with all applicable laws. Misuse may result in account termination." },
                { title: "3. Data Ownership", body: "You own all your gym's data (members, attendance, transactions). We protect it according to the Data Privacy Act of 2012 with industry-standard security." },
                { title: "4. RFID System Requirements", body: "All RFID cards, tags, and wristbands must be registered in the SwiftPass system to function. Only SwiftPass-authorized RFIDs will be recognized by the access control system. All RFID equipment must be sourced from SwiftPass Tech to ensure compatibility and system integrity." },
                { title: "5. Subscription & Payment", body: "Pay subscription fees at the start of each billing cycle. We may adjust pricing with 30 days notice." },
                { title: "6. Subscription Expiration", body: "When your subscription expires, you will not be able to access your account and data until renewal." },
                { title: "7. Grace Period & Data Deletion", body: "You have 30 days after expiration to renew your subscription and restore access. If not renewed within 30 days, all your gym data will be permanently deleted and cannot be recovered." },
                { title: "8. Equipment Responsibility", body: "You are responsible for maintaining SwiftPass hardware (RFID readers, terminals). Report damage immediately; replacement fees may apply." },
                { title: "9. Acceptance", body: "By using SwiftPass, you agree to these terms. We may update them with 30 days notice via email." },
              ].map((section, i, arr) => (
                <div key={i} className={`pb-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <p className="text-xs font-medium text-gray-900 mb-1">{section.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  id="terms-modal"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={!hasScrolledTerms}
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 disabled:opacity-40"
                  style={{ accentColor: '#2563eb' }}
                />
                <label htmlFor="terms-modal" className={`text-xs cursor-pointer ${hasScrolledTerms ? 'text-gray-700' : 'text-gray-400'}`}>
                  {hasScrolledTerms
                    ? "I have read and agree to the Terms and Conditions"
                    : "Scroll to the bottom to enable acceptance"}
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  disabled={!termsAccepted}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Accept and Continue
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