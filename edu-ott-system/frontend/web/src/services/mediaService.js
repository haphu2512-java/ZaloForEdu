import api from "./authService";

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

// ========== LOCAL UPLOAD (dùng cho Chat — giống mobile) ==========

/**
 * Upload file vào /uploads (giống mobile uploadMediaBase64)
 * Đọc file → base64 → POST /media/upload
 */
export const uploadFile = async (file, { onProgress } = {}) => {
  const extNoDot = getExtension(file.name).replace(".", "").toLowerCase();
  if (!ALL_ALLOWED_EXTENSIONS.includes(extNoDot)) {
    throw new Error(`Định dạng .${extNoDot} không được hỗ trợ.`);
  }

  onProgress?.(10);

  // Đọc file thành base64
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsDataURL(file);
  });

  onProgress?.(50);

  const response = await api.post("/media/upload", {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    contentBase64,
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
