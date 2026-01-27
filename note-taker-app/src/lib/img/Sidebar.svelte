<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import { openDirectory, restoreDirectory, loadNote } from '$lib/fileSystem';
    import { 
        getFolderList, 
        setFolderList, 
        getRootName, 
        setRootName, 
        loadWorkspace,
        renameItem,
        deleteNote
    } from '$lib/projectStore.svelte';

    interface Props {
        isSidebarOpen: boolean;
        toggleSidebar: () => void;
    }

    const { isSidebarOpen, toggleSidebar }: Props = $props();
    const navbarContext = getContext<any>('navbar');

    let folderList = $derived(getFolderList());
    let rootFolderName = $derived(getRootName());
    
    let expandedFolders = $state(new Set<string>());
    let draggedItem = $state<{ folderId: string; fileIndex: number | null } | null>(null);
    let dragEnterFolder = $state<string | null>(null);
    let dropPosition = $state<'before' | 'after' | null>(null);
    
    // Derived state: which folders should show top/bottom borders
    let highlightTopBorder = $derived.by(() => {
        if (!dragEnterFolder || !dropPosition || draggedItem?.fileIndex !== null) return null;
        
        const targetIndex = folderList.findIndex((f: any) => f.id === dragEnterFolder);
        if (targetIndex === -1) return null;
        
        if (dropPosition === 'before') {
            // Highlight top of target folder
            return dragEnterFolder;
        } else {
            // Highlight top of folder below target (if exists)
            return targetIndex < folderList.length - 1 ? folderList[targetIndex + 1].id : null;
        }
    });
    
    let highlightBottomBorder = $derived.by(() => {
        if (!dragEnterFolder || !dropPosition || draggedItem?.fileIndex !== null) return null;
        
        const targetIndex = folderList.findIndex((f: any) => f.id === dragEnterFolder);
        if (targetIndex === -1) return null;
        
        if (dropPosition === 'before') {
            // Highlight bottom of folder above target (if exists)
            return targetIndex > 0 ? folderList[targetIndex - 1].id : null;
        } else {
            // Highlight bottom of target folder
            return dragEnterFolder;
        }
    });

    onMount(async () => {
        console.log("Sidebar mounted. Restoring directory...");
        const handle = await restoreDirectory();
        
        if (handle) {
            console.log("Directory restored:", handle.name);
            setRootName(handle.name);
            await loadWorkspace(); 
        } else {
            console.log("No directory restored.");
        }
        
        if (navbarContext && navbarContext.setRefreshSidebar) {
            navbarContext.setRefreshSidebar(loadWorkspace);
        }
    });

    async function handleOpenFolder() {
        const handle = await openDirectory();
        if (handle) {
            setRootName(handle.name);
            await loadWorkspace();
        }
    }

    function addNewFolder(name: string) {
        const currentList = structuredClone($state.snapshot(folderList));
        currentList.push({
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            files: []
        });
        setFolderList(currentList);
    }

    function deleteFolder(folderId: string) {
        if (confirm("Remove this folder from sidebar? (Files will remain on disk)")) {
            const currentList = structuredClone($state.snapshot(folderList));
            const newList = currentList.filter((f: any) => f.id !== folderId);
            setFolderList(newList);
        }
    }
    
    function handleFolderRename(folderId: string, newName: string) {
        const currentList = structuredClone($state.snapshot(folderList));
        const folder = currentList.find((f: any) => f.id === folderId);
        if (folder) {
            folder.name = newName;
            setFolderList(currentList);
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

    function handleDragStart(event: DragEvent, folderId: string, fileIndex: number | null = null) {
        draggedItem = { folderId, fileIndex };
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData('application/json', JSON.stringify(draggedItem));
        }
    }

    function handleDragOver(event: DragEvent, targetFolderId: string) {
        event.preventDefault(); 
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        
        dragEnterFolder = targetFolderId;
        
        // Only calculate position for folder reordering (not file moves)
        if (draggedItem?.fileIndex === null) {
            const target = event.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            dropPosition = event.clientY < midpoint ? 'before' : 'after';
        } else {
            dropPosition = null;
        }
    }

    function handleDragLeave() {
        dragEnterFolder = null;
        dropPosition = null;
    }

    async function handleFolderDrop(event: DragEvent, targetFolderId: string) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!draggedItem) return;

        const newList = structuredClone($state.snapshot(folderList));

        const sourceFolderIndex = newList.findIndex((f: any) => f.id === draggedItem!.folderId);
        const targetFolderIndex = newList.findIndex((f: any) => f.id === targetFolderId);

        if (sourceFolderIndex === -1 || targetFolderIndex === -1) {
            draggedItem = null;
            dragEnterFolder = null;
            dropPosition = null;
            return;
        }

        if (draggedItem.fileIndex !== null) {
            // MOVE FILE
            if (draggedItem.folderId !== targetFolderId) {
                const sourceFolder = newList[sourceFolderIndex];
                const targetFolder = newList[targetFolderIndex];
                
                const [file] = sourceFolder.files.splice(draggedItem.fileIndex, 1);
                targetFolder.files.push(file);
            }
        } else {
            // REORDER FOLDER
            const movedFolder = newList.splice(sourceFolderIndex, 1)[0];
            
            let insertIndex = targetFolderIndex;
            
            if (dropPosition === 'after') {
                insertIndex = sourceFolderIndex < targetFolderIndex ? targetFolderIndex : targetFolderIndex + 1;
            } else {
                insertIndex = sourceFolderIndex < targetFolderIndex ? targetFolderIndex - 1 : targetFolderIndex;
            }
            
            newList.splice(insertIndex, 0, movedFolder);
        }

        draggedItem = null;
        dragEnterFolder = null;
        dropPosition = null;
        
        await setFolderList(newList);
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
                class:drop-target-top={highlightTopBorder === folder.id}
                class:drop-target-bottom={highlightBottomBorder === folder.id}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, folder.id)}
                ondragover={(e) => handleDragOver(e, folder.id)}
                ondragleave={handleDragLeave}
                ondrop={(e) => handleFolderDrop(e, folder.id)}
                role="region"
            >
                <div class="folder-header">
                    <span class="folder-icon">🖿</span>
                    
                    <input 
                        type="text" 
                        value={folder.name} 
                        class="title-input" 
                        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        onchange={(e) => handleFolderRename(folder.id, e.currentTarget.value)}
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
                                <button type="button" title="Open Note" class="file-open-btn" onclick={() => loadNote(file.name)}>📄</button>
                                <input 
                                    type="text"
                                    value={file.name.replace(/\.json$/i, '')} 
                                    class="title-input" 
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                    onchange={(e) => {
                                        const input = e.currentTarget;
                                        let newBaseName = input.value.trim();
                                        
                                        if (!newBaseName.toLowerCase().endsWith('.json')) {
                                            newBaseName += '.json';
                                        }
                                        
                                        if (!newBaseName || newBaseName === ".json") {
                                            input.value = file.name.replace(/\.json$/i, '');
                                            return;
                                        }

                                        if (newBaseName.includes('/') || newBaseName.includes('\\')) {
                                            alert("File names cannot contain slashes.");
                                            input.value = file.name.replace(/\.json$/i, '');
                                            return;
                                        }

                                        if (newBaseName !== file.name) {
                                            renameItem(folder.id, file.name, newBaseName).catch(err => {
                                                console.error("Rename failed:", err);
                                                input.value = file.name.replace(/\.json$/i, '');
                                            });
                                        }
                                    }}
                                />
                                <button class="del-btn" onclick={(e) => {
                                        e.stopPropagation();
                                        deleteNote(folder.id, file.name);
                                    }
                                }>×</button>
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
        transition: none;
    }
    
    /* File drop target - highlight entire folder */
    .folder.drop-target-file { 
        background: #eff6ff; 
        border-color: #3b82f6; 
    }
    
    /* Folder reorder - highlight borders on both sides of the gap */
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
