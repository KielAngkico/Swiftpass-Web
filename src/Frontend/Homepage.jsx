import React, { useState } from "react";
import Navbar from "../components/Navbar";
import LandingPageHeader from "../components/LandingPageHeader";

import logo from "../assets/Final_SwiftPass_Logo.jpg";
import emailjs from "@emailjs/browser";

const Homepage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");

    try {
        const templateParams = {
          from_name: `${formData.firstName} ${formData.lastName}`,
          from_email: formData.email,
          phone: formData.phone,
          message: formData.message,
          name: `${formData.firstName} ${formData.lastName}`, // for {{name}}
          time: new Date().toLocaleString(), // for {{time}}
        };


      await emailjs.send(
        "service_9j70mmt",   
        "template_7k8iklq",  
        templateParams,
        "uEAtQrJKI5Bjnn2by"    
      );

      setSuccessMsg("Message sent successfully!");
      setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error("Email send error:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <LandingPageHeader />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-blue-50" id="main">
        <div className="flex flex-col md:flex-row min-h-screen items-center justify-between px-6 md:px-20 py-10">
          <div className="md:w-1/2 w-full flex flex-col justify-center space-y-6 text-left">
            <h1 className="text-5xl font-bold text-black leading-tight">Transform Your Gym with RFID Technology</h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Fast, secure, and smart membership check-ins with real-time tracking — all in one platform. Message us now and Schedule an appointment.
            </p>
            <div className="flex space-x-4">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition duration-300">
                Book a Demo
              </button>
              <button className="px-8 py-3 border border-blue-600 text-blue-600 rounded-xl shadow hover:bg-blue-50 transition duration-300">
                Learn More
              </button>
            </div>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-white border-4 border-blue-400 rounded-xl shadow-xl overflow-hidden">
              <img className="w-full h-auto object-cover" src={logo} alt="SwiftPass Logo" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-6xl">
          <h1 className="text-4xl text-black font-bold mb-8 text-center">What is SwiftPass?</h1>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-4xl mx-auto">
            SwiftPass is an RFID-Based Gym Membership Monitoring and Access Control System designed to help gyms streamline operations, improve member experience, and gain valuable insights.
          </p>
          
          {/* Solution Components */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-black text-center mb-8">The SwiftPass Solution Includes:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-8 text-center rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
                <div className="text-4xl text-blue-600 mb-4">💻</div>
                <h3 className="text-xl font-semibold text-black mb-4">Website</h3>
                <p className="text-gray-700">
                  Manage members, view reports, and track attendance from anywhere with our comprehensive dashboard.
                </p>
              </div>
              <div className="bg-blue-50 p-8 text-center rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
                <div className="text-4xl text-blue-600 mb-4">📱</div>
                <h3 className="text-xl font-semibold text-black mb-4">Mobile App</h3>
                <p className="text-gray-700">
                  Give members access to check-in history and notifications through our user-friendly mobile application.
                </p>
              </div>
              <div className="bg-blue-50 p-8 text-center rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
                <div className="text-4xl text-blue-600 mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-black mb-4">Hardware</h3>
                <p className="text-gray-700">
                  RFID readers and ID tags for seamless entry and real-time monitoring of gym access.
                </p>
              </div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black text-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Mission</h3>
              <p className="text-lg">
                To empower gyms and fitness centers with a modern, efficient, and secure system that simplifies operations and enhances every member's fitness journey.
              </p>
            </div>
            <div className="bg-blue-600 text-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Vision</h3>
              <p className="text-lg">
                To be the leading provider of RFID-based gym management solutions, helping create smarter, healthier, and more connected fitness communities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-blue-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Features & Benefits</h2>
            <p className="text-xl text-gray-700">Everything you need to modernize your gym operations</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-black mb-3">Fast RFID Check-Ins</h3>
              <p className="text-gray-700">No more long lines — members can check in within seconds.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">📊</div>
              <h3 className="text-xl font-semibold text-black mb-3">Real-Time Monitoring</h3>
              <p className="text-gray-700">Track attendance and equipment usage instantly.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-black mb-3">Centralized Management</h3>
              <p className="text-gray-700">Manage all branches and memberships in one dashboard.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">📈</div>
              <h3 className="text-xl font-semibold text-black mb-3">Detailed Reports</h3>
              <p className="text-gray-700">Generate sales, attendance, and performance reports.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">📱</div>
              <h3 className="text-xl font-semibold text-black mb-3">Member Engagement</h3>
              <p className="text-gray-700">Send updates and reminders through the mobile app.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition duration-300">
              <div className="text-3xl text-blue-600 mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-black mb-3">Secure Access</h3>
              <p className="text-gray-700">Advanced security features protect member data and facility access.</p>
            </div>
          </div>

          {/* Quote Section */}
          <div className="mt-16 text-center bg-white p-8 rounded-xl shadow-lg border border-blue-200 max-w-4xl mx-auto">
            <blockquote className="text-2xl font-medium text-blue-600 mb-4">
              "Better check-in. Better experience. Better results — with SwiftPass."
            </blockquote>
            <p className="text-gray-600">
              "SwiftPass helped us reduce waiting time and made our gym operations smoother than ever!" – Gym Owner, Pilot Partner
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="Contact" className="bg-white min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">Ready to Modernize Your Gym?</h1>
            <p className="text-xl text-gray-700">Let's work together to give your members a seamless experience. Fill out the form below and we'll get in touch.</p>
          </div>

          <div className="flex flex-col md:flex-row bg-blue-50 rounded-xl shadow-lg overflow-hidden border border-blue-200">
            <div className="md:w-1/2 text-white bg-black flex flex-col justify-center p-10 space-y-6">
              <h1 className="text-4xl font-bold leading-snug">Ready to take the <br />Next Step?</h1>
              <p className="text-lg">Book For a Demo now</p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">✓</div>
                  <span>Free consultation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">✓</div>
                  <span>Custom demo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">✓</div>
                  <span>No commitment required</span>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 p-10 bg-white">
              <h2 className="text-2xl font-semibold mb-6 text-black">Contact Us</h2>
              {successMsg && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                  {successMsg}
                </div>
              )}
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 col-span-2"
                  required
                />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 col-span-2"
                />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your Message"
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 col-span-2 h-32"
                  required
                ></textarea>
                <button
                  type="submit"
                  className="col-span-2 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition duration-300"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-bold text-blue-400 mb-4 md:mb-0">SwiftPass</div>
            <p className="text-gray-300 text-center md:text-left">
              © {new Date().getFullYear()} SwiftPass. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;