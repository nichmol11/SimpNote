<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import PageRow from '$lib/PageRow.svelte';
    import { getContext, onMount } from 'svelte';
    import { saveNote, importPdfFromPath, loadNote, getWorkspacePath } from '$lib/fileSystem'; 
    import { open } from '@tauri-apps/plugin-dialog';

    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    // Get Context at TOP LEVEL
    const navbarContext = getContext<any>('navbar');

    // State
    let pages = $state<{ id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[]>([]);
    let currentPdfFileName = $state<string>("");
    let currentNoteName = $state<string>("");
    let isNoteLoaded = $state(false);
    let hasBeenSaved = $state(false);
    let isSaving = $state(false);
    let globalZoom = $state(1);
    let showMarkdownAll = $state(false);
    let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
    let contentElement: HTMLDivElement;

    const MIN_GLOBAL_ZOOM = 0.6;
    const MAX_GLOBAL_ZOOM = 2.5;
    const GLOBAL_ZOOM_STEP = 0.1;

    // Debounced autosave - triggers 2 seconds after last note change
    function scheduleAutosave() {
        if (!hasBeenSaved || !isNoteLoaded) return;

        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
        }

        autosaveTimeout = setTimeout(async () => {
            await performSave(true);
        }, 2000);
    }

    // Core save logic (used by both manual save and autosave)
    async function performSave(isAutosave: boolean = false) {
        if (!isNoteLoaded || !currentNoteName || !currentPdfFileName) return;

        const baseName = currentNoteName.replace(/\.json$/i, '');
        const notesObject: Record<number, string> = {};

        pages.forEach(p => {
            if (p.note && p.note.trim().length > 0) {
                notesObject[p.id] = p.note;
            }
        });

        try {
            isSaving = true;
            navbarContext?.setIsSaving?.(true);
            await saveNote(baseName, null, notesObject);
            if (!isAutosave) {
                hasBeenSaved = true;
                navbarContext?.setHasAutosaveEnabled?.(true);
            }
        } catch (e) {
            console.error("Save failed:", e);
            if (!isAutosave) {
                alert("Failed to save notes.");
            }
        } finally {
            isSaving = false;
            navbarContext?.setIsSaving?.(false);
        }
    }

    // 1. Handle New PDF Import (Tauri Dialog)
    async function handleFileSelected() {
        try {
            // Default to workspace folder if set
            const workspacePath = getWorkspacePath();

            const selected = await open({
                multiple: false,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: workspacePath || undefined
            });

            if (selected) {
                const sourcePath = selected as string;
                // Import (Copy) the PDF and create JSON
                const jsonName = await importPdfFromPath(sourcePath);
                
                // Immediately load the new project
                await loadNoteData(jsonName, false);
                
                // Refresh sidebar
                if (navbarContext && navbarContext.getRefreshSidebar) {
                    const refreshFn = navbarContext.getRefreshSidebar();
                    if (refreshFn) await refreshFn();
                }
            }
        } catch (e) {
            console.error("Import failed:", e);
            alert("Failed to import PDF. Check console.");
        }
    }

    // Helper to load project data into state
    async function loadNoteData(jsonName: string, isExistingSavedNote: boolean = true) {
        console.log("loadNoteData called with:", jsonName);
        try {
            const project = await loadNote(jsonName);
            console.log("Project loaded:", project.fileName);
            currentPdfFileName = project.fileName;
            currentNoteName = jsonName.replace(/\.json$/i, '');

            // Update navbar display
            navbarContext?.setCurrentFileName?.(currentNoteName);

            // Render PDF
            await renderPDF(project.pdfData, project.notes);
            isNoteLoaded = true;

            // Existing notes load with autosave enabled; newly imported notes require first manual save.
            hasBeenSaved = isExistingSavedNote;
            navbarContext?.setHasAutosaveEnabled?.(isExistingSavedNote);
        } catch (e) {
            console.error("Load failed:", e);
        }
    }

    // Expose load function to sidebar via context (optional, or Sidebar calls store directly)
    // ...

    // 2. Render PDF Logic
    async function renderPDF(arrayBuffer: ArrayBuffer, existingNotes: Record<string, string> = {}) {
        const pdfDoc = await pdfjs.getDocument(arrayBuffer).promise;
        const loadedPages = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageProxy = await pdfDoc.getPage(i);
            loadedPages.push({
                id: i,
                note: existingNotes[i] || "", 
                pageProxy: pageProxy
            });
        }
        pages = loadedPages;
    }

    // 3. Handle Manual Save
    async function handleSave() {
        if (!isNoteLoaded || !currentNoteName) {
            alert("No project loaded to save.");
            return;
        }

        await performSave(false);
        if (hasBeenSaved) {
            alert("Notes saved! Autosave is now enabled.");
        }
    }

    // 4. Watch for note changes and trigger autosave
    // Uses $effect to track changes to the pages array (deeply reactive)
    $effect(() => {
        // Read pages to establish dependency - this tracks all note changes
        const noteSnapshot = pages.map(p => p.note).join('');

        // Only schedule autosave if we have content and have saved before
        if (noteSnapshot && hasBeenSaved) {
            scheduleAutosave();
        }
    });

    function handleRemovePDF() {
        // Clear any pending autosave
        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
            autosaveTimeout = null;
        }

        pages = [];
        currentPdfFileName = "";
        currentNoteName = "";
        isNoteLoaded = false;
        hasBeenSaved = false;

        // Update navbar display
        navbarContext?.setCurrentFileName?.("No PDF selected");
        navbarContext?.setHasAutosaveEnabled?.(false);
    }

    function setGlobalZoom(nextZoom: number) {
        globalZoom = Math.min(MAX_GLOBAL_ZOOM, Math.max(MIN_GLOBAL_ZOOM, nextZoom));
    }

    function zoomInGlobal() {
        setGlobalZoom(globalZoom + GLOBAL_ZOOM_STEP);
    }

    function zoomOutGlobal() {
        setGlobalZoom(globalZoom - GLOBAL_ZOOM_STEP);
    }

    function toggleGlobalPreview() {
        showMarkdownAll = !showMarkdownAll;
    }

    onMount(() => {
        if (navbarContext) {
            // Updated: handleFileSelected no longer takes an event, it triggers the dialog itself
            navbarContext.setHandlers(handleFileSelected, handleRemovePDF, handleSave);
            // Register loadNoteData so Sidebar can open notes
            navbarContext.setLoadNote(loadNoteData);
        }

        const handleGlobalZoomWheel = (event: WheelEvent) => {
            if (!event.ctrlKey) return;

            const targetNode = event.target as Node | null;
            if (contentElement && targetNode && !contentElement.contains(targetNode)) {
                return;
            }

            event.preventDefault();
            if (event.deltaY < 0) {
                zoomInGlobal();
            } else {
                zoomOutGlobal();
            }
        };

        window.addEventListener('wheel', handleGlobalZoomWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleGlobalZoomWheel);
        };
    });
</script>

<div id="content" bind:this={contentElement}>
    {#if pages.length > 0}
        <div class="global-zoom-controls">
            <button type="button" onclick={zoomOutGlobal} title="Zoom out" disabled={globalZoom <= MIN_GLOBAL_ZOOM}>−</button>
            <span>{Math.round(globalZoom * 100)}%</span>
            <button type="button" onclick={zoomInGlobal} title="Zoom in" disabled={globalZoom >= MAX_GLOBAL_ZOOM}>+</button>
            <button
                type="button"
                class="preview-toggle-btn"
                onclick={toggleGlobalPreview}
                title={showMarkdownAll ? "Switch all notes to edit mode" : "Preview all notes as markdown"}
            >
                {showMarkdownAll ? "✏️" : "📖"}
            </button>
        </div>
    {/if}

    <div class="zoom-surface" style:zoom={globalZoom}>
    {#each pages as item (item.id)} 
        <PageRow 
            id={item.id} 
            bind:note={item.note} 
            pageProxy={item.pageProxy} 
            showMarkdown={showMarkdownAll}
        />
    {:else}
        <div class="placeholder">
            <p>No PDF loaded.</p>
            <p class="sub-text">Import a PDF or open a project from the sidebar.</p>
        </div>
    {/each}
    </div>
</div>

<style>
    #content {
        margin-top: 80px;
        padding: 20px;
        min-height: calc(100vh - 80px);
        position: relative;
    }

    .zoom-surface {
        transform-origin: top center;
    }

    .global-zoom-controls {
        position: fixed;
        right: 28px;
        top: 88px;
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

    .global-zoom-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .global-zoom-controls span {
        min-width: 52px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        color: #36414d;
    }

    .preview-toggle-btn {
        height: 30px;
        border: 1px solid #c6c6c6;
        border-radius: 6px;
        background: #f5f7fb;
        justify-content: center;
        cursor: pointer;
        padding-bottom: 4px;
        font-size: 12px;
        font-weight: 600;
        color: #36414d;
    }

    .placeholder {
        text-align: center;
        color: #666;
        margin-top: 100px;
    }
    .sub-text {
        font-size: 0.9rem;
        color: #888;
        margin-top: 10px;
    }
</style>
