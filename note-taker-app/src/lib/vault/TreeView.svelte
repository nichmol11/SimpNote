<script lang="ts">
    import type { TreeNode } from '$lib/vault/types';
    import TreeView from './TreeView.svelte';

    interface Props {
        node: TreeNode;
        depth?: number;
        selectedFolder: string | null; // Make it bindable and nullable
        onSelectFolder?: (path: string) => void; // Track click bubbling
        handleLeafClick?: () => void; 
    }

    let { 
        node, 
        depth = 0, 
        selectedFolder = $bindable(null),
        onSelectFolder,
        handleLeafClick 
    }: Props = $props();

    // Variable for expansion state of folders
    let expanded = $state(false);

    // Function to toggle folder expansion
    function toggleExpanded() {
        expanded = !expanded;
    }

    // Handle when a folder row itself is clicked
    function selectThisFolder() {
        if (node.kind === 'folder') {
            selectedFolder = node.path;
            if (onSelectFolder) onSelectFolder(node.path);
        }
    }

    // Function to add a new folder
    function addNewFolder(parentFolder: string) {
        console.log("adding new folder within " + parentFolder);
    }

    function renameNode(nodeName: string) {}
    function deleteNode(nodeName: string) {}
</script>


<div class="tree-node {depth > 1 ? 'has-border' : ''}" style="--depth: {depth}">
    {#if depth === 0}
        <div class="children">
            {#each node.children ?? [] as child (child.path)}
                <TreeView 
                    node={child} 
                    depth={depth + 1} 
                    bind:selectedFolder
                    {onSelectFolder}
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
                        {node.kind === 'pdfNote' ? '📄' : '📝'} {node.name}
                    </button>
                    <button class="del-btn" title="Delete note" onclick={() => deleteNode(node.name)}>×</button>
                </div>
            </div>
        {:else}
            <div class="node-row folder-row-container" class:is-selected={selectedFolder === node.path}>
                <span class="drop-down-placeholder">
                    <button class="folder-row" onclick={toggleExpanded}>
                        {expanded ? '⮟' : '⮞'}
                    </button>
                </span>
                <div class="node-content">
                    <button class="folder-title-btn" onclick={selectThisFolder}>
                        <span class="folder-title">
                            {expanded ? '📂' : '📁'} {node.name}
                        </span>
                    </button>
                    <button class="del-btn" title="Delete folder" onclick={() => deleteNode(node.name)}>×</button>
                </div>
            </div>

            {#if expanded}
                <div class="children">
                    {#each node.children ?? [] as child (child.path)}
                        <TreeView 
                            node={child} 
                            depth={depth + 1} 
                            bind:selectedFolder
                            {onSelectFolder}
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

    .del-btn {
        background: none; border: none; cursor: pointer;
        padding: 4px; color: #666; font-size: 1.1rem;
    }
    .del-btn:hover { color: #ef4444; }
</style>