<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import PageRow from '$lib/PageRow.svelte';
    import { getContext, onMount } from 'svelte';
    import { saveProject } from '$lib/fileSystem'; // You need to implement this in fileSystem.ts

    // Optimize worker import
    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    // State
    let pages = $state<{ id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[]>([]);
    let currentFileName = $state<string>("");
    let isProjectLoaded = $state(false);

    // 1. Handle New PDF Upload (Import)
    async function handleFileSelected(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        currentFileName = file.name;
        
        const arrayBuffer = await file.arrayBuffer();
        await loadPDF(arrayBuffer);
        
        // Save the raw PDF to the project folder immediately so it's safe
        // (Optional: you might want to wait until explicit save)
        isProjectLoaded = true;
    }

    // 2. Load PDF Logic
    async function loadPDF(arrayBuffer: ArrayBuffer, existingNotes: Record<string, string> = {}) {
        const pdfDoc = await pdfjs.getDocument(arrayBuffer).promise;
        const loadedPages = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageProxy = await pdfDoc.getPage(i);
            loadedPages.push({
                id: i,
                note: existingNotes[i] || "", // Load existing note if available
                pageProxy: pageProxy
            });
        }
        pages = loadedPages;
    }

    // 3. Handle Save (Triggered by Navbar)
    async function handleSave() {
        if (!isProjectLoaded || !currentFileName) {
            alert("No project loaded to save.");
            return;
        }

        const baseName = currentFileName.replace(/\.pdf$/i, '');
        
        // Convert array to simple object map: { "1": "note text", "2": "..." }
        const notesObject: Record<number, string> = {};
        let hasNotes = false;
        
        pages.forEach(p => {
            if (p.note && p.note.trim().length > 0) {
                notesObject[p.id] = p.note;
                hasNotes = true;
            }
        });

        try {
            // Save metadata JSON (and optionally PDF if you modify saveProject to handle it)
            // We pass null for PDF data here assuming it's already saved or we only want to update notes
            await saveProject(baseName, null, notesObject);
            alert(`Project "${baseName}" saved successfully!`);
            
            // Refresh sidebar to show the new JSON file
            const navbarContext = getContext<any>('navbar');
            if (navbarContext && navbarContext.getRefreshSidebar) {
                const refreshFn = navbarContext.getRefreshSidebar();
                if (refreshFn) await refreshFn();
            }
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save project. Ensure a local folder is opened in the sidebar.");
        }
    }

    function handleRemovePDF() {
        pages = [];
        currentFileName = "";
        isProjectLoaded = false;
    }

    onMount(() => {
        const navbarContext = getContext<any>('navbar');
        if (navbarContext) {
            // Register handlers: Upload, Remove, Save
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
            <p class="sub-text">Import a PDF or open a previous document from the sidebar.</p>
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
