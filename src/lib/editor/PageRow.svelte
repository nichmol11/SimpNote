<!-- src/lib/editor/PageRow.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { marked } from 'marked';
    import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';

    interface Props {
        id: number;
        note: string;
        pageProxy: PDFPageProxy;
        showMarkdown: boolean;
        zoom?: number;
        onNoteUpdate: (newText: string) => void;
    }

    let { id, note = $bindable(), pageProxy, showMarkdown, zoom = 1, onNoteUpdate }: Props = $props();

    let canvas: HTMLCanvasElement;
    let containerEl: HTMLDivElement;

    const maxDisplayWidth = 550;
    const naturalViewport = pageProxy.getViewport({ scale: 1 });
    const initialScale = maxDisplayWidth / naturalViewport.width;

    let displayWidth = $state(naturalViewport.width * initialScale);
    let displayHeight = $state(naturalViewport.height * initialScale);

    let isVisible = $state(false);
    let needsRerender = $state(true);
    let lastRenderedZoom = 0;
    let renderTimeout: ReturnType<typeof setTimeout> | null = null;
    let observer: IntersectionObserver | null = null;
    let currentRenderTask: RenderTask | null = null;

    marked.setOptions({ gfm: true, breaks: true });

    function renderMarkdown(text: string): string {
        if (!text) return '';
        return marked.parse(text) as string;
    }

    onMount(() => {
        observer = new IntersectionObserver(
            (entries) => {
                isVisible = entries[0]?.isIntersecting ?? false;
            },
            { rootMargin: '400px 0px' }
        );
        observer.observe(containerEl);
    });

    onDestroy(() => {
        observer?.disconnect();
        if (renderTimeout) clearTimeout(renderTimeout);
        currentRenderTask?.cancel();
    });

    $effect(() => {
        const currentZoom = zoom;
        const visible = isVisible;

        if (currentZoom !== lastRenderedZoom) needsRerender = true;

        if (visible && needsRerender) {
            if (renderTimeout) clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => renderPdf(currentZoom), 250);
        }
    });

    async function renderPdf(zoomFactor: number) {
        if (currentRenderTask) {
            currentRenderTask.cancel();
            currentRenderTask = null;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const cappedZoom = Math.min(zoomFactor, 2.5);

        const displayScale = maxDisplayWidth / naturalViewport.width;
        const renderScale = displayScale * pixelRatio * cappedZoom;

        const viewport = pageProxy.getViewport({ scale: renderScale });
        const context = canvas.getContext('2d');

        displayWidth = viewport.width / (pixelRatio * cappedZoom);
        displayHeight = viewport.height / (pixelRatio * cappedZoom);

        if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;

            try {
                currentRenderTask = pageProxy.render({ canvas, canvasContext: context, viewport });
                await currentRenderTask.promise;
                lastRenderedZoom = zoomFactor;
                needsRerender = false;
            } catch (err: any) {
                if (err?.name === 'RenderingCancelledException') {
                    return;
                }
                console.error(`Failed rendering page ${id}:`, err);
            } finally {
                currentRenderTask = null;
            }
        }
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        onNoteUpdate(target.value);
    }
</script>

<section class="page-row">
    <div class="pdf-viewer">
        <div class="pdf-container" bind:this={containerEl} role="img" aria-label="PDF page {id}">
            <canvas bind:this={canvas}></canvas>
        </div>
    </div>

    <div class="editor" style:width={`${displayWidth}px`} style:min-height={`${displayHeight}px`}>
        {#if showMarkdown}
            <div class="markdown-preview">
                {@html renderMarkdown(note)}
            </div>
        {:else}
            <textarea
                value={note}
                oninput={handleInput}
                placeholder="Notes for page {id}..."
            ></textarea>
        {/if}
    </div>
</section>

<style>
    .page-row {
        display: flex;
        flex-wrap: nowrap;
        gap: 30px;
        margin-bottom: 50px;
        justify-content: center;
        align-items: flex-start;
    }

    .pdf-viewer {
        flex: 0 0 auto;
        max-width: 600px;
        display: flex;
        flex-direction: column;
    }

    .pdf-container {
        display: inline-block;
        width: fit-content;
        height: fit-content;
        margin: 0 auto;
        padding: 0;
        line-height: 0;
        overflow: hidden;
        border: 1px solid #cfcfcf;
        border-radius: 2px;
        background: transparent;
    }

    canvas {
        display: block;
        border-radius: 0;
    }

    .editor {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        box-sizing: border-box;
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
</style>