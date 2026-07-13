<!-- src/lib/vault/frontend/LastOpened.svelte -->

<script lang="ts">
    import { openNote, getLastOpened } from "$lib/vault/backend/store.svelte";
    import { getBaseName } from "$lib/vault/backend/pathUtils";
    import { message } from '@tauri-apps/plugin-dialog';
	import type { NodeKind } from "$lib/vault/backend/types";

    let lastOpened = $derived(getLastOpened());

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
</script>

<div class="last-opened">
    {#if lastOpened}
            <div class="pinned" onclick={() => handleOpenNote(lastOpened)}>
                <div class="note-title">
                    {#if lastOpened.endsWith(".md")}
                        <span>📝</span>
                    {:else}
                        <span>📄</span>
                    {/if}
                    <span>{(getBaseName(lastOpened))}</span>
                </div>
            </div>
    {:else}
        <h2>No recently opened notes</h2>
    {/if}
</div>

<style>
    .last-opened {
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
</style>