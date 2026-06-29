<!-- src/lib/vault/TreeView.svelte -->
<script lang="ts">
    import type { TreeNode } from '$lib/vault/types';
    import TreeView from './TreeView.svelte';
    import { selectFolder, getSelectedFolderPath, renameNode, deleteNode} from '$lib/vault/store.svelte'

    interface Props {
        node: TreeNode;
        depth?: number;
        handleLeafClick?: () => void; 
    }

    let { 
        node, 
        depth = 0, 
        handleLeafClick 
    }: Props = $props();

    // Variable for expansion state of folders
    let expanded = $state(false);

    // Function to toggle folder expansion
    function toggleExpanded() {
        expanded = !expanded;
    }

    // Local selected folder variable
    let selected = $derived(getSelectedFolderPath());

    // Local reactive state to keep track of the node name for auto-sizing text inputs
    let currentName = $state(node.name);

    $effect(() => {
        currentName = node.name;
    });

    // Function to handle node's on click functions
    function handleFolderClick() {
        if (node.kind === 'folder') {
            selectFolder(selected === node.path ? null : node.path)
        }
    }

    // Function to handle renaming of nodes
    function handleRename(event: Event) {
        const target = event.target as HTMLInputElement | null;
        if (!target) return;
        renameNode(node.path, target.value);
    }

</script>


<div class="tree-node {depth > 1 ? 'has-border' : ''}" style="--depth: {depth}">
    {#if depth === 0}
        <div class="children">
            {#each node.children ?? [] as child (child.path)}
                <TreeView 
                    node={child} 
                    depth={depth + 1} 
                    {handleLeafClick}
                />
            {/each}
        </div>
    {:else}
        {#if node.kind !== 'folder'}
            <div class="node-row">
                <span class="drop-down-placeholder"></span>
                <div class="node-content">
                    <button class="leaf" onclick={handleLeafClick}>
                        {node.kind === 'pdfNote' ? '📄' : '📝'} 
                        <span class="input-wrapper">
                            <input type="text" class="node-rename" bind:value={currentName} onblur={handleRename}/>
                            <span class="input-mirror">{currentName}</span>
                        </span>
                    </button>
                    <button class="del-btn" title="Delete note" onclick={() => deleteNode(node.path)}>×</button>
                </div>
            </div>
        {:else}
            <div class="node-row folder-row-container" class:is-selected={selected === node.path}>
                <span class="drop-down-placeholder">
                    <button class="folder-row" onclick={toggleExpanded}>
                        {expanded ? '⮟' : '⮞'}
                    </button>
                </span>
                <div class="node-content">
                    <button class="folder-title-btn" onclick={() => handleFolderClick()}>
                        <span class="folder-title">
                            {expanded ? '📂' : '📁'} 
                            <span class="input-wrapper">
                                <input type="text" class="node-rename" bind:value={currentName} onblur={handleRename}/>
                                <span class="input-mirror">{currentName}</span>
                            </span>
                        </span>
                    </button>
                    <button class="del-btn" title="Delete folder" onclick={() => deleteNode(node.path)}>×</button>
                </div>
            </div>

            {#if expanded}
                <div class="children">
                    {#each node.children ?? [] as child (child.path)}
                        <TreeView 
                            node={child} 
                            depth={depth + 1} 
                            {handleLeafClick}
                        />
                    {/each}
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

    /* Highlight style for the single active selection */
    .folder-row-container.is-selected {
        background-color: #e0f2fe; /* Light blue highlight */
        border-radius: 4px;
    }

    .tree-node.has-border::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background-color: gray;
        left: calc((var(--depth) - 2) * 20px + 14px); 
    }

    /* Reset button styles */
    .leaf, .folder-row, .folder-title-btn {
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        padding: 0;
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