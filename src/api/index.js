import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory";

const api = axios.create({
  baseURL: API_URL,
  timeout: 1000000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Race condition prevention variables
let isRefreshing = false;
let failedQueue = [];

// Auto-refresh timer
let refreshTimer = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const cancelRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    console.log("🛑 [Auto-Refresh] Timer cancelled");
  }
};

const triggerLogout = () => {
  console.log("🚨 [Axios] Triggering logout due to auth failure");
  cancelRefreshTimer();
  clearAccessToken();
  sessionStorage.clear();
  localStorage.clear();

  window.dispatchEvent(new Event("auth-changed"));

  window.location.href = "/";
};

const scheduleTokenRefresh = (token) => {
  if (refreshTimer) clearTimeout(refreshTimer);
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    const refreshAt = expiresIn - (60 * 1000); // 1 minute before expiry
    
    console.log(`⏰ [Auto-Refresh] Token expires in ${Math.round(expiresIn / 1000)}s, refresh scheduled in ${Math.round(refreshAt / 1000)}s`);
    
    if (refreshAt > 0) {
      refreshTimer = setTimeout(async () => {
        console.log("🔄 [Auto-Refresh] Attempting automatic token refresh...");
        
        // Prevent race condition if manual refresh happens
        if (isRefreshing) {
          console.log("⏸️ [Auto-Refresh] Manual refresh in progress, skipping auto-refresh");
          return;
        }
        
        isRefreshing = true;
        
        try {
          const res = await axios.post(`${API_URL}/api/refresh-token`, {}, { 
            withCredentials: true,
            timeout: 10000 
          });
          
          if (res.data.accessToken) {
            console.log("✅ [Auto-Refresh] Token refreshed successfully");
            setAccessToken(res.data.accessToken);
            
            // Process any queued requests that might be waiting
            processQueue(null, res.data.accessToken);
            
            // Schedule next refresh
            scheduleTokenRefresh(res.data.accessToken);
          } else {
            console.log("❌ [Auto-Refresh] No access token in response");
          }
        } catch (err) {
          console.error("❌ [Auto-Refresh] Failed:", err.message);
          
          // If refresh token is invalid, trigger logout
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.log("🚨 [Auto-Refresh] Refresh token invalid - logging out");
            triggerLogout();
          }
          // Otherwise, let next API call handle it via interceptor
        } finally {
          isRefreshing = false;
        }
      }, refreshAt);
    } else {
      console.log("⚠️ [Auto-Refresh] Token already expired or expiring too soon");
    }
  } catch (e) {
    console.error("❌ [Auto-Refresh] Failed to decode token:", e);
  }
};

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

      if (isRefreshing) {
        console.log("🔄 [Axios] Refresh already in progress, queueing request...");
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      console.log("🔄 [Axios] 401 error detected, attempting token refresh...");
      originalRequest._retry = true;
      isRefreshing = true;

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
          timeout: 10000
        });

        const refreshDuration = Date.now() - refreshStartTime;
        console.log(`✅ [Axios] Token refresh successful in ${refreshDuration}ms`);

        const newAccessToken = res.data.accessToken;

        if (newAccessToken) {
          const newTokenInfo = decodeTokenPayload(newAccessToken);
          console.log("🎫 [Axios] New access token received:", newTokenInfo);

          setAccessToken(newAccessToken);
          
          // Schedule auto-refresh for new token
          scheduleTokenRefresh(newAccessToken);

          // Process all queued requests
          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          console.log("🔄 [Axios] Retrying original request with new token");
          return api(originalRequest);
        } else {
          console.log("❌ [Axios] No access token in refresh response");
          processQueue(new Error("No access token received"), null);
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

        processQueue(refreshErr, null);

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

        clearAccessToken();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { scheduleTokenRefresh, cancelRefreshTimer };
