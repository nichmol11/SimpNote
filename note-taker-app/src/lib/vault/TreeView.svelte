<!-- src/lib/vault/TreeView.svelte -->
<script lang="ts">
    import type { TreeNode } from '$lib/vault/types';
    import TreeView from './TreeView.svelte';
    import DropGap from './DropGap.svelte';
    import { isDescendantOrSelf } from './pathUtils';
    import { isExpanded, toggleExpanded, selectFolder, getSelectedFolderPath, getOrder, getEffectiveOrder, renameNode, deleteNode, moveNode, expandFolder} from '$lib/vault/store.svelte'
	import { message, confirm } from '@tauri-apps/plugin-dialog';

    // --- Props ---
    interface Props {
        node: TreeNode;
        depth?: number;
        handleLeafClick?: () => void; 
    }
    let { node, depth = 0, handleLeafClick }: Props = $props();

    // --- Node display state (derived from store) ---
    let expanded = $derived(isExpanded(node.path));
    let selected = $derived(getSelectedFolderPath());
    const hasChildren = $derived((node.children?.length ?? 0) > 0);

    // --- Rename input state ---
    let currentName = $state(node.name);
    $effect(() => { currentName = node.name; });

    // --- Drag-and-drop state ---
    let dragOverCount = $state(0);
    let isDragOver = $derived(dragOverCount > 0);
    let expandTimeout: ReturnType<typeof setTimeout> | null = null;
    let rootDragOverCount = $state(0);
    let isRootDragOver = $derived(rootDragOverCount > 0);

    $effect(() => {
        currentName = node.name;
    });

    // Function to handle node's on click functions
    function handleFolderClick() {
        if (node.kind === 'folder') {
            selectFolder(selected === node.path ? null : node.path)
        }
    }

    // Function to reorganise nodes according to order
    function applyOrder(children: TreeNode[]): TreeNode[] {
        const names = children.map(c => c.name);
        const orderedNames = getEffectiveOrder(node.path, names);
        const byName = new Map(children.map(c => [c.name, c]));
        return orderedNames.map(name => byName.get(name)!);
    }
        
    // Function to handle renaming of nodes
    async function handleRename(event: Event) {
        const target = event.target as HTMLInputElement | null;
        if (!target) return;
        try {
            await renameNode(node.path, target.value, node.kind);
        } catch (e) {
            // Inform the user if name is invalid
            await message(
                e instanceof Error ? e.message : 'Rename failed',
                { title: 'Invalid name', kind: 'warning' }
            );
        
            // reset name if error thrown, e.g. if new name is blank
            target.value = node.name.replace(/\.md$/, '');
        }       
    }

    // Function to handle deleting of nodes
    async function handleDelete(nodeName: string, nodePath: string, nodeKind: string) {
        // Check if the user is sure they want to delete this item
        // Build the confirmation message
        const typeLabel = nodeKind === 'folder' ? 'folder' : 'note';
        const message = `This will delete the ${typeLabel} ${nodeName}${nodeKind === 'folder' ? ', all notes and folders within will also be deleted.' : '.'}\nThis action cannot be undone.`;

        // Call a confirmation window
        const confirmation: boolean = await confirm(message, { title: 'Are you sure?', kind: 'warning' });

        // Delete the node if the user confirms
        if (confirmation) await deleteNode(nodePath);
    }

    // Function to handle dragging and dropping nodes
    function handleDragStart(event: DragEvent) {
        event.dataTransfer?.setData('text/plain', JSON.stringify({ path: node.path, kind: node.kind }));
    }

    // Function to handle drag over
    function handleDragOver(event: DragEvent) {
        event.preventDefault();
    }

    //Function to handle drag over invalid targets (note nodes)
    function handleDragOverInvalid(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
    }

    // Function to handle nodes being dropped into the vault root
    async function handleRootDrop(event: DragEvent) {
        event.preventDefault();
        rootDragOverCount=0;

        const data = event.dataTransfer?.getData('text/plain');
        if (!data) return;
        const { path: draggedPath, kind: draggedKind } = JSON.parse(data);

        try { // Move the node
            await moveNode(draggedPath, "", draggedKind);
        } catch(e) {
            await message(
                e instanceof Error ? e.message : 'No vault is open',
                { title: 'Move failed', kind: 'warning' }
            );
        } 
    }

    // Function to handle drops
    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragOverCount = 0;
        if (expandTimeout) { // reset the folder autoexpand timer
            clearTimeout(expandTimeout);
            expandTimeout = null;
        }
        const data = event.dataTransfer?.getData('text/plain');
        if (!data) return;
        const { path: draggedPath, kind: draggedKind } = JSON.parse(data);

        // Guard against invalid drops
        if (isDescendantOrSelf(node.path, draggedPath)) return;

        // Move the node
        try {
            await moveNode(draggedPath, node.path, draggedKind);
        } catch(e) {
            await message(
                e instanceof Error ? e.message : 'No vault is open',
                { title: 'Move failed', kind: 'warning' }
            );
        }  
    }

</script>


<div class="tree-node {depth > 1 ? 'has-border' : ''}" style="--depth: {depth}">
    {#if depth === 0}
        {@const orderedChildren = applyOrder(node.children ?? [])}
        {@const names = orderedChildren.map(c => c.name)}
        <div class="children">
            {#each orderedChildren as child, i (child.path)}
                <DropGap parentPath="" targetIndex={i} allNames={names} />
                <TreeView 
                    node={child} 
                    depth={depth + 1} 
                    {handleLeafClick}
                />
            {/each}
            <DropGap parentPath="" targetIndex={orderedChildren.length} allNames={names} />
        </div>
        <div 
            class="root-drop-zone"
            class:is-drag-over={isRootDragOver}
            role="button"
            ondragover={(e) => e.preventDefault()}
            ondrop={handleRootDrop}
            ondragenter={() => rootDragOverCount++}
            ondragleave={() => rootDragOverCount--}
        ></div>
    {:else}
        {#if node.kind !== 'folder'}
            <div class="node-row" draggable="true" ondragstart={handleDragStart}>
                <span class="drop-down-placeholder"></span>
                <div class="node-content">
                    <button class="leaf" onclick={handleLeafClick}>
                        {node.kind === 'pdfNote' ? '📄' : '📝'} 
                        <span class="input-wrapper">
                            <input 
                                type="text" 
                                class="node-rename" 
                                bind:value={currentName} 
                                onblur={handleRename} 
                                onkeydown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur(); // triggers onblur, which calls handleRename
                                    } else if (e.key === 'Escape') {
                                        e.currentTarget.value = node.name.replace(/\.md$/, ''); // reset
                                        e.currentTarget.blur(); // unfocus without renaming
                                    }
                                }} 
                                ondragover={(e) => handleDragOverInvalid(e)} 
                                ondrop={(e) => e.preventDefault()}
                            />
                            <span class="input-mirror">{currentName}</span>
                        </span>
                    </button>
                    <button class="del-btn" title="Delete note" onclick={() => handleDelete(node.name, node.path, node.kind)}>×</button>
                </div>
            </div>
        {:else}
            <div 
                class="node-row folder-row-container" 
                class:is-selected={selected === node.path}
                class:is-drag-over={isDragOver}
                role="button" 
                draggable="true" 
                ondragstart={handleDragStart} 
                ondragover={handleDragOver} ondrop={handleDrop} 
                ondragenter={() => {
                    dragOverCount++;
                    if (!expandTimeout) { // only start a timer if one isn't already running
                        expandTimeout = setTimeout(() => {
                            expandFolder(node.path);
                            expandTimeout = null;
                        }, 800);
                    }
                }}
                ondragleave={() => {
                    dragOverCount--;
                    if (dragOverCount === 0 && expandTimeout) {
                        clearTimeout(expandTimeout);
                        expandTimeout = null;
                    }
                }}
                ondragend={() => {
                    dragOverCount = 0;
                    if (expandTimeout) {
                        clearTimeout(expandTimeout);
                        expandTimeout = null;
                    }
                }}
            >
                <span class="drop-down-placeholder">
                {#if hasChildren}
                    <button class="folder-row" onclick={() => toggleExpanded(node.path)}>
                        {expanded ? '⮟' : '⮞'}
                    </button>
                {/if}
                </span>
                <div class="node-content">
                    <button class="folder-title-btn" onclick={() => handleFolderClick()}>
                        <span class="folder-title">
                            {expanded ? '📂' : '📁'} 
                            <span class="input-wrapper">
                                <input type="text" class="node-rename" bind:value={currentName} onblur={handleRename} onkeydown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur(); // triggers onblur, which calls handleRename
                                    } else if (e.key === 'Escape') {
                                        e.currentTarget.value = node.name.replace(/\.md$/, ''); // reset
                                        e.currentTarget.blur(); // unfocus without renaming
                                    }
                                }} ondragover={(e) => e.preventDefault()} ondrop={(e) => e.preventDefault()}/>
                                <span class="input-mirror">{currentName}</span>
                            </span>
                        </span>
                    </button>
                    <button class="del-btn" title="Delete folder" onclick={() => handleDelete(node.name, node.path, node.kind)}>×</button>
                </div>
            </div>

            {#if expanded}
                {@const orderedChildren = applyOrder(node.children ?? [])}
                {@const names = orderedChildren.map(c => c.name)}
                <div class="children">
                    {#each orderedChildren as child, i (child.path)}
                        <DropGap parentPath={node.path} targetIndex={i} allNames={names} />
                        <TreeView 
                            node={child} 
                            depth={depth + 1} 
                            {handleLeafClick}
                        />
                    {/each}
                    <DropGap parentPath={node.path} targetIndex={orderedChildren.length} allNames={names} />
                </div>
            {/if}
        {/if}
    {/if}
</div>

<style>
    /* Required for absolute positioning of the border element */
    .tree-node {
        position: relative;
    }

    /* Node row */
    .node-row {
        display: flex;
        align-items: center;
        width: 100%;
        padding-left: calc((var(--depth) - 1) * 20px + 8px);
    }

    /* Fodler row */
    .folder-row-container {
        background-color: white;
    }

    /* Highlight style for the single active selection */
    .folder-row-container.is-selected {
        background-color: #e0f2fe; /* Light blue highlight */
        border-radius: 3px;
    }

    .tree-node.has-border::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        /*background-color: gray;*/
        left: calc((var(--depth) - 2) * 20px + 14px); 
    }

    .root-drop-zone {
        height: 24px;
        border-radius: 3px;
        background-color: transparent;
        border: 1px dashed transparent;
        transition: all 0.15s ease;
    }

    .root-drop-zone.is-drag-over {
        height: 24px;
        background-color: #dbeafe;
        border: 2px dashed #3b82f6;
    }

    /* Reset button styles */
    .leaf, .folder-row, .folder-title-btn {
        border: none;
        cursor: pointer;
        text-align: left;
        padding: 0;
    }

    .folder-row-container.is-drag-over {
        background-color: #dbeafe;
        outline: 2px dashed #3b82f6;
        border-radius: 3px;
        position: relative;
        z-index: 1;
    }

    .leaf, .folder-title-btn {
        flex-grow: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .folder-title {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-width: 0;
    }

    .node-content {
        width: 100%;
        padding-right: 16px;
        display: flex;
        flex-direction: row;            
        justify-content: space-between;  
        align-items: center;             
    }

    .drop-down-placeholder {
        width: 16px;
    }

    /* Container layout driving responsive content sizing */
    .input-wrapper {
        display: inline-grid;
        grid-template-columns: minmax(0, 1fr);
        vertical-align: middle;
        align-items: center;
        min-width: 12px;
        max-width: 100%;
    }

    .node-rename,
    .input-mirror {
        grid-area: 1 / 1;
        font: inherit;
        padding: 0;
        margin: 0;
        white-space: pre;
    }

    .node-rename {
        border: none;
        background: transparent;
        color: inherit;
        outline: none;
        width: 100%;
        overflow: hidden;
        line-height: normal;
        box-sizing: border-box;
    }

    .input-mirror {
        visibility: hidden;
        pointer-events: none;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .node-rename:focus {
        outline: none;
        box-shadow: none;
        color: #666;
        text-decoration: underline;
    }

    .del-btn {
        background: none; border: none; cursor: pointer;
        padding: 4px; color: #666; font-size: 1.1rem;
    }
    .del-btn:hover { color: #ef4444; }
</style>