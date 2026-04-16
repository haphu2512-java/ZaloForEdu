import api from "./authService";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

const normalizeMedia = (item) => ({
  ...item,
  url: toAbsoluteUrl(item.url),
});

// Các định dạng file được phép
export const ALLOWED_EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  doc: ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "txt"],
  archive: ["zip", "rar", "7z", "tar", "gz"],
};

export const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_EXTENSIONS).flat();

export const FILE_COLORS = {
  pdf: "#EF4444",
  docx: "#3B82F6",
  doc: "#3B82F6",
  xlsx: "#10B981",
  xls: "#10B981",
  pptx: "#F59E0B",
  ppt: "#F59E0B",
  zip: "#8B5CF6",
  rar: "#8B5CF6",
  png: "#EC4899",
  jpg: "#EC4899",
  jpeg: "#EC4899",
  default: "#64748B",
};

// Lấy resource_type phù hợp cho Cloudinary
export const getResourceType = (extension) => {
  const ext = extension.toLowerCase().replace(".", "");
  if (ALLOWED_EXTENSIONS.image.includes(ext)) return "image";
  if (ALLOWED_EXTENSIONS.video.includes(ext)) return "video";
  return "raw"; // pdf, docx, zip, rar,...
};

// Lấy loại icon phù hợp để hiển thị
export const getFileCategory = (extension) => {
  const ext = (extension || "").toLowerCase().replace(".", "");
  if (ALLOWED_EXTENSIONS.image.includes(ext)) return "image";
  if (ALLOWED_EXTENSIONS.video.includes(ext)) return "video";
  if (ALLOWED_EXTENSIONS.doc.includes(ext)) return "doc";
  if (ALLOWED_EXTENSIONS.archive.includes(ext)) return "archive";
  return "other";
};

export const getExtension = (filename) => {
  return "." + filename.split(".").pop();
};

// ========== CLOUDINARY (dùng cho Profile avatar) ==========

/**
 * Bước 1: Lấy chữ ký Cloudinary từ backend (không expose secret key lên client)
 */
export const getUploadSignature = async ({ resourceType = "auto", folder } = {}) => {
  const response = await api.post("/media/cloudinary/signature", {
    resourceType,
    folder,
  });
  return response.data.data;
};

/**
 * Bước 2: Upload trực tiếp lên Cloudinary bằng chữ ký đã lấy
 * Trả về { secureUrl, publicId }
 */
export const uploadToCloudinary = async (file, signatureData, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", signatureData.timestamp);
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);
  formData.append("public_id", signatureData.publicId);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      } else {
        reject(new Error("Upload lên Cloudinary thất bại"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Lỗi kết nối khi upload")));

    xhr.open("POST", signatureData.uploadUrl);
    xhr.send(formData);
  });
};

/**
 * Bước 3: Đăng ký file đã upload với backend để lưu metadata vào DB
 */
export const registerMedia = async ({ fileName, mimeType, size, url, publicId, resourceType }) => {
  const response = await api.post("/media/cloudinary/register", {
    fileName,
    mimeType,
    size,
    url,
    publicId,
    resourceType,
  });
  return response.data.data;
};

// ========== LOCAL UPLOAD (dùng cho Chat) ==========

/**
 * Upload file vào /uploads qua Multipart FormData — POST /media/upload-form
 * Đồng bộ với Mobile (uploadMediaForm). Không cần đọc Base64, nhẹ và nhanh hơn.
 */
export const uploadFile = async (file, { onProgress } = {}) => {
  const extNoDot = getExtension(file.name).replace(".", "").toLowerCase();
  if (!ALL_ALLOWED_EXTENSIONS.includes(extNoDot)) {
    throw new Error(`Định dạng .${extNoDot} không được hỗ trợ.`);
  }

  onProgress?.(10);

  const formData = new FormData();
  formData.append("file", file);

  onProgress?.(30);

  const response = await api.post("/media/upload-form", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        // Map 30% → 95% trong quá trình upload thực
        onProgress(30 + Math.round(pct * 0.65));
      }
    },
  });

  onProgress?.(100);

  return response.data.data;
};

export const deleteMedia = async (mediaId) => {
  const response = await api.delete(`/media/${mediaId}`);
  return response.data;
};

export const getMyMedia = async (page = 1, limit = 20) => {
  const response = await api.get("/media/my", { params: { page, limit } });
  return response.data.data;
};
