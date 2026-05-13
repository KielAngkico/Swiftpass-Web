const BASE_URL = import.meta.env.VITE_IP || "https://swiftpasstech.com";

export const getImageUrl = (imageUrl, folder = "members") => {
  if (!imageUrl) return `${BASE_URL}/uploads/members/default.jpg`;

  if (imageUrl.startsWith("http")) {
    return imageUrl.replace(/^http:\/\//i, "https://");
  }

  if (imageUrl.startsWith("/uploads/")) {
    return `${BASE_URL}${imageUrl}`;
  }

  if (imageUrl.startsWith("uploads/")) {
    return `${BASE_URL}/${imageUrl}`;
  }

  return `${BASE_URL}/uploads/${folder}/${imageUrl}`;
};