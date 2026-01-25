import { db } from '$lib/db';
import { addFileToFolder, getFolderList } from '$lib/projectStore.svelte';
import { readTextFile, writeTextFile, writeFile as writeBinaryFile, readFile as readBinaryFile, readDir, remove, rename } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';

// In Tauri, we just store the absolute path string, not a "handle"
let rootPath: string | null = null;

// --- Folder Management ---

export async function openDirectory() {
    try {
        // Open native dialog to pick a folder
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Select Notes Folder"
        });

        if (selected === null) {
            return null; // User cancelled
        }

        // 'selected' is a string path (e.g., "C:\Users\Name\Documents\Notes")
        rootPath = selected as string;
        
        // Save path to IndexedDB for persistence
        await db.directoryMeta.clear(); 
        // We use the same schema, but 'handle' will just store the string path now
        // (You might need to update your db.ts interface if strictly typed to FileSystemHandle, 
        // but JS/IndexedDB is flexible enough to store the string)
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
    const results = await db.directoryMeta.limit(1).toArray();
    const meta = results[0];
  
    if (!meta) return null;

    // Restore the path string
    rootPath = meta.handle as unknown as string;
    
    // In Tauri, we don't need to re-verify permissions like the web API.
    // As long as the path exists, we can access it.
    
    return { name: rootPath.split(/[/\\]/).pop() || rootPath };
}

export async function listFiles() {
    if (!rootPath) {
        console.warn("listFiles called but no root path selected.");
        return [];
    }
    
    const files: { name: string, kind: string }[] = [];
    
    try {
        // Read directory contents using Tauri API
        const entries = await readDir(rootPath);
        
        for (const entry of entries) {
            if (entry.isFile) {
                 if (entry.name.endsWith('.md') || 
                     entry.name.endsWith('.txt') || 
                     entry.name.endsWith('.pdf') || 
                     entry.name.endsWith('.json')) {
                    files.push({ name: entry.name, kind: 'file' });
                 }
            }
        }
    } catch (error) {
        console.error("Error reading directory:", error);
    }
    
    return files;
}

// --- File I/O ---

// Helper to construct full path
function joinPath(filename: string): string {
    if (!rootPath) throw new Error("No root path");
    // Handle both Windows (\) and Unix (/) separators
    const separator = navigator.userAgent.includes("Win") ? "\\" : "/";
    return `${rootPath}${separator}${filename}`;
}

export async function writeFile(filename: string, content: string) {
    if (!rootPath) throw new Error('No folder selected');
    await writeTextFile(joinPath(filename), content);
}

export async function readFile(filename: string) {
    if (!rootPath) throw new Error('No folder selected');
    return await readTextFile(joinPath(filename));
}

// --- Project Management (PDF + JSON) ---

export async function saveProject(baseName: string, pdfData: ArrayBuffer | null, notes: Record<number, string>) {
    if (!rootPath) throw new Error("No folder selected");

    // 1. Save PDF (Binary)
    if (pdfData) {
        const pdfName = `${baseName}.pdf`;
        // Convert ArrayBuffer to Uint8Array for Tauri
        const uint8Array = new Uint8Array(pdfData);
        await writeBinaryFile(joinPath(pdfName), uint8Array);
    }

    // 2. Save Notes JSON (Text)
    const jsonName = `${baseName}.json`;
    const noteData = {
        version: 1,
        linkedPdf: `${baseName}.pdf`,
        updatedAt: new Date().toISOString(),
        pages: notes 
    };

    await writeTextFile(joinPath(jsonName), JSON.stringify(noteData, null, 2));

    // 3. Update State
    addFileToFolder(jsonName, "All Notes");

    // Save workspace structure
    const currentList = getFolderList();
    await writeTextFile(joinPath('workspace.json'), JSON.stringify({ 
        version: 1, 
        folders: currentList 
    }, null, 2));
}

export async function loadProject(jsonFilename: string) {
    if (!rootPath) throw new Error("No folder selected");
    
    try {
        console.log("Loading project from:", jsonFilename);
        
        // 1. Load JSON
        const jsonContent = await readTextFile(joinPath(jsonFilename));
        const data = JSON.parse(jsonContent);

        // 2. Load linked PDF
        const pdfName = data.linkedPdf;
        const pdfBinary = await readBinaryFile(joinPath(pdfName));
        
        // Convert Uint8Array back to ArrayBuffer for PDF.js
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

export async function renameFile(oldName: string, newName: string) {
    if (!rootPath) throw new Error("No folder selected");
    if (oldName === newName) return;

    try {
        await rename(joinPath(oldName), joinPath(newName));
    } catch (e) {
        console.error("Rename failed:", e);
        throw new Error(`Could not rename file from ${oldName} to ${newName}`);
    }
}

export async function refreshHandle() {
    // In Tauri, "refresh handle" just means asking the user to pick again
    return await openDirectory();
}
