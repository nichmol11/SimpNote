// src/lib/vault/fileSystem.ts

import { open, message } from '@tauri-apps/plugin-dialog';
import { readDir, mkdir, exists, rename, remove, writeTextFile, readTextFile, copyFile, readFile} from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { db } from '$lib/db';
import type { PdfNotes } from './types';

// Function to allow the user to select the folder for their note vault
export async function pickVaultDirectory(): Promise<string | null> {
    // Open directory picker, return the selected path or null if none is chosen
    const folder: string | null = await open({
        multiple: false,
        directory: true,
        recursive: true,
    })

    return folder;
}

// Function to return the stored vault path if it exists in the database
export async function getStoredVaultPath(): Promise<string | null> {
    const results = await db.directoryMeta.limit(1).toArray();
    const meta = results[0];
    if (!meta) return null;

    try {
        // Check the path is valid
        await readDir(meta.handle);
        return meta.handle;
    } catch { // Path no longer exists or is inaccessible
        // Inform the user
        await message(`Stored vault path is broken\nThe path: ${meta.handle}\nno longer exists or is inaccessible\nSet a new vault path`, { title: 'Vault not found', kind: 'warning'})
        // Clear the database
        await db.directoryMeta.clear();
        return null;
    }
}

// Helper functon to build the full path from a relative path
async function getFullPath(relativePath: string, vaultPath: string) {
    return await join(vaultPath, relativePath)
}

// Function to write the new vault path to the database
export async function storeVaultPath(path: string): Promise<void> {
    await db.directoryMeta.clear();
    await db.directoryMeta.add({
        handle: path,
        name: path.split(/[/\\]/).pop() || path
    })
}

// Function to initialise the .system folder when a new vault is created or restored
export async function initSystemFolder(vaultPath: string): Promise<void> {
    const systemPath = await join(vaultPath, '.system');
    const workspacePath = await join(systemPath, 'workspace.json');

    // Create .system folder if it doesn't already exist
    if (!(await exists(systemPath))) {
        await(mkdir(systemPath));
    }

    // Create workspace.json, checking that it doesn't already exist to prevent overwriting existing data
    if (!(await exists(workspacePath))) {
        await writeTextFile(workspacePath, JSON.stringify({ order: {}}, null, 2));
    }
}


// Function to create a new folder in the vault
export async function createNoteFolder(relativeParentPath: string, vaultPath: string): Promise<void> {
    const parentPath = await getFullPath(relativeParentPath, vaultPath);
    const baseName: string = 'New Folder';
    
    // Check if folder with same path already exists, if it does, edit name to prevent name collision
    for (let i=0; ; i++) {
        const name = i === 0 ? baseName: `${baseName} ${i}`;
        const fullPath = parentPath.endsWith('/') || parentPath.endsWith('\\') 
            ? `${parentPath}${name}` 
            : `${parentPath}/${name}`;

        // If a directory with that name/path DOES NOT already exist, we can create it
        if (!(await exists(fullPath))) {
            await mkdir(fullPath);
            return;
        }
    }
}

// Function to rename an item
export async function renameItem(oldRelativePath: string, newRelativePath: string, vaultPath: string) {
    const oldPath = await getFullPath(oldRelativePath, vaultPath);
    const newPath = await getFullPath(newRelativePath, vaultPath);
    await rename(oldPath, newPath);
}

// Function to delete an item
export async function deleteItem(relativeItemPath: string, vaultPath: string) {
    const itemPath = await getFullPath(relativeItemPath, vaultPath);
    await remove(itemPath, {
        recursive: true, // Make sure all children are deleted if the item is a folder
    });
}

// Function to read workspace.json into store state on vault load
export async function readWorkspace(vaultPath: string): Promise<any | null> {
    const workspacePath = await join(vaultPath, '.system', 'workspace.json');
    try {
        if (await exists(workspacePath)) {
            const contents = await readTextFile(workspacePath);
            return JSON.parse(contents);
        }
    } catch (error) {
        console.error("Failed to read workspace.json:", error);
    }
    return null;
}

// Function to persist order, lastOpened, pinned, and noteState after mutations
export async function writeWorkspace(vaultPath: string, data: any): Promise<void> {
    const workspacePath = await join(vaultPath, '.system', 'workspace.json');
    try {
        const contents = JSON.stringify(data, null, 2);
        await writeTextFile(workspacePath, contents);
    } catch (error) {
        console.error("Failed to write workspace.json:", error);
    }
}

// Function to create a new plain note
export async function createPlainNote(relativeParentPath: string, vaultPath: string): Promise<string> {
    const parentPath = await getFullPath(relativeParentPath, vaultPath);
    const baseName = 'New Note';

    // Prevent name collisons
    for (let i = 0; ; i++) {
        const name = i === 0 ? baseName : `${baseName} ${i}`;
        const fullPath = parentPath.endsWith('/') || parentPath.endsWith('\\')
            ? `${parentPath}${name}.md`
            : `${parentPath}/${name}.md`;

        if (!(await exists(fullPath))) {
            await writeTextFile(fullPath, ''); // create empty note
            // return the relative path so the store knows what was created
            return relativeParentPath ? `${relativeParentPath}/${name}.md` : `${name}.md`;
        }
    }
}

// Function to read plain note content from disk
export async function readPlainNote(relativePath: string, vaultPath: string): Promise<string | null> {
    const notePath = await getFullPath(relativePath, vaultPath);
    try {
        if (await exists(notePath)) {
            const contents = await readTextFile(notePath);
            return contents;
        }
    } catch (error) {
        console.error("Failed to read note:", error);
    }
    return null;
}

// Function to write plain note contents to disk (creates the file if it doesn't exist)
export async function writePlainNote(relativePath: string, vaultPath: string, noteContents: string): Promise<void> {
    const notePath = await getFullPath(relativePath, vaultPath);
    await writeTextFile(notePath, noteContents); // let errors propagate to the caller
}

// Function to create a new PDF note
export async function createPDFNote(relativeParentPath: string, vaultPath: string, sourcePDFPath: string): Promise<string> {
    const parentPath = await getFullPath(relativeParentPath, vaultPath);
    const baseName = 'New Note';
    
    // Prevent name collisons
    for (let i = 0; ; i++) {
        const name = i === 0 ? baseName : `${baseName} ${i}`;
        const fullPath = parentPath.endsWith('/') || parentPath.endsWith('\\')
            ? `${parentPath}${name}`
            : `${parentPath}/${name}`;

        if (!(await exists(fullPath))) {
            await mkdir(fullPath); // create note bundle folder
            const newPDFPath = fullPath + "/source.pdf";
            await copyFile(sourcePDFPath, newPDFPath); // Copy the source PDF
            const noteFullPath = fullPath + "/notes.json";
            await writeTextFile(noteFullPath, '{}')
            // return the relative path so the store knows what was created
            return relativeParentPath ? `${relativeParentPath}/${name}` : `${name}`;
        } // let errors prropogate to caller
    }
}

// Function to read PDF note data (notes.json) from disk
export async function readPDFNote(relativePath: string, vaultPath: string): Promise<{ pdfData: ArrayBuffer; notes: PdfNotes } | null> {
    const noteDirectory = await getFullPath(relativePath, vaultPath);
    
    // Adjust these filenames if your createPDFNote function uses a different convention
    const jsonPath = `${noteDirectory}/notes.json`; 
    const pdfPath = `${noteDirectory}/source.pdf`;

    try {
        if (await exists(jsonPath) && await exists(pdfPath)) {
            const jsonContents = await readTextFile(jsonPath);
            const notes: PdfNotes = JSON.parse(jsonContents);

            const rawBinary = await readFile(pdfPath);
            
            return {
                pdfData: rawBinary.buffer,
                notes: notes
            };
        }
    } catch (error) {
        console.error("Failed to read packed PDF note bundle structures:", error);
    }
    return null;
}

// Function to write PDF note data (notes.json) to disk (creates the file if it doesn't exist)
export async function writePDFNote(relativePath: string, vaultPath: string, noteData: any): Promise<void> {
    const noteDirectory = await getFullPath(relativePath, vaultPath);
    // Append the notes.json file target explicitly inside the bundle container
    const targetFilePath = `${noteDirectory}/notes.json`;
    
    const noteContents = JSON.stringify(noteData, null, 2);
    await writeTextFile(targetFilePath, noteContents); 
}

// Function to allow the user to select a PDF file to import
export async function pickPdfFile(): Promise<string | null> {
    const file: string | null = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    return file;
}