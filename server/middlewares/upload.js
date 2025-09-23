import multer from "multer";

const storage = multer.memoryStorage(); // keep files in RAM, easy to base64
export const uploadImages = multer({
    storage,
    limits: { files: 4, fileSize: 4 * 1024 * 1024 }, // 4 files, 4MB each
    fileFilter: (_req, file, cb) => {
        const ok = ["image/jpeg", "image/png"].includes(file.mimetype);
        cb(ok ? null : new Error("Only jpg/png allowed"), ok);
    }
}).array("images", 4);