<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import PageRow from '$lib/PageRow.svelte';
    import Navbar from '$lib/Navbar.svelte';



    // This dynamically finds the worker file within your local project
    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    // State
    let pages: { id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[] = [];

    async function handleFileSelected(e: Event) {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        const arrayBuffer = await file.arrayBuffer();
        
        const pdfDoc = await pdfjs.getDocument(arrayBuffer).promise;
        
        const loadedPages = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageProxy = await pdfDoc.getPage(i);
            loadedPages.push({
                id: i,
                note: "",
                pageProxy: pageProxy
            });
        }
        pages = loadedPages;
    }
</script>

<Navbar onUpload={handleFileSelected} />

<div id="content">
    {#each pages as item (item.id)} 
        <PageRow 
            id={item.id} 
            bind:note={item.note} 
            pageProxy={item.pageProxy} 
        />
    {:else}
        <div class="placeholder">
            <p>No PDF loaded. Use the button in the navbar to start.</p>
        </div>
    {/each}
</div>

<style>
    #content {
        margin-top: 80px; /* Adjust based on navbar height */
        padding: 20px;
    }
    .placeholder {
        text-align: center;
        color: #666;
        margin-top: 100px;
    }
</style>