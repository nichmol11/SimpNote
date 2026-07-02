// src/lib/vault/store.svelte.ts

import { invoke } from '@tauri-apps/api/core';
import type { NodeKind, TreeNode } from './types';
import { pickVaultDirectory, getStoredVaultPath, storeVaultPath, createFolder, renameItem } from '$lib/vault/fileSystem';
import { validateNodeName } from '$lib/vault/validation.ts';

// Define the tree (in-memory representation of the vault folder/file structure)
let tree = $state<TreeNode | null>(null);

// Variable to check if vault needs to be restored on startup
let isRestoring: boolean = $state(true);

// Function to return the tree
export function getTree() {
    return tree;
}

// Current vault path
let vaultPath = $state<string | null>(null);


// Function to return the current vault path
export function getVaultPath() {
    return vaultPath;
}

// Function to build the tree from vault folder
export async function loadVaultTree(vaultPath: string) {
    tree = await invoke<TreeNode | null>('build_tree_command', { vaultPath });
}

// Function to pick the vault folder
export async function openVault() {
    const path = await pickVaultDirectory();
    // If user cancelled, return
    if (!path) return;
    await storeVaultPath(path);
    await loadVaultTree(path);
    vaultPath = path;
}

// Function to restore the vault from disk
export async function restoreVault() {
    isRestoring = true;
    const path = await getStoredVaultPath();
    if (path) {
        await loadVaultTree(path);
        vaultPath = path;
    }
    isRestoring = false;
}

// Function to check if vault is being restored
export function getIsRestoring() {
    return isRestoring;
}

// Variable to keep track of which folders are expanded in the viewer
let expandedFolders = $state(new Set<string>());

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

// Define selected folder variable
let selectedFolderPath = $state<string | null>(null);

// Function to return the currently selected folder path
export function getSelectedFolderPath() {
    return selectedFolderPath;
}

// Function to set the currently selected folder
export function selectFolder(path: string | null) {
    selectedFolderPath = path;
    // DEBUG
    console.log("Selected folder: " + selectedFolderPath);
}

// Function to add a new folder to the tree
export async function addNewFolder() {

    // Check if vault is open
    if (!vaultPath) {
        throw new Error("No vault is open");
    }
    
    // If no folder is selected, default to the vault root
    const parentPath = selectedFolderPath ?? vaultPath;

    // Expand the parent folder automatically
    expandFolder(parentPath);

    // Create a new folder within
    await createFolder(parentPath);

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
    const newPath = parentPath + '/' + newName + (kind === 'plainNote' ? '.md' : '');
    
    // Rename the item
    await renameItem(nodePath, newPath); // renameItem() on fileSystem.ts calls Tauri's rename() function

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);

}


// Function to delete a node from the tree
export async function deleteNode(nodePath: string) {}