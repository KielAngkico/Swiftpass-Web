import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory";

const api = axios.create({
  baseURL: API_URL,
  timeout: 1000000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

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
  }
};

const triggerLogout = () => {
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
    const refreshAt = expiresIn - (60 * 1000); 
    
    
    if (refreshAt > 0) {
      refreshTimer = setTimeout(async () => {
        
        if (isRefreshing) {
          return;
        }
        
        isRefreshing = true;
        
        try {
          const res = await axios.post(`${API_URL}/api/refresh-token`, {}, { 
            withCredentials: true,
            timeout: 10000 
          });
          
          if (res.data.accessToken) {
             setAccessToken(res.data.accessToken);
            
             processQueue(null, res.data.accessToken);
            
             scheduleTokenRefresh(res.data.accessToken);
          } else {
           }
        } catch (err) {
           
          if (err.response?.status === 401 || err.response?.status === 403) {
             triggerLogout();
          }
        } finally {
          isRefreshing = false;
        }
      }, refreshAt);
    } else {
     }
  } catch (e) {
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

 
    if (token) {
      const tokenInfo = decodeTokenPayload(token);
 
      config.headers.Authorization = `Bearer ${token}`;
    } else {
     }

    return config;
  },
  (error) => {
     return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
     return response;
  },
  async (error) => {
    const originalRequest = error.config;

 
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
 
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

       originalRequest._retry = true;
      isRefreshing = true;

      const currentToken = getAccessToken();
      if (currentToken) {
        const tokenInfo = decodeTokenPayload(currentToken);
       }

      try {
         const refreshStartTime = Date.now();

        const res = await axios.post(`${API_URL}/api/refresh-token`, {}, {
          withCredentials: true,
          timeout: 10000
        });

        const refreshDuration = Date.now() - refreshStartTime;
 
        const newAccessToken = res.data.accessToken;

        if (newAccessToken) {
          const newTokenInfo = decodeTokenPayload(newAccessToken);
 
          setAccessToken(newAccessToken);
          
           scheduleTokenRefresh(newAccessToken);

           processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          return api(originalRequest);
        } else {
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
          triggerLogout();
          return Promise.reject(new Error("Session expired. Please login again."));
        }

        if (!refreshErr.response) {
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
