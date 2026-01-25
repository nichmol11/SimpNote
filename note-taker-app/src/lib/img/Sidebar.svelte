<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import { openDirectory, restoreDirectory, loadProject } from '$lib/fileSystem';
    import { 
        getFolderList, 
        setFolderList, 
        getRootName, 
        setRootName, 
        loadWorkspace,
        renameItem
    } from '$lib/projectStore.svelte';

    interface Props {
        isSidebarOpen: boolean;
        toggleSidebar: () => void;
    }

    const { isSidebarOpen, toggleSidebar }: Props = $props();
    const navbarContext = getContext<any>('navbar');

    // Use derived state from the store to update UI automatically
    // In Svelte 5, if the store returns a proxy/state, we can use it directly.
    // Assuming getFolderList() returns the state object itself:
    let folderList = $derived(getFolderList());
    let rootFolderName = $derived(getRootName());
    
    // Local UI state (expanded folders is UI preference, can remain local or go to store)
    let expandedFolders = $state(new Set<string>());
    
    // --- State for Drag and Drop ---
    let draggedItem = $state<{ folderId: string; fileIndex: number | null } | null>(null);
    let dragEnterFolder = $state<string | null>(null);

    // --- Persistence Logic ---

    // 1. Initialize
    onMount(async () => {
        const handle = await restoreDirectory();
        if (handle) {
            setRootName(handle.name);
            await loadWorkspace(); // Now handled by the store logic
        }
        
        // Register refresh function with navbar context if needed
        // Since store handles state, we might just re-call loadWorkspace
        if (navbarContext && navbarContext.setRefreshSidebar) {
            navbarContext.setRefreshSidebar(loadWorkspace);
        }
    });

    // --- Actions ---

    async function handleOpenFolder() {
        const handle = await openDirectory();
        if (handle) {
            setRootName(handle.name);
            await loadWorkspace();
        }
    }

    function addNewFolder(name: string) {
        // Direct mutation of the store state (Svelte 5 proxy allows this if set up right)
        // OR use a store method. Here we assume direct mutation for simplicity based on previous steps
        const currentList = getFolderList();
        currentList.push({
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            files: []
        });
        setFolderList(currentList); // Triggers save in store (if we added a listener) or we call save manually
        
        // Note: For a robust app, add a "saveStructure()" method to the store and call it here.
        // For now, we rely on the user explicit save or add a specialized store method.
    }

    function deleteFolder(folderId: string) {
        if (confirm("Remove this folder from sidebar? (Files will remain on disk)")) {
            const newList = folderList.filter(f => f.id !== folderId);
            setFolderList(newList);
        }
    }

    function toggleFolder(folderId: string) {
        const newSet = new Set(expandedFolders);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }
        expandedFolders = newSet;
    }

    // --- Drag and Drop (Updated to use Store) ---

    function handleDragStart(event: DragEvent, folderId: string, fileIndex: number | null = null) {
        draggedItem = { folderId, fileIndex };
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(event: DragEvent, targetFolderId: string) {
        event.preventDefault(); 
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        dragEnterFolder = targetFolderId;
    }

    function handleDragLeave() {
        dragEnterFolder = null;
    }

    function handleFolderDrop(targetFolderId: string) {
        if (!draggedItem) return;

        // Clone list to avoid mutation during calculation if stricter reactivity is needed
        // But with Svelte 5 proxies, we can often mutate in place.
        // We'll use a safer copy-modify-set approach to ensure updates trigger.
        const newList = [...folderList];

        const sourceFolderIndex = newList.findIndex(f => f.id === draggedItem!.folderId);
        const targetFolderIndex = newList.findIndex(f => f.id === targetFolderId);

        if (sourceFolderIndex === -1 || targetFolderIndex === -1) return;

        if (draggedItem.fileIndex !== null) {
            // MOVE FILE
            if (draggedItem.folderId !== targetFolderId) {
                const sourceFolder = newList[sourceFolderIndex];
                const targetFolder = newList[targetFolderIndex];
                
                // Splice returns array, get first item
                const [file] = sourceFolder.files.splice(draggedItem.fileIndex, 1);
                targetFolder.files.push(file);
            }
        } else {
            // REORDER FOLDER
            const movedFolder = newList.splice(sourceFolderIndex, 1)[0];
            newList.splice(targetFolderIndex, 0, movedFolder);
        }

        draggedItem = null;
        dragEnterFolder = null;
        
        setFolderList(newList); // Update store
    }
</script>

<div id="sidebar" class={isSidebarOpen ? 'open' : 'closed'}>
    <h1 style="font-size: 1.5rem;">My Notes</h1>
    <h2>Local directory:</h2>
    <div class="actions">
        {#if !rootFolderName}
            <button class="primary-btn" onclick={handleOpenFolder}>📂 Open Local Folder</button>
        {:else}
             <div class="current-folder">
                <span title={rootFolderName}>📂 {rootFolderName}</span>
                <button class="sm-btn" onclick={handleOpenFolder}>Change</button>
            </div>
        {/if}
    </div>
    <br>
    <div class="folder-list">
        {#each folderList as folder (folder.id)}
            <div 
                class="folder"
                class:drop-target-file={dragEnterFolder === folder.id && draggedItem?.fileIndex !== null}
                class:drop-target-reorder={dragEnterFolder === folder.id && draggedItem?.fileIndex === null}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, folder.id)}
                ondragover={(e) => handleDragOver(e, folder.id)}
                ondragleave={handleDragLeave}
                ondrop={() => handleFolderDrop(folder.id)}
                role="region"
            >
                <div class="folder-header">
                    <span class="folder-icon">🖿</span>
                    <!-- Note: We removed saveStructure onchange since we use store now. 
                         Ideally bind:value updates store directly or use onchange to call setFolderList -->
                    <input 
                        type="text" 
                        bind:value={folder.name} 
                        class="title-input" 
                        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()} 
                    />
                    <button class="toggle-btn" onclick={() => toggleFolder(folder.id)}>
                        {expandedFolders.has(folder.id) ? '⯅' : '⯆'} 
                    </button>
                    <button class="del-btn" onclick={() => deleteFolder(folder.id)}>×</button>
                </div>

                {#if expandedFolders.has(folder.id)}
                    <ul>
                        {#each folder.files as file, j (file.name)}
                            <li 
                                class="file-item"
                                class:is-project={file.kind === 'project'}
                                draggable="true"
                                ondragstart={(e) => {
                                    e.stopPropagation();
                                    handleDragStart(e, folder.id, j);
                                }}
                            >
                                <button type="button" title="Open Note" class="file-open-btn" onclick={() => {console.log("Opening project:", file.name); loadProject(file.name);}}>📄</button>
                                <input 
                                    type="text"
                                    value={file.name} 
                                    class="title-input" 
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                    onchange={(e) => {
                                        const newName = e.currentTarget.value;
                                        // Only trigger if name actually changed
                                        if (newName && newName !== file.name) {
                                            renameItem(folder.id, file.name, newName);
                                        } else {
                                            // Revert input if empty or unchanged
                                            e.currentTarget.value = file.name; 
                                        }
                                    }}
                                />
                                <button class="del-btn" onclick={() => removeFile(folder.id)}>×</button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}

        <button class="add-folder-btn" onclick={() => addNewFolder('New Folder')}>
            <span>➕ New Folder</span>
        </button>
    </div>
</div>

<style>
    /* Styles remain exactly the same as your provided code */
    #sidebar {
        position: fixed;
        top: 60px; left: 0;
        height: 100%; width: 300px;
        padding: 20px;
        background-color: #f9f9f9;
        border-right: 1px solid #ddd;
        transition: transform 0.3s ease;
        z-index: 99;
        overflow-y: auto;
    }
    #sidebar.closed { transform: translateX(-100%); }
    #sidebar.open { transform: translateX(0); }

    .actions { margin-bottom: 15px; }
    .primary-btn {
        width: 100%; padding: 10px;
        background: #007bff; color: white;
        border: none; border-radius: 6px; cursor: pointer;
        font-weight: 500;
    }
    .current-folder {
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
    }
    .folder.drop-target-file { background: #eff6ff; border-color: #3b82f6; }
    
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
    }
    .file-item:hover { background: #f3f4f6; }
    .file-item.is-project { color: #000; font-weight: 500; }
    .file-item.is-project span:first-child { font-size: 1.1rem; }

    .add-folder-btn {
        margin-top: 10px; width: 100%; padding: 8px;
        background: none; border: 1px dashed #ccc; border-radius: 6px;
        color: #666; cursor: pointer;
    }
    .add-folder-btn:hover { border-color: #666; color: #333; }

    .file-open-btn {
        background: none; border: none; cursor: pointer;
        padding: 0; font-size: 1rem; color: inherit;
    }
    .file-open-btn:hover { opacity: 0.7; }
</style>
