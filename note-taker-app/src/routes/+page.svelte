<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import PageRow from '$lib/PageRow.svelte';
    import { getContext, onMount } from 'svelte';
    import { saveNote, importPdfFromPath, loadNote } from '$lib/fileSystem'; 
    import { open } from '@tauri-apps/plugin-dialog';

    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    // Get Context at TOP LEVEL
    const navbarContext = getContext<any>('navbar');

    // State
    let pages = $state<{ id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[]>([]);
    let currentFileName = $state<string>("");
    let isNoteLoaded = $state(false);

    // 1. Handle New PDF Import (Tauri Dialog)
    async function handleFileSelected() {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'PDF', extensions: ['pdf'] }]
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
        try {
            const project = await loadNote(jsonName);
            currentFileName = project.fileName;
            
            // Render PDF
            await renderPDF(project.pdfData, project.notes);
            isNoteLoaded = true;
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

    // 3. Handle Save
    async function handleSave() {
        if (!isNoteLoaded || !currentFileName) {
            alert("No project loaded to save.");
            return;
        }

        const baseName = currentFileName.replace(/\.pdf$/i, '');
        const notesObject: Record<number, string> = {};
        
        pages.forEach(p => {
            if (p.note && p.note.trim().length > 0) {
                notesObject[p.id] = p.note;
            }
        });

        try {
            // Pass null for PDF data because we already copied the file during import!
            // We only need to save the updated JSON notes.
            await saveNote(baseName, null, notesObject);
            alert(`Notes saved!`);
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save notes.");
        }
    }

    function handleRemovePDF() {
        pages = [];
        currentFileName = "";
        isNoteLoaded = false;
    }

    onMount(() => {
        if (navbarContext) {
            // Updated: handleFileSelected no longer takes an event, it triggers the dialog itself
            navbarContext.setHandlers(handleFileSelected, handleRemovePDF, handleSave);
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
