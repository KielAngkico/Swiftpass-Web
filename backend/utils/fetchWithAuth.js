// utils/fetchWithAuth.js
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory";
import { API_URL } from "../config";

export async function fetchWithAuth(url, options = {}, retry = true) {
  const token = getAccessToken();

  const res = await fetch(url, {
    ...options,
    credentials: "include", // Important for sending cookies (like refreshToken)
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 && retry) {
    // Try to refresh token using the refreshToken cookie
    try {
      const refreshRes = await fetch(`${API_URL}/api/refresh`, {
        method: "POST",
        credentials: "include",
      });

      const refreshData = await refreshRes.json();

      if (refreshRes.ok && refreshData.accessToken) {
        setAccessToken(refreshData.accessToken);

        // Retry original request once with new token
        return fetchWithAuth(url, options, false);
      } else {
        clearAccessToken();
        throw new Error("Session expired. Please login again.");
      }
    } catch (error) {
      clearAccessToken();
      throw new Error("Token refresh failed");
    }
  }

  return res;
}
