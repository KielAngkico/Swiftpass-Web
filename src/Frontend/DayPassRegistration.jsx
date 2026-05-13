import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from "../config";
import { useToast } from '../components/ToastManager';

const DaypassRegistration = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const termsContentRef = useRef(null);
  const { showToast } = useToast();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    guest_name: '',
    gender: '',
    phone_number: '',
    email: '',
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
    setErrors(prev => ({ ...prev, [name]: '' }));

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

  const validate = () => {
    const e = {};
    if (!formData.guest_name.trim()) e.guest_name = 'Full name is required';
    else if (!/^[a-zA-Z\s\-']+$/.test(formData.guest_name.trim())) e.guest_name = 'Letters and spaces only';

    if (!formData.gender) e.gender = 'Gender is required';

    if (!formData.phone_number.trim()) e.phone_number = 'Phone number is required';
    else if (!/^09\d{9}$/.test(formData.phone_number)) e.phone_number = 'Must be 09XXXXXXXXX format';

    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email address';

    if (!formData.gym_code_input.trim()) e.gym_code_input = 'Gym code is required';
    else if (!selectedGym) e.gym_code_input = 'Gym code not found';

    return e;
  };

  const handleSubmit = async () => {
    if (!termsAccepted) { showToast({ message: 'Please accept the terms and conditions', type: 'error' }); return; }
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast({ message: 'Please fix the errors below', type: 'error' });
      return;
    }
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/api/daypass-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, admin_id: selectedGym.id })
      });

      const data = await response.json();
      if (response.ok) {
        setRegistrationNumber(data.registration_number);
        setSubmitStatus('success');
      } else {
        showToast({ message: data.error || 'Registration failed', type: 'error' });
      }
    } catch (error) {
      showToast({ message: `Network error: ${error.message}`, type: 'error' });
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
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Request Submitted</h2>
        <p className="text-xs text-gray-500 mb-6">The gym staff will review your day pass request shortly.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-1">Your Registration Number</p>
          <p className="text-xl font-semibold text-blue-600">{registrationNumber}</p>
        </div>
        <p className="text-xs text-gray-400">This request expires in <span className="text-gray-600 font-medium">1 hour</span> if not reviewed.</p>
      </div>
    </div>
  );
}

return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Day Pass Registration</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Guest Information</p>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Full Name</label>
              <input type="text" name="guest_name" value={formData.guest_name} onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.guest_name ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Enter full name" />
              {errors.guest_name && <p className="text-xs text-red-500 mt-1">{errors.guest_name}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.gender ? 'border-red-400' : 'border-gray-200'}`}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
              <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.phone_number ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Enter Phone Number" />
              {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Enter Email Address" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Gym Code</label>
              <input type="text" name="gym_code_input" value={formData.gym_code_input || ''}
                placeholder="Enter GYM CODE" onChange={handleChange} maxLength={10}
                className={`w-full border rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase ${errors.gym_code_input ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.gym_code_input && <p className="text-xs text-red-500 mt-1">{errors.gym_code_input}</p>}

            </div>
          </div>

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
              Submit Request
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Terms and Conditions</h2>
                <p className="text-xs text-gray-500 mt-0.5">SwiftPass Day Pass Agreement</p>
              </div>
              <button onClick={() => setShowTerms(false)}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center">
                ×
              </button>
            </div>

            <div ref={termsContentRef} onScroll={handleTermsScroll}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[
                { title: "1. Day Pass Usage", body: "Day passes are valid for a single day only and expire at midnight of the day of purchase. Passes are non-transferable and non-refundable." },
                { title: "2. RFID Access", body: "An RFID card or tag will be assigned upon entry. It must be returned at the end of your session. Lost or damaged RFID cards may incur a replacement fee." },
                { title: "3. Facility Access", body: "Access is limited to the gym's operating hours on the day of the pass. Re-entry on the same day is subject to gym policy." },
                { title: "4. Data Privacy", body: "Your personal information is collected and processed in accordance with the Data Privacy Act of 2012 and will only be used for gym access purposes." },
                { title: "5. Conduct", body: "Guests are expected to follow gym rules and proper conduct. Misuse of facilities may result in removal without refund." },
                { title: "6. Acceptance", body: "By submitting this form, you acknowledge and agree to these terms and conditions for the day pass." },
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

export default DaypassRegistration;