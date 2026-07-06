// src/lib/vault/store.svelte.ts

import { invoke } from '@tauri-apps/api/core';
import type { NodeKind, TreeNode, NoteState, Workspace } from './types';
import { 
    pickVaultDirectory, 
    getStoredVaultPath, 
    storeVaultPath,
    initSystemFolder, 
    createNoteFolder, 
    renameItem, 
    deleteItem,
    readWorkspace,
    writeWorkspace, 
} from '$lib/vault/fileSystem';
import { validateNodeName } from '$lib/vault/validation';

// Define state variables
let tree = $state<TreeNode | null>(null); // In-memory representation of the vault folder/file structure
let order = $state<Record<string, string[]>>({}); // Note order variable - keyed by vault-relative folder path
let lastOpened = $state<string | null>(null); // Variable to keep track of the most recently opened note's (vault-relative) path
let pinned = $state<string[]>([]); // Variable to hold the paths of the notes pinned by the user
let noteState = $state<Record<string, NoteState>>({}); // Variable to track where the user has scrolled to on each note - keyed by vault-relative path
let isRestoring = $state(true); // Variable to check if vault needs to be restored on startup
let vaultPath = $state<string | null>(null); // Variable to keep track of the current vault path
let selectedFolderPath = $state<string | null>(null); // Variable to keep track of the selected folder
let expandedFolders = $state(new Set<string>()); // Variable to keep track of which folders are expanded in the viewer

// Getter functions for state variables
export function getTree() { return tree; }
export function getOrder() { return order; }
export function getLastOpened() { return lastOpened; }
export function getPinned() { return pinned; }
export function getNoteState() { return noteState; }
export function getIsRestoring() { return isRestoring; }
export function getVaultPath() { return vaultPath; }
export function getSelectedFolderPath() { return selectedFolderPath; }

// Function to build the tree from vault folder
export async function loadVaultTree(path: string) {
    // console.log("loadVaultTree called with path: " + path); // DEBUG
    tree = await invoke<TreeNode | null>('build_tree_command', { vaultPath: path });
}

// Function to pick the vault folder
export async function openVault() {
    try {
        const path = await pickVaultDirectory();
        if (!path) return; // If user cancelled, return
        await storeVaultPath(path);
        await initSystemFolder(path);
        await loadVaultTree(path);
        await loadWorkspaceData(path);
        vaultPath = path;
    } catch (e) {
        console.error('Failed to open vault:', e);
        throw e;
    }

}

// Function to restore the vault from disk
export async function restoreVault() {
    isRestoring = true;
    try {
        const path = await getStoredVaultPath();
        if (path) {
            await initSystemFolder(path);
            await loadVaultTree(path);
            await loadWorkspaceData(path);
            vaultPath = path;
        }
    } catch (e) {
        console.error('Failed to restore vault:', e);
    } finally {
        isRestoring = false;
    }
}

// Function to load workspace data from workspace.json (if it exists)
async function loadWorkspaceData(path: string) {
    try {
        const data = await readWorkspace(path);
        if (data) { // If data is stored in workspace.json load it into the state variables
            order = data.order ?? {};
            lastOpened = data.lastOpened ?? null;
            pinned = data.pinned ?? [];
            noteState = data.noteState ?? {};
        }
    } catch(e) {
        console.error('Failed to load vault: ', e);
    }
}

// Function to save workspace data to workspace.json
async function saveWorkspaceData() {
    if (!vaultPath) return; // return early if not vault path exists

    const workspaceData: Workspace = {
        order: $state.snapshot(order),
        lastOpened, // $state.snapshot() not required for primitive types
        pinned: $state.snapshot(pinned),
        noteState: $state.snapshot(noteState)
    };

    await writeWorkspace(vaultPath, workspaceData); // write the data to workspace.json
}

// Function to update workspace data when mutations occur
export function updatePathReferences(oldPath: string, newPath: string | null): void {
    // If new Path is null, purge all of its entries
    if (!newPath) {

    } else { // otherwise, update references

    }
}

// Function to check if a folder is expanded
export function isExpanded(path: string) {
    return expandedFolders.has(path);
}

// Function to toggle exansion state
export function toggleExpanded(path: string) {
    if (expandedFolders.has(path)) {
        expandedFolders.delete(path);
    } else {
        expandedFolders.add(path);
    }

    expandedFolders = new Set(expandedFolders);
}

// Function to expand a folder
export function expandFolder(path: string) {
    expandedFolders.add(path);
    expandedFolders = new Set(expandedFolders);
}

// Function to set the currently selected folder
export function selectFolder(path: string | null) {
    selectedFolderPath = path;
    // DEBUG
    console.log("Selected folder: " + selectedFolderPath);
}

// Function to add a new note folder to the tree
export async function addNewFolder() {

    // Check if vault is open
    if (!vaultPath) {
        throw new Error("No vault is open");
    }
    
    // If no folder is selected, default to the vault root
    const parentPath = selectedFolderPath ?? ""; // Empty defaults to root since path is relative

    // Expand the parent folder automatically
    expandFolder(parentPath);

    // Create a new folder within
    await createNoteFolder(parentPath, vaultPath);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree
    await loadVaultTree(vaultPath);
}

// Function to rename a node
export async function renameNode(nodePath: string, newName: string, kind: NodeKind) {
    
    // Check if vault is open
    if (!vaultPath) throw new Error("No vault is open");
    
    // Check if new name is valid
    const validationError = validateNodeName(newName);
    if (validationError) throw new Error(validationError);

    // If the name is unchanged, return early
    const currentName = nodePath.split('/').at(-1) ?? '';
    const currentBaseName = currentName.replace(/\.md$/, '');
    if (newName.trim() === currentBaseName) return;

    // Derive the new path
    const parentPath = nodePath.split('/').slice(0, -1).join('/');
    const newPath = parentPath 
        ? `${parentPath}/${newName}${kind === 'plainNote' ? '.md' : ''}`
        : `${newName}${kind === 'plainNote' ? '.md' : ''}`;
    // Rename the item
    await renameItem(nodePath, newPath, vaultPath); // renameItem() on fileSystem.ts calls Tauri's rename() function

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);

}

// Function to delete a node from the tree
export async function deleteNode(nodePath: string) {
    // Check if vault is open
    if (!vaultPath) throw new Error("No vault is open");

    // Call the filesystem function to delete the item
    await deleteItem(nodePath, vaultPath);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);
}