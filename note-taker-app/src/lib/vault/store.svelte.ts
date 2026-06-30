
// src/lib/vault/store.svelte.ts
import { invoke } from '@tauri-apps/api/core';
import type { TreeNode } from './types';
import { pickVaultDirectory, getStoredVaultPath, storeVaultPath } from '$lib/vault/fileSystem';

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
export function addNewFolder(parentFolder: string) {
    console.log("adding new folder within " + parentFolder);
}

// Function to rename a node
export function renameNode(nodePath: string, newName: string) {
    // DEBUG
    console.log("Renaming node at path: " + nodePath + "\n\t to: " + newName)
}


// Function to delete a node from the tree
export function deleteNode(nodePath: string) {}