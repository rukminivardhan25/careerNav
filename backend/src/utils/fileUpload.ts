/**
 * File upload configuration using Multer
 */
import multer from "multer";
import path from "path";
import fs from "fs";

// Allowed file types
const ALLOWED_FILE_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/jpg", "image/webp"];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Profile photo size limit: 2MB
const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB in bytes

/**
 * Configure storage for session files
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      return cb(new Error("Session ID is required"), "");
    }

    const uploadPath = path.join(process.cwd(), "uploads", "sessions", sessionId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter function
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`));
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(new Error(`MIME type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`));
  }

  cb(null, true);
};

/**
 * Multer middleware for file upload
 */
export const uploadFile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Configure storage for assignment files
 */
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const assignmentId = req.params.assignmentId;
    if (!assignmentId) {
      return cb(new Error("Assignment ID is required"), "");
    }

    const uploadPath = path.join(process.cwd(), "uploads", "assignments", assignmentId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/**
 * Multer middleware for assignment file upload
 */
export const uploadAssignmentFile = multer({
  storage: assignmentStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Configure storage for session resources (PDFs only)
 */
const sessionResourceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const scheduleId = req.params.scheduleId;
    if (!sessionId || !scheduleId) {
      return cb(new Error("Session ID and Schedule ID are required"), "");
    }

    const uploadPath = path.join(process.cwd(), "uploads", "sessions", sessionId, "resources", scheduleId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter for PDFs only
 */
const pdfFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow PDF files
  if (file.mimetype !== "application/pdf" && path.extname(file.originalname).toLowerCase() !== ".pdf") {
    return cb(new Error("Only PDF files are allowed"));
  }
  cb(null, true);
};

/**
 * Multer middleware for session resource (PDF) upload
 */
export const uploadSessionResource = multer({
  storage: sessionResourceStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Configure storage for profile photos
 */
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "profiles");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp.extension
    const userId = (req as any).user?.userId || "unknown";
    const uniqueSuffix = `${userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter for profile photos (images only)
 */
const profilePhotoFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow image files
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only image files are allowed"));
  }

  cb(null, true);
};

/**
 * Multer middleware for profile photo upload
 */
export const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: profilePhotoFilter,
  limits: {
    fileSize: MAX_PROFILE_PHOTO_SIZE,
  },
});

/**
 * Get file URL for a given file path
 */
export function getFileURL(filePath: string): string {
  // Return relative path that can be served statically
  // In production, this should be a CDN URL
  const relativePath = filePath.replace(process.cwd(), "").replace(/\\/g, "/");
  return `/api/uploads${relativePath}`;
}

