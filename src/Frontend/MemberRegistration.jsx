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
    address: '', 
    emergency_contact_person: '',
    emergency_contact_number: '',
    emergency_contact_relationship: '',
    admin_id: '',
    gym_code_input: '',
  });

  useEffect(() => { fetchGyms(); }, []);

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

    if (name === 'gym_code_input') {
      const upper = value.toUpperCase();
      const gym = gyms.find(g => g.gym_code === upper);
      setSelectedGym(gym || null);
      setFormData(prev => ({ ...prev, gym_code_input: upper, admin_id: gym ? gym.id : '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTermsScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) setHasScrolledTerms(true);
  };

  useEffect(() => {
    if (showTerms && termsContentRef.current) {
      const el = termsContentRef.current;
      if (el.scrollHeight <= el.clientHeight) setHasScrolledTerms(true);
    }
  }, [showTerms]);

  const handleSubmit = async () => {
    if (!termsAccepted) { alert('Please accept the terms and conditions'); return; }
    const gymCode = formData.gym_code_input?.trim().toUpperCase();
    if (!gymCode) { alert('Please enter a gym code'); return; }

    try {
      const gymRes = await fetch(`${API_URL}/api/gym-by-code/${gymCode}`);
      const gymData = await gymRes.json();
      if (!gymRes.ok) { alert('Gym code not found. Please check and try again.'); return; }

      const response = await fetch(`${API_URL}/api/member-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, admin_id: gymData.id, password: 'pass123' })
      });

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
          <p className="text-xs text-gray-500 mb-6">The gym staff will review your application shortly.</p>
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
      <div className="max-w-2xl mx-auto">

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Member Registration</h1>
          <p className="text-xs text-gray-500 mt-0.5">Join your gym with SwiftPass Tech</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {/* Column 1 - Personal Info */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Personal Information</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Full name" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                   
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Age" required />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 09123456789" required />
              </div>

<div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com" required />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange}
                  placeholder="Enter your address" rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </div>
                <div>
                <label className="block text-xs text-gray-500 mb-1">Gym Code</label>
                <input type="text" name="gym_code_input" value={formData.gym_code_input || ''}
                  onChange={handleChange} placeholder="e.g. AFTS" maxLength={10}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  required />
              </div>
            </div>

{/* Column 2 - Emergency Contact */}
<div className="space-y-3 mt-6 md:mt-0">
  <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Emergency Contact</p>



  <div>
    <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
    <input type="text" name="emergency_contact_person" value={formData.emergency_contact_person}
      onChange={handleChange} placeholder="Full name"
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
  </div>

  <div>
    <label className="block text-xs text-gray-500 mb-1">Contact Number</label>
    <input type="text" name="emergency_contact_number" value={formData.emergency_contact_number}
      onChange={handleChange} placeholder="Phone number"
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
  </div>

  <div>
    <label className="block text-xs text-gray-500 mb-1">Relationship</label>
    <input type="text" name="emergency_contact_relationship" value={formData.emergency_contact_relationship}
      onChange={handleChange} placeholder="e.g. Mother, Father, Spouse"
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
  </div>
</div>

{/* Column 3 - Empty intentionally or can be used for future */}
 

          </div>

          {/* Terms + Submit */}
          <div className="flex items-start gap-3 mt-6 pt-4 border-t border-gray-100">
            <input type="checkbox" id="terms" checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ accentColor: '#2563eb' }} />
            <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer">
              I agree to the{' '}
              <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 font-medium hover:underline">
                Terms and Conditions
              </button>
            </label>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <button type="button" onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
              Submit Registration
            </button>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Terms and Conditions</h2>
                <p className="text-xs text-gray-500 mt-0.5">SwiftPass Member Agreement</p>
              </div>
              <button onClick={() => setShowTerms(false)}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center">
                ×
              </button>
            </div>

            <div ref={termsContentRef} onScroll={handleTermsScroll}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[
                { title: "1. Account Registration", body: "By registering, you agree to provide accurate information and maintain the confidentiality of your account credentials. You are responsible for all activities under your account." },
                { title: "2. Service Usage", body: "SwiftPass Tech provides gym management software. You agree to use the service in compliance with all applicable laws. Misuse may result in account suspension or termination." },
                { title: "3. Data Privacy", body: "We collect and process your data in accordance with the Data Privacy Act of 2012 and applicable data protection laws. We implement industry-standard security measures to protect your data." },
                { title: "4. Payment Terms", body: "Fees are charged based on your selected plan. Payment is due at the beginning of each billing cycle. We reserve the right to modify pricing with 30 days advance notice." },
                { title: "5. Service Availability", body: "We strive to maintain high uptime for our services but do not guarantee uninterrupted service and are not liable for downtime due to maintenance or circumstances beyond our control." },
                { title: "6. Intellectual Property", body: "All content and features of SwiftPass Tech are protected by intellectual property laws. You may not reproduce or distribute any part without our explicit permission." },
                { title: "7. Termination", body: "Either party may terminate this agreement with 30 days written notice. Upon termination, you will have 30 days to export your data before it is permanently deleted." },
              ].map((section, i, arr) => (
                <div key={i} className={`pb-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <p className="text-xs font-medium text-gray-900 mb-1">{section.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <input type="checkbox" id="terms-modal" checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={!hasScrolledTerms}
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 disabled:opacity-40"
                  style={{ accentColor: '#2563eb' }} />
                <label htmlFor="terms-modal" className={`text-xs cursor-pointer ${hasScrolledTerms ? 'text-gray-700' : 'text-gray-400'}`}>
                  {hasScrolledTerms ? "I have read and agree to the Terms and Conditions" : "Scroll to the bottom to enable acceptance"}
                </label>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setShowTerms(false)}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
                  Close
                </button>
                <button type="button" onClick={() => setShowTerms(false)} disabled={!termsAccepted}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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

export default MemberRegistration;  