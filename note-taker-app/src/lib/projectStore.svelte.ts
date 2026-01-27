// src/lib/projectStore.svelte.ts
import {listFiles, renameFile, deleteFile, saveWorkspaceFile, readFile } from '$lib/fileSystem';
import {readTextFile, writeTextFile} from '@tauri-apps/plugin-fs';
interface FileItem {
    name: string;
    kind: 'file' | 'project';
}

interface FolderItem {
    id: string;
    name: string;
    files: FileItem[];
    expanded?: boolean; // Add expanded state here to persist it
}

// 1. Define the Global State
let folderList = $state<FolderItem[]>([]); 
let rootFolderName = $state<string>("");

// 2. Export Getters (derived state)
export function getFolderList() {
    return folderList;
}

export function getRootName() {
    return rootFolderName;
}

// 3. Export Actions (State Modifiers)

export function setRootName(name: string) {
    rootFolderName = name;
}

export function setFolderList(list: FolderItem[]) {
    folderList = list;
    saveStructure(); // Auto-save whenever list is set manually
}

export function addFileToFolder(fileName: string, folderName: string = "All Notes") {
    // Find folder, or create if missing
    let folder = folderList.find(f => f.name === folderName);
    
    if (!folder) {
        folder = {
            id: Math.random().toString(36).substr(2, 9),
            name: folderName,
            files: []
        };
        folderList.push(folder);
    }
    
    // Avoid duplicates
    if (!folder.files.find(f => f.name === fileName)) {
        folder.files.push({ name: fileName, kind: 'project' });
    }
    
    saveStructure();
}

// 4. Persistence Logic (Moved from Sidebar)

export async function loadWorkspace() {
    if (!rootFolderName) return;

    try {
        // This relies on rootPath being set in fileSystem.ts
        const content = await readFile('workspace.json'); 
        const data = JSON.parse(content);
        if (data.folders) {
            console.log("Workspace loaded:", data.folders);
            folderList = data.folders;
        }
    } catch (e) {
        console.log("No workspace.json or load failed. Creating default.");
        await refreshFileList();
    }
}

export async function refreshFileList() {
    const files = await listFiles();
    folderList = [{
        id: 'root',
        name: 'All Notes',
        files: files
            .filter(f => f.name.endsWith('.json') || f.name.endsWith('.pdf'))
            .map(f => ({ 
                name: f.name, 
                kind: f.name.endsWith('.json') ? 'project' : 'file' 
            })),
        expanded: true
    }];
    
    await saveStructure();
}

async function saveStructure() {
    // We don't need to check rootFolderName here if fileSystem handles the path
    // But keeping a check is fine.

    const structure = {
        version: 1,
        updatedAt: new Date().toISOString(),
        folders: folderList
    };

    try {
        // Use the new helper that knows the absolute path!
        await saveWorkspaceFile(structure);
        console.log("Workspace structure saved.");
    } catch (e) {
        console.error("Failed to save workspace structure:", e);
    }
}

export async function renameItem(folderId: string, oldName: string, newName: string) {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return;

    const fileItem = folder.files.find(f => f.name === oldName);
    if (!fileItem) return;

    // 1. Rename on disk first (source of truth)
    try {
        await renameFile(oldName, newName);
        
        // 2. Update State only if disk op succeeded
        fileItem.name = newName;
        saveStructure(); // Save workspace.json with new reference
    } catch (e) {
        alert("Failed to rename file. Check console for details.");
        // Revert UI if needed (by reloading list) or let the UI stay stale
    }
}

export async function deleteNote(folderId: string, fileName: string) {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return;

    if (!confirm(`Are you sure you want to delete "${fileName}" and its PDF?`)) return;

    try {
        // 1. Delete from Disk
        await deleteFile(fileName);

        // 2. Update State
        folder.files = folder.files.filter(f => f.name !== fileName);
        
        // 3. Persist Structure
        saveStructure();
    } catch (e) {
        alert("Failed to delete file from disk.");
        console.error(e);
    }
}