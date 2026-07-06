<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import TreeView from './vault/TreeView.svelte';
    import { getTree, getVaultPath, openVault, getIsRestoring, addNewFolder} from '$lib/vault/store.svelte';

    let tree = $derived(getTree());
    // Check if vault needs to be restored
	let isRestoring = $derived(getIsRestoring());

    let vaultPath: string | null = $derived(getVaultPath());
    let vaultFolderName = $derived(
        vaultPath ? vaultPath.split('/').filter(Boolean).pop() || '' : ''
    );

    interface Props {
        isSidebarOpen: boolean;
        toggleSidebar: () => void;
    }

    const { isSidebarOpen, toggleSidebar }: Props = $props();
    const navbarContext = getContext<any>('navbar');


    // Folder selection logic
    let currentlySelectedFolderPath = $state<string | null>(null);
    
    function handleFolderSelection(path: string) {
        console.log("Active directory target set to:", path);
        // You can now read `currentlySelectedFolderPath` when adding new nodes!
    }

    // PLACEHOLDERS - MOVE TO vault/store.svelte.ts
    function addNewPDFNote() { console.log("Add PDF note"); }
    function addNewPlainNote() { console.log("Add plain note"); }

</script>

<div id="sidebar" class={isSidebarOpen ? 'open' : 'closed'}>
    <h1 style="font-size: 1.5rem;">My Notes</h1>
    {#if isRestoring}
        <h2>Loading vault...</h2>
    {:else}
        <div class="vault">
            {#if !vaultPath}
                <h2>No vault folder selected.</h2>
                <div class="vault-row">
                    <button class="vault-btn-open" onclick={() => openVault()}>📂 Add Folder</button>
                </div>
            {:else}
                <div class="vault-row">
                    <h2 id="vault-folder" title={vaultPath}><b>🗄️ Vault Folder:</b> {vaultFolderName}</h2>
                    <button class="vault-btn-change" title="Change vault folder" onclick={() => openVault()}>✏️</button>
                </div>
            {/if}
        </div>
        <div id="last-opened">
            <h2>🔁 Last Opened:</h2>
        </div>
        <div id="pinned">
            <h2>📌 Pinned Notes:</h2>
        </div>
        <div id="files">
            <h2>📁 Vault files:</h2>
            <div id="folder-list">
            {#if tree}
                <TreeView 
                    node={tree} 
                    bind:selectedFolder={currentlySelectedFolderPath}
                    onSelectFolder={handleFolderSelection}
                />
            {/if}
        </div>
        </div>
        
        <br>
        <button class="add-node-btn" onclick={() => addNewFolder()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New Folder</span><span>📁</span>
            </div>
        </button>
        <button class="add-node-btn" onclick={() => addNewPDFNote()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New PDF Note</span><span>📄</span>
            </div>
        </button>
        <button class="add-node-btn" onclick={() => addNewPlainNote()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New Plain Note</span><span>📝</span>
            </div>
        </button>
    {/if}
</div>

<style>
    #sidebar {
        position: fixed;
        top: 40px; left: 0;
        height: 100%; width: 300px;
        padding: 16px;
        background-color: #f9f9f9;
        border-right: 1px solid #ddd;
        transition: transform 0.3s ease;
        z-index: 99;
        overflow-y: auto;
        margin-top: 0;
    }

    #sidebar.closed { transform: translateX(-100%); }

    #sidebar.open { transform: translateX(0); }


    .vault {
        display: flex;
        flex-direction: column;
    }

    .vault-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
  
    .vault-btn-open {
        width: 100%;
        padding: 5px;
        background: #007bff; color: white;
        border: none; border-radius: 6px; cursor: pointer;
        font-weight: 500;
    }

    .vault-btn-change {
        padding: 5px;
        cursor: pointer;
        font-weight: 500;
    }

    /* Folder list (tree view container) styling*/
    #folder-list {
        padding: 5px;
        padding-right: 0px;
        width: 100%;
        background-color: white;
        border-radius: 12px;
    }

    .add-node-btn {
        margin-top: 10px; width: 100%; padding: 8px;
        background: none; border: 1px dashed #ccc; 
        border-radius: 12px;
        color: #666; cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .add-node-btn:hover { border-color: #666; color: #333; }

    .add-node-btn-content {
        width: 80%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    /* OLD FOLDER DRAG STUFF */
    /* .current-folder {
        display: flex; justify-content: space-between; align-items: center;
        background: #eee; padding: 6px 10px; border-radius: 6px; font-size: 0.9rem;
    }
    .current-folder span {
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
    }
    .sm-btn { padding: 2px 8px; font-size: 0.8rem; cursor: pointer; }


    .folder {
        background: white;
        margin-bottom: 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        overflow: hidden;
        transition: none;
    }
    

    .folder.drop-target-file { 
        background: #eff6ff; 
        border-color: #3b82f6; 
    }
    

    .folder.drop-target-top {
        border-top: 1px solid #616161;
    }
    
    .folder.drop-target-bottom {
        border-bottom: 1px solid #616161;
    }
    
    .folder-header {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 10px; background: #fff;
    }
    .folder-icon { color: #f59e0b; }
    
    .title-input {
        flex: 1; border: none; background: transparent;
        font-weight: 500; font-size: 0.95rem; min-width: 0;
    }

    .title-input:focus {
        outline: none; background: #eef2ff; border-radius: 4px;
    }

    .toggle-btn, .del-btn {
        background: none; border: none; cursor: pointer;
        padding: 4px; color: #666; font-size: 1.1rem;
    }
    .del-btn:hover { color: #ef4444; }

    ul { list-style: none; padding: 0; margin: 0; border-top: 1px solid #eee; }
    
    .file-item {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 12px 6px 16px;
        cursor: pointer; font-size: 0.9rem;
        border-left: 3px solid transparent;
        border-top: 1px solid transparent;
        border-bottom: 1px solid transparent;
    }
    .file-item:hover { background: #f3f4f6; }
    .file-item.is-project { color: #000; font-weight: 500; }
    .file-item.file-drop-before { border-top-color: #3b82f6; }
    .file-item.file-drop-after { border-bottom-color: #3b82f6; }

    .file-open-btn {
        background: none; border: none; cursor: pointer;
        padding: 0; font-size: 1rem; color: inherit;
    }
    .file-open-btn:hover { opacity: 0.7; }

    :global(.drag-ghost) {
        position: fixed;
        top: -9999px;
        left: -9999px;
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #bcd3ff;
        background: #edf4ff;
        color: #1f2937;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
    } */
</style>