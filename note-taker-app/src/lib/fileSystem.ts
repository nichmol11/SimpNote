import { db } from '$lib/db';
import { addFileToFolder, getFolderList } from '$lib/projectStore.svelte';
import { 
    readTextFile, 
    writeTextFile, 
    writeFile as writeBinaryFile, 
    readFile as readBinaryFile, 
    readDir, 
    remove, 
    rename,
    copyFile 
} from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';

// In Tauri, we just store the absolute path string
let rootPath: string | null = null;

// --- Folder Management ---

export async function openDirectory() {
    try {
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Select Notes Folder"
        });

        if (selected === null) return null;

        rootPath = selected as string;
        
        await db.directoryMeta.clear(); 
        await db.directoryMeta.add({
            handle: rootPath as any, 
            name: rootPath.split(/[/\\]/).pop() || rootPath
        });
        
        return { name: rootPath.split(/[/\\]/).pop() || rootPath };
    } catch (err) {
        console.error('Error opening directory:', err);
        return null;
    }
}

export async function restoreDirectory() {
    try {
        const results = await db.directoryMeta.limit(1).toArray();
        const meta = results[0];
    
        if (!meta) {
            console.log("No previous directory found in DB.");
            return null;
        }

        console.log("Restoring from DB:", meta);

        // Handle legacy object vs new string
        let path = meta.handle as unknown;
        if (typeof path === 'object') {
            console.warn("Legacy handle found. Clearing DB.");
            await db.directoryMeta.clear();
            return null;
        }

        rootPath = path as string;
        
        // Verify path exists (Tauri specific check)
        // If the user deleted the folder, this might throw, so we catch it
        try {
            await readDir(rootPath); 
        } catch (e) {
            console.warn("Restored path no longer exists/accessible:", rootPath);
            await db.directoryMeta.clear();
            rootPath = null;
            return null;
        }

        return { name: rootPath.split(/[/\\]/).pop() || rootPath };
    } catch (e) {
        console.error("Error restoring directory:", e);
        return null;
    }
}

export async function listFiles() {
    if (!rootPath) {
        console.warn("listFiles called but no root path selected.");
        return [];
    }
    
    const files: { name: string, kind: string }[] = [];
    
    try {
        const entries = await readDir(rootPath);
        for (const entry of entries) {
            if (entry.isFile) {
                if (entry.name == 'workspace.json') continue; // Skip workspace file
                if (entry.name.endsWith('.json')) {
                    files.push({ name: entry.name, kind: 'file' });
                }
            }
        }
    } catch (error) {
        console.error("Error reading directory:", error);
    }
    return files;
}

// --- File I/O Helpers ---

function joinPath(filename: string): string {
    if (!rootPath) throw new Error("No root path");
    const separator = navigator.userAgent.includes("Win") ? "\\" : "/";
    return `${rootPath}${separator}${filename}`;
}

export async function readFile(filename: string) {
    if (!rootPath) throw new Error('No folder selected');
    
    // Debug log to confirm path is correct
    // console.log(`[FS] Reading text file: ${joinPath(filename)}`);
    
    try {
        return await readTextFile(joinPath(filename));
    } catch (e) {
        // Re-throw so the store can handle the "Not Found" vs "Error" distinction
        throw e;
    }
}

// --- Note Management ---

// NEW: Import PDF directly from another location on disk
export async function importPdfFromPath(sourcePath: string) {
    if (!rootPath) throw new Error("No folder selected");
    
    // Extract filename from source path
    const fileName = sourcePath.split(/[/\\]/).pop() || "document.pdf";
    const destPath = joinPath(fileName);
    
    try {
        // Direct copy (Efficient)
        await copyFile(sourcePath, destPath);
    } catch (e) {
        console.error("Copy failed:", e);
        throw new Error(`Failed to copy PDF from ${sourcePath}`);
    }
    
    // Create initial JSON metadata
    const baseName = fileName.replace(/\.pdf$/i, '');
    const jsonName = `${baseName}.json`;
    
    const noteData = {
        version: 1,
        linkedPdf: fileName,
        updatedAt: new Date().toISOString(),
        pages: {} 
    };

    await writeTextFile(joinPath(jsonName), JSON.stringify(noteData, null, 2));
    
    // Update State
    addFileToFolder(jsonName, "All Notes");
    const currentList = getFolderList();
    await writeTextFile(joinPath('workspace.json'), JSON.stringify({ 
        version: 1, folders: currentList 
    }, null, 2));

    return jsonName; // Return the JSON filename so the app can load it
}

export async function saveWorkspaceFile(data: any) {
    if (!rootPath) return; // Silent return if no folder open
    
    try {
        await writeTextFile(joinPath('workspace.json'), JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("FS: Failed to save workspace.json", e);
        throw e;
    }
}

export async function saveNote(baseName: string, pdfData: ArrayBuffer | null, notes: Record<number, string>) {
    if (!rootPath) throw new Error("No folder selected");

    // 1. Save PDF (Only if strictly needed, e.g. modified in memory)
    // In the new flow, we prefer copying, but we keep this for legacy or generated PDFs
    if (pdfData) {
        const pdfName = `${baseName}.pdf`;
        const uint8Array = new Uint8Array(pdfData);
        await writeBinaryFile(joinPath(pdfName), uint8Array);
    }

    // 2. Save Notes JSON
    const jsonName = `${baseName}.json`;
    const noteData = {
        version: 1,
        linkedPdf: `${baseName}.pdf`,
        updatedAt: new Date().toISOString(),
        pages: notes 
    };

    await writeTextFile(joinPath(jsonName), JSON.stringify(noteData, null, 2));

    // 3. Update State if needed (idempotent)
    addFileToFolder(jsonName, "All Notes");
}

export async function loadNote(jsonFilename: string) {
    if (!rootPath) throw new Error("No folder selected");
    
    try {
        console.log("Loading project from:", jsonFilename);
        
        const jsonContent = await readTextFile(joinPath(jsonFilename));
        const data = JSON.parse(jsonContent);

        const pdfName = data.linkedPdf;
        const pdfBinary = await readBinaryFile(joinPath(pdfName));
        
        // Convert to ArrayBuffer for PDF.js
        const pdfArrayBuffer = pdfBinary.buffer.slice(pdfBinary.byteOffset, pdfBinary.byteOffset + pdfBinary.byteLength);

        return {
            notes: data.pages,
            pdfData: pdfArrayBuffer,
            fileName: pdfName
        };
    } catch (error) {
        console.error("Failed to load project:", error);
        throw error;
    }
}

export async function deleteFile(jsonFilename: string) {
    if (!rootPath) throw new Error("No folder selected");

    try {
        let pdfName: string | null = null;
        try {
            const jsonContent = await readTextFile(joinPath(jsonFilename));
            const data = JSON.parse(jsonContent);
            if (data.linkedPdf) pdfName = data.linkedPdf;
        } catch (e) { /* ignore read error */ }

        await remove(joinPath(jsonFilename));

        if (pdfName) {
            try { await remove(joinPath(pdfName)); } catch (e) {}
        }
    } catch (e) {
        console.error("Failed to delete project files:", e);
        throw e;
    }
}

export async function renameFile(oldName: string, newName: string) {
    if (!rootPath) throw new Error("No folder selected");
    if (oldName === newName) return;
    await rename(joinPath(oldName), joinPath(newName));
}

export async function refreshHandle() {
    return await openDirectory();
}
