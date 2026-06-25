<script lang="ts">
    import type { TreeNode } from '$lib/vault/types';
    import TreeView from './TreeView.svelte';

    interface Props {
        node: TreeNode;
    }

    const { node }: Props = $props();

    let expanded = $state(false);

    function toggleExpanded() {
        expanded = !expanded;
    }

    function handleLeafClick() {
        //replace with open note function
        console.log('clicked', node.path);
    }
</script>

<div class="tree-node">
    {#if node.kind !== 'folder'}
        <button class="leaf" onclick={handleLeafClick}>
            {node.kind === 'pdfNote' ? '📄' : '📝'} {node.name}
        </button>
    {:else}
        {expanded ? '📂' : '📁'} {node.name}
        <button class="folder-row" onclick={toggleExpanded}>
            {expanded ? '▲' : '▼'}
        </button>

        {#if expanded}
            <div class="children">
                {#each node.children ?? [] as child (child.path)}
                    <TreeView node={child} />
                {/each}
            </div>
        {/if}
    {/if}
</div>