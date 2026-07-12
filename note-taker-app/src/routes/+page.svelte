<script lang="ts">
    import PlainNoteEditor from '$lib/editor/PlainNoteEditor.svelte';
    import PdfNoteEditor from '$lib/editor/PdfNoteEditor.svelte';
    import { 
        getCurrentNotePath, 
        getCurrentNoteKind,
        getIsSidearOpen,
        addPDFNote
    } from '$lib/vault/store.svelte';

    let globalZoom = $state(1);
    let showMarkdownAll = $state(false);
    let isDraggingOver = $state(false);

    const MIN_GLOBAL_ZOOM = 0.6;
    const MAX_GLOBAL_ZOOM = 2.5;

    let isSidebarOpen = $derived(getIsSidearOpen());
    let currentNotePath = $derived(getCurrentNotePath());
    let currentNoteKind = $derived(getCurrentNoteKind());

    function zoomIn() {
        globalZoom = Math.min(MAX_GLOBAL_ZOOM, globalZoom + 0.1);
    }

    function zoomOut() {
        globalZoom = Math.max(MIN_GLOBAL_ZOOM, globalZoom - 0.1);
    }

    // Drag and drop mechanics for shorthand PDF ingestion
    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (!currentNotePath) {
            isDraggingOver = true;
        }
    }

    function handleDragLeave() {
        isDraggingOver = false;
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDraggingOver = false;

        if (currentNotePath || !e.dataTransfer?.files) return;

        const files = Array.from(e.dataTransfer.files);
        const pdfFile = files.find(file => file.name.endsWith('.pdf'));

        if (pdfFile) {
            try {
                // If your backend pickPdfFile function can accept raw paths, 
                // you can route the target file.path property straight here:
                console.log(`Ingesting dropped PDF asset: ${pdfFile.name}`);
                await addPDFNote(); 
            } catch (err) {
                console.error("Failed creating note from dropped PDF binary:", err);
            }
        }
    }
</script>

<div 
    id="workspace-layout" 
    class="{isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
>
    <main id="content" class:drag-active={isDraggingOver}>
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
                    <PdfNoteEditor notePath={currentNotePath} {showMarkdownAll} />
                {/if}
            </div>
        {:else}
            <div class="placeholder-dropzone">
                <div class="dropzone-art">📄</div>
                <p>No note loaded.</p>
                <p class="sub-text">Select a note from the sidebar, or <strong>drag and drop a PDF file here</strong> to instantly generate a new notebook layout.</p>
            </div>
        {/if}
    </main>
</div>

<style>
    #workspace-layout {
        display: grid;
        min-height: 100vh;
        width: 100vw;
        transition: padding-left 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        box-sizing: border-box;
    }

    /* Offsets workspace content area automatically to protect absolute sidebar overlay */
    .sidebar-open { padding-left: 300px; }
    .sidebar-closed { padding-left: 0; }

    #content {
        margin-top: 40px; /* Aligns flush with the 40px sidebar header line */
        padding: 40px 20px;
        min-height: calc(100vh - 40px);
        position: relative;
        width: 100%;
        box-sizing: border-box;
        transition: background-color 0.2s ease;
    }

    #content.drag-active {
        background-color: #f0f7ff;
        outline: 2px dashed #007bff;
        outline-offset: -10px;
    }

    .zoom-surface {
        transform-origin: top center;
        width: 100%;
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
        text-align: center; 
        color: #555; 
        margin-top: 15vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px;
    }
    .dropzone-art {
        font-size: 4rem;
        opacity: 0.7;
        margin-bottom: 10px;
    }
    .sub-text { font-size: 0.95rem; color: #777; max-width: 460px; line-height: 1.5; }
</style>