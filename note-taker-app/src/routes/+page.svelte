<script lang="ts">
    
    // IMPORTS
    import * as pdfjs from 'pdfjs-dist';
    import { marked } from 'marked';
    import PageRow from '$lib/PageRow.svelte';
    import { getContext, onMount } from 'svelte';
    /*import {
        saveNote,
        saveTextNote,
        createTextNote,
        importPdfFromPath,
        loadNote,
        getWorkspacePath
    } from '$lib/vault/fileSystem'; */
    import { open } from '@tauri-apps/plugin-dialog';

    import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    // TEMPORARY — fileSystem.ts console/button testing, remove once verified
    import { pickVaultDirectory, getStoredVaultPath, storeVaultPath } from '$lib/vault/fileSystem';

    // @ts-ignore - temporary console testing only
    window.testFns = { pickVaultDirectory, getStoredVaultPath, storeVaultPath };

    async function testPick() {
        const path = await pickVaultDirectory();
        console.log('Picked:', path);
    }

    async function testGetStored() {
        const path = await getStoredVaultPath();
        console.log('Stored (verified):', path);
    }

    async function testStore() {
        await storeVaultPath('/home/nichmol/Documents/Note-Taker-App/Vault Test');
        console.log('Stored a test path');
    }
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    const navbarContext = getContext<any>('navbar');

    type NoteMode = 'none' | 'pdf' | 'text';

    let noteMode = $state<NoteMode>('none');
    let pages = $state<{ id: number; note: string; pageProxy: pdfjs.PDFPageProxy }[]>([]);
    let textNoteContent = $state('');
    let currentPdfFileName = $state<string>('');
    let currentNoteEntry = $state<string>('');
    let currentDisplayName = $state<string>('');
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

    function renderMarkdown(text: string): string {
        if (!text) return '';
        return marked.parse(text) as string;
    }

    function scheduleAutosave() {
        if (!hasBeenSaved || !isNoteLoaded) return;

        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
        }

        autosaveTimeout = setTimeout(async () => {
            await performSave(true);
        }, 2000);
    }

    async function performSave(isAutosave: boolean = false) {
        if (!isNoteLoaded || !currentNoteEntry) return;

        try {
            isSaving = true;
            navbarContext?.setIsSaving?.(true);

            if (noteMode === 'pdf') {
                if (!currentPdfFileName) return;
                const baseName = currentNoteEntry.replace(/\.json$/i, '');
                const notesObject: Record<number, string> = {};
                pages.forEach((p) => {
                    if (p.note && p.note.trim().length > 0) {
                        notesObject[p.id] = p.note;
                    }
                });
                await saveNote(baseName, currentPdfFileName, null, notesObject);
            } else if (noteMode === 'text') {
                await saveTextNote(currentNoteEntry, textNoteContent);
            }

            if (!isAutosave) {
                hasBeenSaved = true;
                navbarContext?.setHasAutosaveEnabled?.(true);
            }
        } catch (e) {
            console.error('Save failed:', e);
            if (!isAutosave) {
                alert('Failed to save note.');
            }
        } finally {
            isSaving = false;
            navbarContext?.setIsSaving?.(false);
        }
    }

    async function handleFileSelected() {
        try {
            const workspacePath = getWorkspacePath();
            const selected = await open({
                multiple: false,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: workspacePath || undefined
            });

            if (selected) {
                const sourcePath = selected as string;
                const jsonName = await importPdfFromPath(sourcePath);
                await loadNoteData(jsonName, false);

                if (navbarContext && navbarContext.getRefreshSidebar) {
                    const refreshFn = navbarContext.getRefreshSidebar();
                    if (refreshFn) await refreshFn();
                }
            }
        } catch (e) {
            console.error('Import failed:', e);
            alert('Failed to import PDF. Check console.');
        }
    }

    async function handleCreateTextNote() {
        try {
            const fileName = await createTextNote();
            await loadNoteData(fileName, true);

            if (navbarContext && navbarContext.getRefreshSidebar) {
                const refreshFn = navbarContext.getRefreshSidebar();
                if (refreshFn) await refreshFn();
            }
        } catch (e) {
            console.error('Create text note failed:', e);
            alert('Failed to create text note. Check console.');
        }
    }

    async function loadNoteData(fileName: string, isExistingSavedNote: boolean = true) {
        try {
            const project = await loadNote(fileName);

            currentNoteEntry = fileName;
            currentDisplayName = fileName.replace(/\.(json|md)$/i, '');
            navbarContext?.setCurrentFileName?.(currentDisplayName);

            if (project.noteType === 'pdf') {
                noteMode = 'pdf';
                currentPdfFileName = project.fileName;
                textNoteContent = '';
                await renderPDF(project.pdfData, project.notes);
            } else {
                noteMode = 'text';
                currentPdfFileName = '';
                pages = [];
                textNoteContent = project.markdown || '';
            }

            isNoteLoaded = true;
            showMarkdownAll = false;
            hasBeenSaved = isExistingSavedNote;
            navbarContext?.setHasAutosaveEnabled?.(isExistingSavedNote);
        } catch (e) {
            console.error('Load failed:', e);
        }
    }

    function handleNoteRenamed(oldName: string, newName: string) {
        if (currentNoteEntry !== oldName) return;

        currentNoteEntry = newName;
        currentDisplayName = newName.replace(/\.(json|md)$/i, '');
        navbarContext?.setCurrentFileName?.(currentDisplayName);
    }

    async function renderPDF(arrayBuffer: ArrayBuffer, existingNotes: Record<string, string> = {}) {
        const pdfDoc = await pdfjs.getDocument(arrayBuffer).promise;
        const loadedPages = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageProxy = await pdfDoc.getPage(i);
            loadedPages.push({
                id: i,
                note: existingNotes[i] || '',
                pageProxy: pageProxy
            });
        }
        pages = loadedPages;
    }

    async function handleSave() {
        if (!isNoteLoaded || !currentNoteEntry) {
            alert('No note loaded to save.');
            return;
        }

        await performSave(false);
        if (hasBeenSaved) {
            alert('Note saved! Autosave is now enabled.');
        }
    }

    $effect(() => {
        let contentSnapshot = '';

        if (noteMode === 'pdf') {
            contentSnapshot = pages.map((p) => p.note).join('');
        } else if (noteMode === 'text') {
            contentSnapshot = textNoteContent;
        }

        if (contentSnapshot && hasBeenSaved) {
            scheduleAutosave();
        }
    });

    function handleRemoveNote() {
        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
            autosaveTimeout = null;
        }

        noteMode = 'none';
        pages = [];
        textNoteContent = '';
        currentPdfFileName = '';
        currentNoteEntry = '';
        currentDisplayName = '';
        isNoteLoaded = false;
        hasBeenSaved = false;
        showMarkdownAll = false;

        navbarContext?.setCurrentFileName?.('No note selected');
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
            navbarContext.setHandlers(handleFileSelected, handleCreateTextNote, handleRemoveNote, handleSave);
            navbarContext.setLoadNote(loadNoteData);
            navbarContext.setRenameHandler(handleNoteRenamed);
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
<!-- TEMPORARY test buttons — remove once verified
<div style="position: fixed; top: 0; left: 0; z-index: 9999; background: white; padding: 8px;">
    <button onclick={testPick}>Test pickVaultDirectory</button>
    <button onclick={testGetStored}>Test getStoredVaultPath</button>
    <button onclick={testStore}>Test storeVaultPath</button>
</div> -->

<div id="content" bind:this={contentElement}>
    {#if noteMode !== 'none'}
        <div class="global-zoom-controls">
            <button type="button" onclick={zoomOutGlobal} title="Zoom out" disabled={globalZoom <= MIN_GLOBAL_ZOOM}>−</button>
            <span>{Math.round(globalZoom * 100)}%</span>
            <button type="button" onclick={zoomInGlobal} title="Zoom in" disabled={globalZoom >= MAX_GLOBAL_ZOOM}>+</button>
            <button
                type="button"
                class="preview-toggle-btn"
                onclick={toggleGlobalPreview}
                title={showMarkdownAll ? 'Switch note to edit mode' : 'Preview note as markdown'}
            >
                {showMarkdownAll ? '✏️' : '📖'}
            </button>
        </div>
    {/if}

    <div class="zoom-surface" style:zoom={globalZoom}>
        {#if noteMode === 'pdf' && pages.length > 0}
            {#each pages as item (item.id)}
                <PageRow id={item.id} bind:note={item.note} pageProxy={item.pageProxy} showMarkdown={showMarkdownAll} />
            {/each}
        {:else if noteMode === 'text'}
            <section class="text-note-layout">
                <div class="editor text-note-editor">
                    {#if showMarkdownAll}
                        <div class="markdown-preview">
                            {@html renderMarkdown(textNoteContent)}
                        </div>
                    {:else}
                        <textarea bind:value={textNoteContent} placeholder="Write your note here..."></textarea>
                    {/if}
                </div>
            </section>
        {:else}
            <div class="placeholder">
                <p>No note loaded.</p>
                <p class="sub-text">Import a PDF, create a text note, or open a note from the sidebar.</p>
            </div>
        {/if}
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

    .text-note-layout {
        display: block;
        margin: 0 auto 50px auto;
        width: min(1120px, calc(100vw - 120px));
    }

    .text-note-editor {
        width: 100%;
        min-height: 720px;
    }

    .editor {
        display: flex;
        flex-direction: column;
    }

    textarea {
        width: 100%;
        height: 100%;
        min-height: 100%;
        box-sizing: border-box;
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: 'Inter', sans-serif;
        resize: vertical;
        flex: 1;
    }

    .markdown-preview {
        width: 100%;
        height: 100%;
        min-height: 100%;
        box-sizing: border-box;
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fafafa;
        overflow-y: auto;
        flex: 1;
    }

    .markdown-preview :global(h1) { font-size: 1.8em; margin: 0.5em 0; font-weight: bold; }
    .markdown-preview :global(h2) { font-size: 1.5em; margin: 0.5em 0; font-weight: bold; }
    .markdown-preview :global(h3) { font-size: 1.2em; margin: 0.5em 0; font-weight: bold; }
    .markdown-preview :global(p) { margin: 0.5em 0; line-height: 1.6; }
    .markdown-preview :global(ul) { margin: 0.5em 0; padding-left: 1.5em; list-style-type: disc; }
    .markdown-preview :global(ol) { margin: 0.5em 0; padding-left: 1.5em; list-style-type: decimal; }
    .markdown-preview :global(li) { margin: 0.25em 0; display: list-item; }
    .markdown-preview :global(table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
    .markdown-preview :global(th), .markdown-preview :global(td) { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    .markdown-preview :global(th) { background: #f0f0f0; font-weight: bold; }
    .markdown-preview :global(tr:nth-child(even)) { background: #fafafa; }
    .markdown-preview :global(code) { background: #e8e8e8; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .markdown-preview :global(pre) { background: #e8e8e8; padding: 12px; border-radius: 4px; overflow-x: auto; }
    .markdown-preview :global(pre code) { background: none; padding: 0; }
    .markdown-preview :global(blockquote) { border-left: 3px solid #ccc; margin: 0.5em 0; padding-left: 1em; color: #666; }
    .markdown-preview :global(a) { color: #007bff; }
    .markdown-preview :global(strong) { font-weight: bold; }
    .markdown-preview :global(em) { font-style: italic; }

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
