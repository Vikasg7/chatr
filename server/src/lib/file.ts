import fs from "fs";
import path from "path";

const uploadDir = path.join(__dirname, "../../public/uploads");

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
            console.log(`🗑️ Deleted file: ${filePath}`);
        } else {
            console.warn(`⚠️ File not found for deletion: ${filePath}`);
        }
    } catch (err) {
        console.error(`❌ Error deleting file ${filePath}:`, err);
    }
}
