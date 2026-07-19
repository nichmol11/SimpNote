<!-- src/lib/editor/PdfNoteEditor.svelte -->

<script lang="ts">
    import * as pdfjs from 'pdfjs-dist';
    import { untrack } from 'svelte';
    import PageRow from '$lib/editor/PageRow.svelte';
    import { 
        getCurrentNoteContent,
        updateCurrentNoteContent,
        getCurrentPdfBinary, 
        savePDFNote 
    } from '$lib/vault/backend/store.svelte';
    import type { PdfNotes } from '$lib/vault/backend/types';

    // Import the worker URL using Vite's asset bundling query
    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
    
    // Explicitly assign the worker source configuration
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    interface Props {
        notePath: string;
        showMarkdownAll: boolean;
        zoom: number;
    }
    let { notePath, showMarkdownAll, zoom }: Props = $props();

    let pages = $state<{ id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[]>([]);
    let autoSaveTimer: ReturnType<typeof setTimeout>;

    const metaData = $derived(getCurrentNoteContent() as PdfNotes | null);
    const pdfBinary = $derived(getCurrentPdfBinary());

    let lastParsedBinary: ArrayBuffer | null = null;
    let currentParseToken = 0;

    $effect(() => {
        const binary = pdfBinary;
        if (binary && binary !== lastParsedBinary) {
            const meta = untrack(() => metaData);
            lastParsedBinary = binary;
            parsePdfDocument(binary, meta);
        }
    });

    async function parsePdfDocument(arrayBuffer: ArrayBuffer, meta: PdfNotes) {
        const token = ++currentParseToken;
        pages = [];

        try {
            const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const loadedPages: { id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[] = [];
            const pagesRecord = meta?.pages ?? {};

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                if (token !== currentParseToken) return;
                const pageProxy = await pdfDoc.getPage(i);
                const savedText = pagesRecord[String(i)]?.text ?? '';
                loadedPages.push({ id: i, note: savedText, pageProxy });
            }

            if (token !== currentParseToken) return;
            pages = loadedPages;
        } catch (err) {
            console.error("Failed compiling PDF Document layout:", err);
        }
    }
    function handlePageNoteInput(pageId: number, updatedText: string) {
        const targetPage = pages.find(p => p.id === pageId);
        if (targetPage) {
            targetPage.note = updatedText;
            pages = [...pages]; 
        }

        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(async () => {
            if (!metaData) return;

            const updatedMeta: PdfNotes = {
                noteName: metaData.noteName,
                pages: {}
            };

            pages.forEach((p) => {
                if (p.note && p.note.trim().length > 0) {
                    updatedMeta.pages[String(p.id)] = { text: p.note };
                }
            });

            try {
                updateCurrentNoteContent(updatedMeta);
                await savePDFNote(notePath, updatedMeta);
                console.log(`Saved nested note updates to bundle path: ${notePath}`);
            } catch (err) {
                console.error("Autosave step for PDF tracking failed:", err);
            }
        }, 1500);
    }
</script>

<div class="pdf-note-layout">
    {#if pages.length > 0}
        {#each pages as item (item.id)}
    <PageRow 
        id={item.id} 
        note={item.note} 
        pageProxy={item.pageProxy} 
        showMarkdown={showMarkdownAll} 
        zoom={zoom}
        onNoteUpdate={(newText) => handlePageNoteInput(item.id, newText)} 
    />
        {/each}
    {:else}
        <div class="loading-state"><p>Streaming document data blocks...</p></div>
    {/if}
</div>