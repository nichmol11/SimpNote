<!-- src/lib/vault/DropGap.svelte -->

<script lang="ts">
    import { moveNode, reorderNode } from "./store.svelte";
    import { getBaseName, isDescendantOrSelf } from "./pathUtils";
    import { message } from '@tauri-apps/plugin-dialog';

    interface Props {
        parentPath: string;
        targetIndex: number;
        allNames: string[];
    }
    let { parentPath, targetIndex, allNames }: Props = $props();

    let dragOverCount = $state(0);
    let isDragOver =$derived(dragOverCount > 0);


    // Functions to handle drag and drop functionality //
    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragOverCount = 0;
  
        // Grab the payload data
        const data = event.dataTransfer?.getData('text/plain');
        if (!data) return;
        const { path: draggedPath, kind: draggedKind } = JSON.parse(data);

        console.log(draggedPath, draggedKind);

        // Guard against invalid drops (folder being moved to its own descendant gaps)
        if (isDescendantOrSelf(parentPath, draggedPath)) return;

        
        // Extract parent path and name of node
        const draggedParentPath = draggedPath.split('/').slice(0, -1).join('/');
        const draggedName = getBaseName(draggedPath);

        try {
            if (draggedParentPath !== parentPath) { // check if file is being moved or reordered within same folder
                await moveNode(draggedPath, parentPath, draggedKind); // Move the node
            }
            await reorderNode(parentPath, allNames, draggedName, targetIndex); // Reorder the node (insert here)
        } catch (e) {
            await message(
                e instanceof Error ? e.message : 'Move failed',
                { title: 'Move failed', kind: 'warning' }
            );
        }
    }
</script>

<div 
    class="drop-gap"
    class:is-drag-over={isDragOver}
    role="button"
    ondragover={(e) => e.preventDefault()}
    ondrop={handleDrop}
    ondragenter={() => dragOverCount++}
    ondragleave={() => dragOverCount--}
    ondragend={() => dragOverCount = 0}
></div>

<style>
    .drop-gap {
        height: 4px;
        margin: 0 8px;
        border-radius: 2px;
        background-color: transparent;
        transition: all 0.15s ease;
    }
    .drop-gap.is-drag-over {
        height: 16px;
        background-color: #dbeafe;
    }
</style>