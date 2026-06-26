// src/lib/vault/store.svelte.ts

// V2 code
// src/lib/vault/store.svelte.ts
import { invoke } from '@tauri-apps/api/core';
import type { TreeNode } from './types';

// Define the tree (in-memory representation of the vault folder/file structure)
let tree = $state<TreeNode | null>(null);

// Function to return the tree
export function getTree() {
    return tree;
}

// Function to build the tree from vault folder
export async function loadVaultTree(vaultPath: string) {
    tree = await invoke<TreeNode | null>('build_tree_command', { vaultPath });
}
