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
    let currentFileName = $state<string>("");
    let isNoteLoaded = $state(false);
    let hasBeenSaved = $state(false);
    let isSaving = $state(false);
    let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

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
        if (!isNoteLoaded || !currentFileName) return;

        const baseName = currentFileName.replace(/\.pdf$/i, '');
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
                await loadNoteData(jsonName);
                
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
    async function loadNoteData(jsonName: string) {
        console.log("loadNoteData called with:", jsonName);
        try {
            const project = await loadNote(jsonName);
            console.log("Project loaded:", project.fileName);
            currentFileName = project.fileName;

            // Update navbar display
            navbarContext?.setCurrentFileName?.(project.fileName);

            // Render PDF
            await renderPDF(project.pdfData, project.notes);
            isNoteLoaded = true;

            // Enable autosave for existing projects (they already have a save location)
            hasBeenSaved = true;
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
        if (!isNoteLoaded || !currentFileName) {
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
        currentFileName = "";
        isNoteLoaded = false;
        hasBeenSaved = false;

        // Update navbar display
        navbarContext?.setCurrentFileName?.("No PDF selected");
    }

    onMount(() => {
        if (navbarContext) {
            // Updated: handleFileSelected no longer takes an event, it triggers the dialog itself
            navbarContext.setHandlers(handleFileSelected, handleRemovePDF, handleSave);
            // Register loadNoteData so Sidebar can open notes
            navbarContext.setLoadNote(loadNoteData);
        }
    });
</script>

<div id="content">
    {#each pages as item (item.id)} 
        <PageRow 
            id={item.id} 
            bind:note={item.note} 
            pageProxy={item.pageProxy} 
        />
    {:else}
        <div class="placeholder">
            <p>No PDF loaded.</p>
            <p class="sub-text">Import a PDF or open a project from the sidebar.</p>
        </div>
    {/each}
</div>

<style>
    #content {
        margin-top: 80px;
        padding: 20px;
        min-height: calc(100vh - 80px);
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
