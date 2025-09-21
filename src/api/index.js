import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory"; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 1000000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, 
});

// Function to trigger logout across the app
const triggerLogout = () => {
  console.log("🚨 [Axios] Triggering logout due to auth failure");
  clearAccessToken();
  sessionStorage.clear();
  localStorage.clear();
  
  // Dispatch event to notify other parts of the app
  window.dispatchEvent(new Event("auth-changed"));
  
  // Redirect to login page
  window.location.href = "/";
};

// Function to decode JWT payload without verification (for logging)
const decodeTokenPayload = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      role: payload.role,
      exp: payload.exp,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      minutesUntilExpiry: Math.round(((payload.exp * 1000 - Date.now()) / 1000 / 60) * 100) / 100
    };
  } catch (e) {
    return { error: "Invalid token format" };
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    
    console.log(`📤 [Axios Request] ${config.method?.toUpperCase()} ${config.url} at ${new Date().toISOString()}`);
    
    if (token) {
      const tokenInfo = decodeTokenPayload(token);
      console.log("🎫 [Axios Request] Using access token:", tokenInfo);
      
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log("⚠️ [Axios Request] No access token available");
    }
    
    return config;
  },
  (error) => {
    console.error("❌ [Axios Request] Request setup error:", error);
    return Promise.reject(error);
  }
);
 
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [Axios Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log(`❌ [Axios Response] ${error.response?.status || 'Network Error'} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("🔄 [Axios] 401 error detected, attempting token refresh...");
      
      originalRequest._retry = true;
      
      const currentToken = getAccessToken();
      if (currentToken) {
        const tokenInfo = decodeTokenPayload(currentToken);
        console.log("🎫 [Axios] Current token before refresh:", tokenInfo);
      }
      
      try {
        console.log("📡 [Axios] Calling refresh token endpoint...");
        const refreshStartTime = Date.now();
        
        const res = await axios.post(`${API_URL}/api/refresh-token`, {}, { 
          withCredentials: true,
          timeout: 10000 // 10 second timeout for refresh
        });
        
        const refreshDuration = Date.now() - refreshStartTime;
        console.log(`✅ [Axios] Token refresh successful in ${refreshDuration}ms`);
        
        const newAccessToken = res.data.accessToken;
        
        if (newAccessToken) {
          const newTokenInfo = decodeTokenPayload(newAccessToken);
          console.log("🎫 [Axios] New access token received:", newTokenInfo);
          
          setAccessToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          console.log("🔄 [Axios] Retrying original request with new token");
          return api(originalRequest);
        } else {
          console.log("❌ [Axios] No access token in refresh response");
          triggerLogout();
          return Promise.reject(new Error("No access token received"));
        }
        
      } catch (refreshErr) {
        const refreshDuration = Date.now() - (refreshStartTime || Date.now());
        console.error(`❌ [Axios] Token refresh failed after ${refreshDuration}ms:`, {
          status: refreshErr.response?.status,
          statusText: refreshErr.response?.statusText,
          message: refreshErr.message,
          isTimeout: refreshErr.code === 'ECONNABORTED'
        });
        
        // Check if it's a 401/403 from refresh endpoint (invalid refresh token)
        if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
          console.log("🚨 [Axios] Refresh token invalid - triggering logout");
          triggerLogout();
          return Promise.reject(new Error("Session expired. Please login again."));
        }
        
        // For network errors or timeouts
        if (!refreshErr.response) {
          console.log("🌐 [Axios] Network error during refresh, clearing token");
          clearAccessToken();
          return Promise.reject(new Error("Network error during token refresh"));
        }
        
        // For other errors, just clear token and let the error propagate
        clearAccessToken();
      }
    }

    return Promise.reject(error);
  }
);

export default api;