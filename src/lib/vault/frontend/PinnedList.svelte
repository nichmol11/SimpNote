<!-- src/lib/vault/frontend/PinnedList.svelte -->

<script lang="ts">
    import { getPinned, isPinned, removeFromPinned, openNote, addPlainNote } from "$lib/vault/backend/store.svelte";
    import { getBaseName } from "$lib/vault/backend/pathUtils";
    import { message } from '@tauri-apps/plugin-dialog';
	import type { NodeKind } from "$lib/vault/backend/types";

    let pinnedList = $derived(getPinned());

    async function handleOpenNote(path: string) {
        let noteKind: NodeKind;
        if (path.endsWith('.md')) {
            noteKind = "plainNote";
        } else {
            noteKind = "pdfNote";
        }
        try {
            await openNote(path, noteKind);
        } catch (e) {
            await message(
                e instanceof Error ? e.message : 'Opening note failed',
                { title: 'Error in opening note', kind: 'warning' }
            );
        }
    }
    // TO BUILD
    async function reorderPinned() {

    }
</script>

<div class="pinned-list">
    {#if pinnedList.length >= 1}
        {#each pinnedList as pinned}
            <div class="pinned" onclick={() => handleOpenNote(pinned)}>
                <div class="note-title">
                    {#if pinned.endsWith(".md")}
                        <span>📝</span>
                    {:else}
                        <span>📄</span>
                    {/if}
                    <span>{(getBaseName(pinned))}</span>
                </div>

                <button class="pin-btn" title="Remove note from Pinned" onclick={() => removeFromPinned(pinned)}>
                    <span class="unpin-icon">📌</span>
                </button>
            </div>
        {/each}
    {:else}
        <h2>Nothing is pinned yet!</h2>
    {/if}
</div>

<style>
    .pinned-list {
    }
    .pinned {
        width: 100%;
        padding-left: 15px;
        padding-right: 16px;
        padding-top: 5px;
        padding-bottom: 5px;
        display: flex;
        flex-direction: row;            
        justify-content: space-between;  
        align-items: center;  
    }

    .unpin-icon {
        filter: brightness(0.7);
        filter: grayscale(100%);
    }
</style>