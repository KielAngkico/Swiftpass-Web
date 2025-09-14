import React, {
  Suspense,
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { WebSocketProvider } from "./contexts/WebSocketContext.jsx";
import Header from "./components/Header";
import Navbar from "./components/Navbar"; 
import Homepage from "./Frontend/Homepage";
import { API_URL } from "./config";
import { setAccessToken, clearAccessToken, getAccessToken } from "./tokenMemory";


const AddClient = React.lazy(() => import("./Frontend/SuperAdmin/addClient"));
const ExerciseLibrary = React.lazy(() => import("./Frontend/SuperAdmin/ExerciseLibrary"));
const SplitLibrary = React.lazy(() => import("./Frontend/SuperAdmin/SplitLibrary"));
const RepRange = React.lazy(() => import("./Frontend/SuperAdmin/RepRange"));
const FoodLibrary = React.lazy(() => import("./Frontend/SuperAdmin/FoodLibrary"));
const Allergens = React.lazy(() => import("./Frontend/SuperAdmin/AllergensMasterList"));
const ItemsInventory = React.lazy(() => import("./Frontend/SuperAdmin/ItemsInventory"));

const AdminAnalyticalDashboard = React.lazy(() => import("./Frontend/Admin/AdminAnalyticalDashboard"));
const AdminViewMembers = React.lazy(() => import("./Frontend/Admin/AdminViewMembers"));
const ActivityAnalytics = React.lazy(() => import("./Frontend/Admin/ActivityAnalytics"));
const TransactionsReport = React.lazy(() => import("./Frontend/Admin/TransactionsReport"));
const PricingManagement = React.lazy(() => import("./Frontend/Admin/PricingManagement"));
const StaffManagement = React.lazy(() => import("./Frontend/Admin/StaffManagement"));

const ViewMembers = React.lazy(() => import("./Frontend/Staff/ViewMembers"));
const ScanRFID = React.lazy(() => import("./Frontend/Staff/ScanRFID"));
const DayPass = React.lazy(() => import("./Frontend/Staff/DayPass"));
const AddMember = React.lazy(() => import("./Frontend/Staff/AddMember"));
const MemberEntry = React.lazy(() => import("./Frontend/Staff/member-entry"));
const MembershipTransactions = React.lazy(() => import("./Frontend/Staff/MembershipTransactions"));


const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth-status-auto`, {
          method: "GET",
          credentials: "include", 
        });
        const data = await res.json();

        if (res.ok && data.user) {
          if (data.accessToken) {
            setAccessToken(data.accessToken);
          }

          setUser(data.user);
        } else {
          clearAccessToken();
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    const handleAuthChanged = () => checkAuth();
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  if (loading) return <p>Loading session...</p>;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};




const WebSocketWrapper = ({ children }) => {
  const navigate = useNavigate();

  const customNavigate = (path, state, role) => {
    const allowedPrefixes =
      role === "superadmin"
        ? ["/SuperAdmin/"]
        : role === "admin"
        ? ["/Admin/"]
        : role === "staff"
        ? ["/Staff/"]
        : [];

    if (allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
      navigate(path, state);
    } else {
      console.warn(`⛔ Navigation blocked for role=${role}:`, path);
      if (role === "superadmin") navigate("/SuperAdmin/addClient");
      if (role === "admin") navigate("/Admin/StaffManagement");
      if (role === "staff") navigate("/Staff/member-entry");
    }
  };

  return <WebSocketProvider navigate={customNavigate}>{children}</WebSocketProvider>;
};

const useAutoLogout = (timeout = 60 * 60 * 1000, enabled = true) => {
  const { setUser } = useAuth();
  const timerRef = useRef();
  const countdownRef = useRef();

  const performLogout = async () => {
    console.log("🚨 Auto-logout triggered!");
    
    try {
  
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include", 
      });
      console.log("✅ Backend logout successful");
    } catch (error) {
      console.error("❌ Backend logout failed:", error);

    }


    clearAccessToken();
    setUser(null);
    sessionStorage.clear();
    localStorage.clear();


    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/";
  };

  const resetTimer = () => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    let remaining = Math.floor(timeout / 1000);
 

    countdownRef.current = setInterval(() => {
      remaining--;

      if (remaining <= 0) clearInterval(countdownRef.current);
    }, 1000);

    timerRef.current = setTimeout(performLogout, timeout);
  };

  useEffect(() => {
    if (!enabled) return;
    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [enabled]);

  return { resetTimer };
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<p>Loading page...</p>}>
      <Routes>
        <Route path="/" element={<Homepage />} />

        {user?.role === "superadmin" && (
          <>
            <Route path="/SuperAdmin/addClient" element={<AddClient />} />
            <Route path="/SuperAdmin/ExerciseLibrary" element={<ExerciseLibrary />} />
            <Route path="/SuperAdmin/SplitLibrary" element={<SplitLibrary />} />
            <Route path="/SuperAdmin/RepRange" element={<RepRange />} />
            <Route path="/SuperAdmin/FoodLibrary" element={<FoodLibrary />} />
            <Route path="/SuperAdmin/AllergensMasterList" element={<Allergens />} />
            <Route path="/SuperAdmin/ItemsInventory" element={<ItemsInventory />} />
          </>
        )}

        {user?.role === "admin" && (
          <>
            <Route path="/Admin/AdminAnalyticalDashboard" element={<AdminAnalyticalDashboard />} />
            <Route path="/Admin/AdminViewMembers" element={<AdminViewMembers />} />
            <Route path="/Admin/ActivityAnalytics" element={<ActivityAnalytics />} />
            <Route path="/Admin/TransactionsReport" element={<TransactionsReport />} />
            <Route path="/Admin/PricingManagement" element={<PricingManagement />} />
            <Route path="/Admin/StaffManagement" element={<StaffManagement />} />
          </>
        )}

        {user?.role === "staff" && (
          <>
            <Route path="/Staff/member-entry" element={<MemberEntry />} />
            <Route path="/Staff/view-members" element={<ViewMembers />} />
            <Route path="/Staff/DayPass" element={<DayPass />} />
            <Route path="/Staff/AddMember" element={<AddMember />} />
            <Route path="/Staff/scan-rfid" element={<ScanRFID />} />
            <Route path="/Staff/MembershipTransactions" element={<MembershipTransactions />} />
          </>
        )}

        <Route
          path="*"
          element={
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <h1>404 - Page Not Found</h1>
              <p>
                <a href="/">Go Back to Login</a>
              </p>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

const ConditionalHeader = ({ onLogoutClick, loading }) => {
  const location = useLocation();
  return location.pathname !== "/" ? (
    <Header onLogoutClick={onLogoutClick} loading={loading} />
  ) : null;
};

const App = () => {
  const { user, setUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { resetTimer } = useAutoLogout(60 * 60 * 1000, !!user);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      clearAccessToken();
      setUser(null);
      sessionStorage.clear();
      localStorage.clear();

      window.dispatchEvent(new Event("auth-changed"));

      setShowLogoutConfirm(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert("Network error during logout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar /> 
      <ConditionalHeader onLogoutClick={() => setShowLogoutConfirm(true)} loading={loading} />
      <AppRoutes />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-gray-800 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4 text-black">Confirm Logout</h2>
            <p className="text-black mb-6">
              Are you sure you want to log out, {user?.name}?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 text-black disabled:opacity-50"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AppWrapper = () => (
  <Router>
    <AuthProvider>
      <WebSocketWrapper>
        <App />
      </WebSocketWrapper>
    </AuthProvider>
  </Router>
);

export default AppWrapper;
