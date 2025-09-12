import React from "react";
import Navbar from "./Navbar";

const LandingPageHeader = () => {
    return (
        <div className="min-h-screen mb-4 bg-cover bg-center flex items-center justify-center w-full overflow-hidden" id="Header" style={{ backgroundImage: "url('/bg1.png')" }}>
        
        <Navbar />
            <div className="relative z-10 px-6 md:px-12 text-white text-center max-w-2xl space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold leading-snug">Modern Gym Management. Simplfied</h1>
                <p className="text-lg leading-relaxed">RFID-based gym entry,scheduling,payments and progress tracking - all in one system</p>
                <a href="#Contact" className="mt-4 px-8 py-3 bg-red-600 text-white rounded-full shadow hover:bg-red-500 transition duration-300">Book for a Demo now!</a>
            </div>
        </div>
       
        
    );
};

export default LandingPageHeader;
