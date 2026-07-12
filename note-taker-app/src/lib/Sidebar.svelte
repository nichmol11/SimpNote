<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import TreeView from './vault/TreeView.svelte';
    import PinnedList from './vault/PinnedList.svelte';
    import { toggleSidebar, getTree, getVaultPath, openVault, getIsRestoring, addNewFolder, addPlainNote, addPDFNote, getIsSidearOpen} from '$lib/vault/store.svelte';
	import Collapsible from './Collapsible.svelte';

    let tree = $derived(getTree());
    // Check if vault needs to be restored
	let isRestoring = $derived(getIsRestoring());

    let vaultPath: string | null = $derived(getVaultPath());
    let vaultFolderName = $derived(
        vaultPath ? vaultPath.split('/').filter(Boolean).pop() || '' : ''
    );

    let isSidebarOpen: boolean = $derived(getIsSidearOpen());
    
    const navbarContext = getContext<any>('navbar');


    // Folder selection logic
    let currentlySelectedFolderPath = $state<string | null>(null);
    
    function handleFolderSelection(path: string) {
        console.log("Active directory target set to:", path);
        // You can now read `currentlySelectedFolderPath` when adding new nodes!
    }


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
        <Collapsible icon="🔁" title="Last Opened">
            <div id="last-opened">
                <p>Place holder</p>        
            </div>
        </Collapsible>
        <Collapsible icon="📌" title="Pinned Notes">
            <div id="pinned">
                <PinnedList></PinnedList>    
            </div>
        </Collapsible>
        <Collapsible icon="🖴" title="Vault files">
            <div id="files">
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
        </Collapsible>
 
        <button class="add-node-btn" onclick={() => addNewFolder()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New Folder</span><span>📁</span>
            </div>
        </button>
        <button class="add-node-btn" onclick={() => addPDFNote()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New PDF Note</span><span>📄</span>
            </div>
        </button>
        <button class="add-node-btn" onclick={() => addPlainNote()}>
            <div class="add-node-btn-content">
                <span>➕</span><span>New Plain Note</span><span>📝</span>
            </div>
        </button>
    {/if}
</div>

<style>
    #sidebar {
        position: fixed;
        top: 40px; 
        left: 0;
        height: calc(100% - 40px); 
        width: 300px;
        padding: 16px;
        background-color: #f9f9f9;
        border-right: 1px solid #ddd;
        transition: transform 0.3s ease;
        z-index: 99;
        overflow-y: scroll;
        margin-top: 0;
    }

    #sidebar.closed { transform: translateX(-100%); }

    #sidebar.open { transform: translateX(0); }


    .vault {
        display: flex;
        flex-direction: column;
        background-color: white;
        border-radius: 3px;
        padding-left: 10px;
        padding-right: 10px;
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
</style>