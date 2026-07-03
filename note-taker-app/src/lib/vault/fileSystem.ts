// src/lib/vault/fileSystem.ts

import { open, message } from '@tauri-apps/plugin-dialog';
import { readDir, mkdir, exists, rename, remove, writeTextFile} from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { db } from '$lib/db';

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
export async function createNoteFolder(parentPath: string): Promise<void> {
    const baseName: string = 'New Folder';
    
    // Check if folder with same path already exists, if it does, edit name to prevent name collision
    for (let i=0; ; i++) {
        const name = i === 0 ? baseName: `${baseName} ${i}`
        const fullPath = await join(parentPath, name)

        // If a directory with that name/path DOES NOT already exist, we can create it
        if (!(await exists(fullPath))) {
            await mkdir(fullPath);
            return;
        }
    }
}


// Function to rename an item
export async function renameItem(oldPath: string, newPath: string) {
    await rename(oldPath, newPath);
}

// Function to delete an item
export async function deleteItem(itemPath: string) {
    await remove(itemPath, {
        recursive: true, // Make sure all children are deleted if the item is a folder
    });
}

