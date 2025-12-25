'use server';

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function uploadImageAction(formData: FormData): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: 'No file uploaded' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads/meals');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }

        // Generate Filename: YYYY-MM-DD-Timestamp-Name
        const today = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${today}-${timestamp}-${safeName}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const url = `/uploads/meals/${filename}`;
        return { success: true, url };
    } catch (e) {
        console.error('Upload Error:', e);
        return { success: false, message: 'Upload Failed' };
    }
}
