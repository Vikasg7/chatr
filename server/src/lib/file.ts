import fs from "fs";
import path from "path";
import logger from "./logger";

const uploadDir = path.join(process.cwd(), "public/uploads");

/**
 * Deletes a file from the uploads directory given its URL or filename.
 * @param fileIdentifier - The full URL (e.g., /uploads/filename.ext) or just the filename.
 */
export async function deleteFile(fileIdentifier: string | null | undefined): Promise<void> {
    if (!fileIdentifier) return;

    // Extract filename if it's a URL
    const filename = fileIdentifier.startsWith("/uploads/")
        ? fileIdentifier.replace("/uploads/", "")
        : fileIdentifier;

    const filePath = path.join(uploadDir, filename);

    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            logger.info(`🗑️ Deleted file: ${filePath}`);
        } else {
            logger.warn(`⚠️ File not found for deletion: ${filePath}`);
        }
    } catch (err) {
        logger.error(`❌ Error deleting file ${filePath}:`, err);
    }
}
