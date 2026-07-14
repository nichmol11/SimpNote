// src/lib/vault/backend/store.svelte.ts

import { invoke } from '@tauri-apps/api/core';
import type { NodeKind, TreeNode, NoteState, Workspace, PdfNotes } from './types';
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
    createPlainNote,
    readPlainNote,
    writePlainNote,
    createPDFNote,
    readPDFNote,
    writePDFNote,
    pickPdfFile,

} from '$lib/vault/backend/fileSystem';
import { getBaseName } from './pathUtils';
import { validateNodeName } from '$lib/vault/backend/validation';

// Define state variables
let tree = $state<TreeNode | null>(null); // In-memory representation of the vault folder/file structure
let order = $state<Record<string, string[]>>({}); // Note order variable - keyed by vault-relative folder path
let lastOpened = $state<string | null>(null); // Variable to keep track of the most recently opened note's (vault-relative) path
let pinned = $state<string[]>([]); // Variable to hold the paths of the notes pinned by the user
let noteState = $state<Record<string, NoteState>>({}); // Variable to track where the user has scrolled to on each note - keyed by vault-relative path
let isRestoring = $state(true); // Variable to check if vault needs to be restored on startup
let isSidebarOpen: boolean = $state(true); // Variable to track if sidebar is open
let vaultPath = $state<string | null>(null); // Variable to keep track of the current vault path
let selectedFolderPath = $state<string | null>(null); // Variable to keep track of the selected folder
let expandedFolders = $state(new Set<string>()); // Variable to keep track of which folders are expanded in the viewer
let currentNotePath = $state<string | null>(null); // variable to hold the path of the current open note
let currentNoteContent = $state<string | PdfNotes | null>(null); // variable to hold note content - string for plain, record for PDF
let currentNoteKind = $state<NodeKind | null>(null); // variable to hold the current note kind
let currentPdfBinary = $state<ArrayBuffer | null>(null); // variable to hold current PDF data as binary array buffer when a PDF note is open

// Getter functions for state variables
export function getTree() { return tree; }
export function getOrder() { return order; }
export function getLastOpened() { return lastOpened; }
export function getPinned() { return pinned; }
export function getNoteState() { return noteState; }
export function getIsRestoring() { return isRestoring; }
export function getIsSidearOpen() { return isSidebarOpen; }
export function getVaultPath() { return vaultPath; }
export function getSelectedFolderPath() { return selectedFolderPath; }
export function getCurrentNotePath() { return currentNotePath; }
export function getCurrentNoteContent() { return currentNoteContent; }
export function getCurrentNoteKind() { return currentNoteKind; }
export function getCurrentPdfBinary() { return currentPdfBinary; }

// Function to build the tree from vault folder
export async function loadVaultTree(path: string) {
    // console.log("loadVaultTree called with path: " + path); // DEBUG
    tree = await invoke<TreeNode | null>('build_tree_command', { vaultPath: path });
}

// Function to toggle the sidebar
export function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
}

// Function to update the current note content
export function updateCurrentNoteContent(newContent: string | PdfNotes) {
    currentNoteContent = newContent;
}

// Function to return a given node in the tree based on a bath
function findNodeByPath(currNode: TreeNode | null, path: string): TreeNode | null {
    if (!currNode) return null; // If the path doesn't exist, return null
    if(currNode.path == path) return currNode; // If the node is the required node, return it
    if(currNode.children) {
        for (const childNode of currNode.children) {
            const result = findNodeByPath(childNode, path);
            if (result) return result; // If the node is found, return immediatly
        }
    }
    return null; // Resturn null if found nowhere in the tree
}

// Function to return the paths of all descendant nodes of a given node
function collectDescendantPaths(parentNode: TreeNode): string[] {
    let descendantPaths: string[] = new Array;
    if (!parentNode.children) return descendantPaths; // no children
    
    for (const childNode of parentNode.children) {
        descendantPaths.push(childNode.path); // add child path
        descendantPaths.push(...collectDescendantPaths(childNode)) // recurse to check descendants
    }

    return descendantPaths;
}

// Function to build a list of changes to be made to the workspace after each mutation
function buildPathChanges(changedNode: TreeNode, oldPath: string, newPath: string | null): Array<[oldPath: string, newPath: string | null]> {
    let pathChanges: Array<[oldPath: string, newPath: string | null]> = new Array;
    pathChanges.push([oldPath, newPath]); // Push the changed node itself
    
    // Grab child paths if they exist
    const oldChildPaths = collectDescendantPaths(changedNode);

    // Compute path changes for children if required
    for (let path of oldChildPaths) {
        const oldChildPath = path;
        if (!newPath) { // Delete all child nodes as parent folder has been deleted
            pathChanges.push([oldChildPath, null]); // new path is null i.e. delete this node from workspace
        } else {
            let relPath = oldChildPath.slice(oldPath.length);
            const newChildPath = newPath + relPath;
            pathChanges.push([oldChildPath, newChildPath]);
        }
    }
    return pathChanges;
}

// Function to update workspace path references during mutations
function updatePathReferences(changes: Array<[oldPath: string, newPath: string | null]>): void {
    for (const [oldPath, newPath] of changes) {
        // Update order
        if (oldPath in order) {
            const value = order[oldPath];
            delete order[oldPath];
            if (newPath) {
                order[newPath] = value;
            }
        }

        // Update lastOpened
        if (lastOpened === oldPath) {
            lastOpened = newPath;
        }
        // Update pinned
        for (let i=0; i<pinned.length; i++) {
            const currPath = pinned[i];
            if (currPath === oldPath) {
                if (newPath) { // Update path to new path
                    pinned[i] = newPath;
                } else { // Remove entry if null
                    pinned.splice(i, 1);
                }
            }
        }

        // Update noteState
        if(oldPath in noteState) {
            const value = noteState[oldPath];
            delete noteState[oldPath];
            if (newPath) {
                noteState[newPath] = value;
            }
        }
    }
}

// Function to update a node's parent's references in the order variable (workspace)
function updateParentReferences(oldParentPath: string, oldName: string, newParentPath: string | null, newName: string | null): void {
    // Remove reference from the old parent
    if (oldParentPath in order) {
        const index = order[oldParentPath].indexOf(oldName);
        if (index !== -1) order[oldParentPath].splice(index, 1);
    }
    // If this is not a deletion (i.e. move or rename), add the node to its new parent, or add the updated node back
    if (newParentPath && newName && newParentPath in order) {
        order[newParentPath].push(newName); // If new parent has no order entry, it was previously empty - default to alphabetical order
    }
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

// Function to check if a note is pinned by its path
export function isPinned(path: string) {
    return pinned.includes(path);
}

// Function to add a note to pinned
export async function addToPinned(path: string) {
    if (!isPinned(path)) {
        pinned.push(path);
        await saveWorkspaceData(); 
    } else {
        throw new Error ("Path is already in pinned");
    }
}

// Function to remove a note from pinned
export async function removeFromPinned(path: string) {
    const idx = pinned.indexOf(path);
    if (idx > -1) {
        pinned.splice(idx, 1);
        await saveWorkspaceData();
    } else {
        throw new Error ("Path is not in pinned")
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
    const currentBaseName = getBaseName(nodePath);
    if (newName.trim() === currentBaseName) return;

    // Derive the new path
    const parentPath = nodePath.split('/').slice(0, -1).join('/');
    const newPath = parentPath 
        ? `${parentPath}/${newName}${kind === 'plainNote' ? '.md' : ''}`
        : `${newName}${kind === 'plainNote' ? '.md' : ''}`;

    // Find the node to be renamed in the current tree
    const node = findNodeByPath(tree, nodePath);

    //Build the path changes
    if (!node) throw new Error("Node not found in tree");
    const pathChanges = buildPathChanges(node, nodePath, newPath)

    // Rename the item
    await renameItem(nodePath, newPath, vaultPath); // renameItem() on fileSystem.ts calls Tauri's rename() function

    // Update thew workspace variables
    updatePathReferences(pathChanges);
    updateParentReferences(parentPath, currentBaseName, parentPath, newName.trim());

    // Save updates to workspace.json
    await saveWorkspaceData();

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);

    // Update current note path if applicable
    if (currentNotePath == nodePath) {
        currentNotePath = newPath;
    }

}

// Function to move a node to a new parent folder
export async function moveNode(nodePath: string, newParentPath: string, kind: NodeKind) {
    // Check if vault is open
    if (!vaultPath) throw new Error("No vault is open");
    
    // If the path is unchanged, return early
    const oldParentPath = nodePath.split('/').slice(0, -1).join('/');
    if (oldParentPath == newParentPath) return;

    // Derive the new path
    const nodeBaseName = getBaseName(nodePath);
    const newPath = newParentPath
        ? `${newParentPath}/${nodeBaseName}${kind === 'plainNote' ? '.md' : ''}`
        : `${nodeBaseName}${kind === 'plainNote' ? '.md' : ''}`;

    // Find the node to be renamed in the current tree
    const node = findNodeByPath(tree, nodePath);

    //Build the path changes
    if (!node) throw new Error("Node not found in tree");
    const pathChanges = buildPathChanges(node, nodePath, newPath)

    // Rename the item
    await renameItem(nodePath, newPath, vaultPath); // rename() handles both moving and renaming files

    // Update the workspace variables
    updatePathReferences(pathChanges);
    updateParentReferences(oldParentPath, nodeBaseName, newParentPath, nodeBaseName);

    // Save updates to workspace.json
    await saveWorkspaceData();

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);

    // Update current note path if applicable
    if (currentNotePath == nodePath) {
        currentNotePath = newPath;
    }
}

// Function to delete a node from the tree
export async function deleteNode(nodePath: string) {
    // Check if vault is open
    if (!vaultPath) throw new Error("No vault is open");

    // Find the node to be deleted in the current tree
    const node = findNodeByPath(tree, nodePath);
    const nodeName = getBaseName(nodePath)// Grab the node's name

    // Build the path changes
    if (!node) throw new Error("Node not found in tree");
    const pathChanges = buildPathChanges(node, nodePath, null);
    
    // Call the filesystem function to delete the item
    await deleteItem(nodePath, vaultPath);

    // Update the workspace variables
    const parentPath = nodePath.split('/').slice(0, -1).join('/');
    updatePathReferences(pathChanges);
    updateParentReferences(parentPath, nodeName, null, null);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree to reflect the change
    await loadVaultTree(vaultPath);

    // Update current note path if applicable
    if (currentNotePath == nodePath) {
        currentNotePath = null;
    }
}

// Functuion that returns the effective order of children names for a folder: checking saved order in workspace or falling back to alphabetical order no saved order exists
export function getEffectiveOrder(parentPath: string, allNames: string[]): string[] {
    // Get the order list
    const orderList = order[parentPath];
    if (!orderList) return [...allNames].sort((a, b) => a.localeCompare(b)); // alphabetical fallback

    const remaining = new Set(allNames);
    const ordered: string[] = [];
    for (const name of orderList) {
        if (remaining.has(name)) {
            ordered.push(name);
            remaining.delete(name);
        }
    }
    ordered.push(...[...remaining].sort((a, b) => a.localeCompare(b)));
    return ordered;
}

// Function to reorder nodes in a folder by moving a node to a new order index
export async function reorderNode(parentPath: string, allNames: string[], nodeName: string, targetIndex: number): Promise<void> {
    let currOrder = getEffectiveOrder(parentPath, allNames);
    
    const idx = currOrder.indexOf(nodeName);
    if (idx !== -1) {
        currOrder.splice(idx, 1); // remove from old position
    }
    currOrder.splice(targetIndex, 0, nodeName); // insert at new position

    order[parentPath] = currOrder; // write back to state
    await saveWorkspaceData(); // save to workspace.json
}

// Function to create a new  plain note
export async function addPlainNote() {
        // Check if vault is open
    if (!vaultPath) {
        throw new Error("No vault is open");
    }
    
    // If no folder is selected, default to the vault root
    const parentPath = selectedFolderPath ?? ""; // Empty defaults to root since path is relative

    // Expand the parent folder automatically
    expandFolder(parentPath);

    // Create a new folder within
    const newNotePath = await createPlainNote(parentPath, vaultPath);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree
    await loadVaultTree(vaultPath);

    // Automatically open the note
    await openPlainNote(newNotePath);
}

// Function to create a new  PDF note
export async function addPDFNote() {
    // Check if vault is open
    if (!vaultPath) {
        throw new Error("No vault is open");
    }
    
    // Get source PDF path
    const sourcePDF = await pickPdfFile();
    if (!sourcePDF) {
        console.log("No PDF selected");
        return;
    }
    // If no folder is selected, default to the vault root
    const parentPath = selectedFolderPath ?? ""; // Empty defaults to root since path is relative

    // Expand the parent folder automatically
    expandFolder(parentPath);

    // Create a new folder within
    const newNotePath = await createPDFNote(parentPath, vaultPath, sourcePDF);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree
    await loadVaultTree(vaultPath);

    // Automatically open the note
    await openPDFNote(newNotePath);
}

// Function to create a new  PDF note
export async function addDragedPDFNote(sourcePath: string) {
    // Check if vault is open
    if (!vaultPath) {
        throw new Error("No vault is open");
    }
    
    // If no folder is selected, default to the vault root
    const parentPath = selectedFolderPath ?? ""; // Empty defaults to root since path is relative

    // Expand the parent folder automatically
    expandFolder(parentPath);

    // Create a new folder within
    const newNotePath = await createPDFNote(parentPath, vaultPath, sourcePath);

    // Update workspace.json
    await saveWorkspaceData();

    // Rebuild the tree
    await loadVaultTree(vaultPath);

    // Automatically open the note
    await openPDFNote(newNotePath);
}

// Function to open a note, dispatching to the correct handler based on kind
export async function openNote(path: string, kind: NodeKind): Promise<void> {
    if (kind === 'plainNote') {
        await openPlainNote(path);
    } else if (kind === 'pdfNote') {
        await openPDFNote(path);
    }
}

// Function to open a plain note
export async function openPlainNote(path: string): Promise<void> {
    if (!vaultPath) { // Check if vault is open
        throw new Error("No vault is open");
    }

    let content = await readPlainNote(path, vaultPath);

    // Update current note state variables
    currentNotePath = path;
    currentNoteContent = content ?? '';
    currentNoteKind = 'plainNote';

    // Update workspace
    lastOpened = path;
    saveWorkspaceData();

}

export async function savePlainNote(path: string, content: string) {
    if (!vaultPath) { // Check if vault is open
        throw new Error("No vault is open");
    }

    await writePlainNote(path, vaultPath, content);

    saveWorkspaceData() // for when persisting current position is added
}

// Function to open a PDF note
export async function openPDFNote(path: string): Promise<void> {
    if (!vaultPath) throw new Error("No vault is open");

    const bundle = await readPDFNote(path, vaultPath);

    if (bundle) {
        currentNotePath = path;
        currentNoteKind = 'pdfNote';
        
        // Store the exact typed PdfNotes object in your existing state target
        currentNoteContent = bundle.notes;
        
        // Keep the binary buffer safe in our separate getter
        currentPdfBinary = bundle.pdfData;

        lastOpened = path;
        await saveWorkspaceData();
    }
}

// Function to save a PDF note
export async function savePDFNote(path: string, updatedNotes: PdfNotes) {
    if (!vaultPath) throw new Error("No vault is open");

    // Persist the updated JSON note structure back to disk
    await writePDFNote(path, vaultPath, updatedNotes);
    
    await saveWorkspaceData();
}

// Function to close a note
export async function closeNote() {
    if (!vaultPath) throw new Error("No vault is open"); // check vault is open
    if (!currentNotePath) return; // check a note is open

    // Save data before closing
    if (currentNoteKind == 'pdfNote' && currentNoteContent) {
        await savePDFNote(currentNotePath, currentNoteContent);
    } else if (currentNoteKind == 'plainNote') {
        await savePlainNote(currentNotePath, currentNoteContent)
    }
    await saveWorkspaceData();

    // close - reset state variables
    currentNoteContent = currentNoteKind = currentNotePath = currentPdfBinary = null;
}