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
      };

      await emailjs.send(
        "YOUR_SERVICE_ID",   
        "YOUR_TEMPLATE_ID",  
        templateParams,
        "YOUR_PUBLIC_KEY"    
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
    <div className="bg-black">
      <LandingPageHeader />
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gray-400" id="main">
        <div className="flex flex-col md:flex-row h-screen items-center justify-between px-6 md:px-20 py-10">
          <div className="md:w-1/2 w-full flex flex-col justify-center space-y-6 text-left">
            <h1 className="text-5xl font-bold text-white leading-tight">Welcome to SwiftPass</h1>
            <p className="text-lg text-white leading-relaxed">
              Your all-in-one gym management solution with RFID integration. Message us now and Schedule an appointment
            </p>
            <div>
              <button className="px-8 py-3 bg-black text-white rounded-xl shadow hover:bg-red-500 transition duration-300">
                Get Started
              </button>
            </div>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-white border-4 border-red-400 rounded-xl shadow-xl overflow-hidden">
              <img className="w-full h-auto object-cover" src={logo} alt="SwiftPass Logo" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-gray-500 flex items-center justify-center px-4">
        <div className="w-full max-w-6xl p-20">
          <h1 className="text-4xl text-white font-bold mb-4 flex justify-center">What is SwiftPass?</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full p-5">
            <div className="bg-black p-8 text-white text-xl rounded shadow hover:bg-red-600 hover:shadow-xl transition duration-300">
              SwiftPass offers cutting-edge RFID technology that simplifies gym access management, allowing members to enter quickly and securely without manual check-ins.
            </div>
            <div className="bg-black p-6 text-white text-xl rounded shadow hover:bg-red-600 hover:shadow-xl transition duration-300">
              Easily track membership status, renewals, and payments with SwiftPass’s intuitive dashboard — giving gym staff full control over member data in real time.
            </div>
            <div className="bg-black p-6 text-white text-xl rounded shadow hover:bg-red-600 hover:shadow-xl transition duration-300">
              Streamline trainer appointments and monitor member progress effortlessly, improving client satisfaction and boosting gym operational efficiency.
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="Contact" className="bg-gray-400 min-h-screen flex items-center justify-center px-4 py-16">
        <div className="flex flex-col md:flex-row w-full max-w-6xl bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:w-1/2 text-white bg-black flex flex-col justify-center p-10 space-y-6">
            <h1 className="text-5xl font-bold leading-snug">Ready to take the <br />Next Step?</h1>
            <p className="text-lg">Book For a Demo now</p>
          </div>

          <div className="md:w-1/2 p-10 bg-white">
            <h2 className="text-2xl font-semibold mb-6">Contact Us</h2>
            {successMsg && <p className="text-green-600 mb-4">{successMsg}</p>}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 col-span-2"
                required
              />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 col-span-2"
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 col-span-2 h-32"
                required
              ></textarea>
              <button
                type="submit"
                className="col-span-2 bg-red-600 text-white py-3 rounded-md hover:bg-red-700 transition duration-300"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-center items-center">
          <p className="text-lg text-center md:text-left">© {new Date().getFullYear()} SwiftPass. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
