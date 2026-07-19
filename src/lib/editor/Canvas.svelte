<!-- src/lib/editor/Canvas.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
    import PlainNoteEditor from '$lib/editor/PlainNoteEditor.svelte';
    import PdfNoteEditor from '$lib/editor/PdfNoteEditor.svelte';
    import { 
        getCurrentNotePath, 
        getCurrentNoteKind,
		addDragedPDFNote
    } from '$lib/vault/backend/store.svelte';

    let globalZoom = $state(1);
    let showMarkdownAll = $state(false);
    let isDraggingOver = $state(false);

    const MIN_GLOBAL_ZOOM = 0.6;
    const MAX_GLOBAL_ZOOM = 2.5;

    let currentNotePath = $derived(getCurrentNotePath());
    let currentNoteKind = $derived(getCurrentNoteKind());

    function zoomIn() {
        globalZoom = Math.min(MAX_GLOBAL_ZOOM, globalZoom + 0.1);
    }

    function zoomOut() {
        globalZoom = Math.max(MIN_GLOBAL_ZOOM, globalZoom - 0.1);
    }

    async function handleFileDrop(paths: string[]) {
        const droppedPdfs = paths.filter(path => path.toLowerCase().endsWith('.pdf'));
        if (droppedPdfs.length === 0) return;

        try {
            console.log(`Ingesting PDF: ${droppedPdfs[0]}`);
            await addDragedPDFNote(droppedPdfs[0]); 
        } catch (err) {
            console.error("Failed creating note from dropped PDF:", err);
        }
    }

    // Capture absolute file paths natively through Tauri V2 Window Listeners
    onMount(() => {
        let unlisten: () => void;

        getCurrentWebviewWindow().onDragDropEvent((event) => {
            switch (event.payload.type) {
                case 'enter':
                case 'over':
                    if (!currentNotePath) {
                        isDraggingOver = true;
                    }
                    break;
                case 'leave':
                case 'cancelled':
                    isDraggingOver = false;
                    break;
                case 'drop':
                    isDraggingOver = false;
                    if (currentNotePath) return; // Only allow when no note is open
                    
                    // Handle the actual dropped files safely here
                    handleFileDrop(event.payload.paths);
                    break;
            }
        }).then(unlistenFn => unlisten = unlistenFn);

        return () => {
            if (unlisten) unlisten();
        };
    });
</script>

<main 
    id="content" 
    class:drag-active={isDraggingOver}
>
    {#if currentNotePath}
        <div class="global-zoom-controls">
            <button type="button" onclick={zoomOut} disabled={globalZoom <= MIN_GLOBAL_ZOOM}>−</button>
            <span>{Math.round(globalZoom * 100)}%</span>
            <button type="button" onclick={zoomIn} disabled={globalZoom >= MAX_GLOBAL_ZOOM}>+</button>
            <button 
                type="button" 
                class="preview-toggle-btn" 
                onclick={() => showMarkdownAll = !showMarkdownAll}
                title={showMarkdownAll ? 'Switch to edit mode' : 'Preview as rendered markdown'}
            >
                {showMarkdownAll ? '✏️' : '📖'}
            </button>
        </div>

        <div class="zoom-surface" style:zoom={globalZoom}>
            {#if currentNoteKind === 'plainNote'}
                <PlainNoteEditor notePath={currentNotePath} {showMarkdownAll} />
            {:else if currentNoteKind === 'pdfNote'}
                <PdfNoteEditor notePath={currentNotePath} {showMarkdownAll} zoom={globalZoom} />
            {/if}
        </div>
    {:else}
        <div class="placeholder-dropzone">
            <div class="dropzone-icon">📄</div>
            <p>No note loaded.</p>
            <p class="sub-text">Open or create a note in the sidebar, or <strong>drag and drop a PDF file here</strong> to create a new PDF note.</p>
        </div>
    {/if}
</main>

<style>
    #content {
        height: 100%;
        padding: 40px 20px;
        overflow-y: auto;
        overflow-x: auto;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        box-sizing: border-box;
        transition: background-color 0.2s ease, outline 0.2s ease;
    }

    #content.drag-active {
        background-color: #f0f7ff;
        outline: 2px dashed #007bff;
        outline-offset: -10px;
    }

    .zoom-surface {
        width: fit-content;
        min-width: 100%;
        margin: 0 auto;
    }

    .global-zoom-controls {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 120;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #d6d6d6;
        border-radius: 10px;
        padding: 6px 10px;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
    }

    .global-zoom-controls button {
        width: 30px;
        height: 30px;
        border: 1px solid #c6c6c6;
        border-radius: 6px;
        background: #f5f7fb;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
    }
    .global-zoom-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
    .global-zoom-controls span { min-width: 52px; text-align: center; font-size: 13px; font-weight: 600; color: #36414d; }
    .preview-toggle-btn { display: flex; align-items: center; justify-content: center; font-size: 14px; }
    
    .placeholder-dropzone { 
        align-self: center;
        text-align: center; 
        color: #555; 
        margin-top: 15vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px;
    }
    .dropzone-icon {
        font-size: 4rem;
        opacity: 0.7;
        margin-bottom: 10px;
    }
    .sub-text { font-size: 0.95rem; color: #777; max-width: 460px; line-height: 1.5; }
</style>
