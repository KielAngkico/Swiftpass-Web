import react from "react";

const Footer = () => {
    return(
        <footer className="bg-black text-white py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-lg font-bold text-blue-400 mb-4 md:mb-0">SwiftPass</div>
            <p className="text-gray-300 text-center md:text-left text-sm">
              © {new Date().getFullYear()} SwiftPass. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    );
}
export default Footer;