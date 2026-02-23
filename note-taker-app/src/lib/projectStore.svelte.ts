// src/lib/projectStore.svelte.ts
import {listFiles, renameFile, deleteFile, saveWorkspaceFile, readFile } from '$lib/fileSystem';
import {readTextFile, writeTextFile} from '@tauri-apps/plugin-fs';
interface FileItem {
    name: string;
    kind: 'PDF Note' | 'Text Note';
}

interface FolderItem {
    id: string;
    name: string;
    files: FileItem[];
    expanded?: boolean; // Add expanded state here to persist it
}

function getKindFromFileName(name: string): FileItem['kind'] {
    return name.endsWith('.md') ? 'Text Note' : 'PDF Note';
}

function normalizeFileItem(raw: unknown): FileItem | null {
    if (typeof raw === 'string') {
        return {
            name: raw,
            kind: getKindFromFileName(raw)
        };
    }

    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<FileItem>;
    if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
        return null;
    }

    const inferredKind = getKindFromFileName(candidate.name);
    const normalizedKind = candidate.kind === 'PDF Note' || candidate.kind === 'Text Note'
        ? candidate.kind
        : inferredKind;

    return {
        name: candidate.name,
        kind: normalizedKind
    };
}

function normalizeFolderItem(raw: unknown, index: number): FolderItem | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<FolderItem> & { files?: unknown[] };
    if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
        return null;
    }

    const rawFiles = Array.isArray(candidate.files) ? candidate.files : [];
    const files = rawFiles.map(normalizeFileItem).filter((f): f is FileItem => f !== null);

    return {
        id: typeof candidate.id === 'string' && candidate.id.trim() !== ''
            ? candidate.id
            : `folder-${index}-${Math.random().toString(36).slice(2, 9)}`,
        name: candidate.name,
        files,
        expanded: candidate.expanded === true
    };
}

function normalizeFolderList(raw: unknown): FolderItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((folder, index) => normalizeFolderItem(folder, index))
        .filter((f): f is FolderItem => f !== null);
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
    folderList = normalizeFolderList(list);
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
        folder.files.push({ name: fileName, kind: getKindFromFileName(fileName) });
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
            const normalized = normalizeFolderList(data.folders);
            console.log("Workspace loaded:", normalized);
            folderList = normalized;
            saveStructure();
            if (folderList.length === 0) {
                await refreshFileList();
            }
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
            .filter(f => f.name.endsWith('.json') || f.name.endsWith('.md'))
            .map(f => ({ 
                name: f.name, 
                kind: getKindFromFileName(f.name)
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

export async function renameItem(folderId: string, oldName: string, newName: string): Promise<boolean> {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return false;

    const fileItem = folder.files.find(f => f.name === oldName);
    if (!fileItem) return false;

    // 1. Rename on disk first (source of truth)
    try {
        await renameFile(oldName, newName);
        
        // 2. Update State only if disk op succeeded
        fileItem.name = newName;
        fileItem.kind = getKindFromFileName(newName);
        saveStructure(); // Save workspace.json with new reference
        return true;
    } catch (e) {
        alert("Failed to rename file. Check console for details.");
        return false;
    }
}

export async function deleteNote(folderId: string, fileName: string) {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return;

    const message = fileName.endsWith('.json')
        ? `Are you sure you want to delete "${fileName}" and its PDF?`
        : `Are you sure you want to delete "${fileName}"?`;
    if (!confirm(message)) return;

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
