import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory"; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, 
});


api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
 
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/api/refresh`, {}, { withCredentials: true });
        const newAccessToken = res.data.accessToken;

        setAccessToken(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error("❌ Refresh failed:", refreshErr);
        clearAccessToken(); 
      }
    }

    return Promise.reject(error);
  }
);

export default api;
