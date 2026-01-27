<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import type { PDFPageProxy } from 'pdfjs-dist';

  interface Props {
    id: number;
    note: string;
    pageProxy: PDFPageProxy;
  }

  let { id, note = $bindable(), pageProxy }: Props = $props();

  let canvas: HTMLCanvasElement;
  let pdfContainer: HTMLDivElement;
  let showMarkdown = $state(false);

  // Zoom and pan state
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let lastMouseX = 0;
  let lastMouseY = 0;

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  // Configure marked for GFM (tables, etc.)
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  // Render markdown to HTML
  function renderMarkdown(text: string): string {
    if (!text) return '';
    return marked.parse(text) as string;
  }

  // Zoom controls
  function zoomIn() {
    zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
  }

  function zoomOut() {
    zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    // Reset pan if zooming out to 1x or below
    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  // Pan handlers
  function handleMouseDown(e: MouseEvent) {
    if (zoom > 1) {
      isPanning = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      pdfContainer.style.cursor = 'grabbing';
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      panX += deltaX;
      panY += deltaY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  }

  function handleMouseUp() {
    isPanning = false;
    if (pdfContainer) {
      pdfContainer.style.cursor = zoom > 1 ? 'grab' : 'default';
    }
  }

  onMount(() => {
    // Render PDF asynchronously
    renderPdf();
  });

  async function renderPdf() {
    // 1. Determine size with HiDPI support
    const pixelRatio = window.devicePixelRatio || 1;

    // Calculate scale to fit within max display width while rendering at high res
    const maxDisplayWidth = 550; // Max CSS width for display
    const naturalViewport = pageProxy.getViewport({ scale: 1 });
    const displayScale = maxDisplayWidth / naturalViewport.width;
    const renderScale = displayScale * pixelRatio; // Render at higher res for HiDPI

    const viewport = pageProxy.getViewport({ scale: renderScale });
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas internal resolution (high res for crisp rendering)
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Set CSS display size (scaled down for proper visual size)
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;

      // 2. Render PDF Page to Canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await pageProxy.render(renderContext).promise;
    }
  }

</script>

<section class="page-row">
  <div class="pdf-viewer">
    <div class="zoom-controls">
      <button on:click={zoomOut} title="Zoom out" disabled={zoom <= MIN_ZOOM}>−</button>
      <span class="zoom-level">{Math.round(zoom * 100)}%</span>
      <button on:click={zoomIn} title="Zoom in" disabled={zoom >= MAX_ZOOM}>+</button>
      <button on:click={resetZoom} title="Reset zoom" class="reset-btn">Reset</button>
    </div>
    <div
      class="pdf-container"
      bind:this={pdfContainer}
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
      style="cursor: {zoom > 1 ? 'grab' : 'default'};"
      role="img"
      aria-label="PDF page {id}"
    >
      <canvas
        bind:this={canvas}
        style="transform: scale({zoom}) translate({panX / zoom}px, {panY / zoom}px); transform-origin: center center;"
      ></canvas>
    </div>
  </div>

  <div class="editor">
    <div class="editor-header">
      <span class="page-label">Page {id}</span>
      <button
        class="toggle-btn"
        class:active={showMarkdown}
        on:click={() => showMarkdown = !showMarkdown}
        title={showMarkdown ? "Edit markdown" : "Preview markdown"}
      >
        {showMarkdown ? "Edit" : "Preview"}
      </button>
    </div>
    {#if showMarkdown}
      <div class="markdown-preview">
        {@html renderMarkdown(note)}
      </div>
    {:else}
      <textarea bind:value={note} placeholder="Notes for page {id}... (Markdown supported)"></textarea>
    {/if}
  </div>
</section>

<style>

  .page-row {
    display: flex; 
    gap: 30px; 
    margin-bottom: 50px; 
    justify-content: center;
    /* background-color: #fafafa; */
  }
  .pdf-viewer {
    flex: 1;
    max-width: 600px;
    display: flex;
    flex-direction: column;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    justify-content: center;
  }

  .zoom-controls button {
    width: 28px;
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .zoom-controls button:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .zoom-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .zoom-controls .reset-btn {
    width: auto;
    padding: 0 10px;
    font-size: 12px;
  }

  .zoom-level {
    font-size: 12px;
    color: #666;
    min-width: 45px;
    text-align: center;
  }

  .pdf-container {
    overflow: auto;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    max-height: 80vh;
  }

  canvas {
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    border-radius: 4px;
    transition: transform 0.1s ease-out;
    /* Don't use max-width: 100% as it breaks aspect ratio */
  }
  .editor {
    flex: 1;
    max-width: 600px;
    display: flex;
    flex-direction: column;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .page-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .toggle-btn {
    padding: 4px 12px;
    font-size: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: #e5e5e5;
  }

  .toggle-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  textarea {
    width: 100%;
    min-height: 400px;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: 'Inter', sans-serif;
    resize: vertical;
    flex: 1;
  }

  .markdown-preview {
    width: 100%;
    min-height: 400px;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fafafa;
    overflow-y: auto;
    flex: 1;
  }

  /* Basic markdown styling */
  .markdown-preview :global(h1) { font-size: 1.8em; margin: 0.5em 0; font-weight: bold; }
  .markdown-preview :global(h2) { font-size: 1.5em; margin: 0.5em 0; font-weight: bold; }
  .markdown-preview :global(h3) { font-size: 1.2em; margin: 0.5em 0; font-weight: bold; }
  .markdown-preview :global(p) { margin: 0.5em 0; line-height: 1.6; }
  .markdown-preview :global(ul) { margin: 0.5em 0; padding-left: 1.5em; list-style-type: disc; }
  .markdown-preview :global(ol) { margin: 0.5em 0; padding-left: 1.5em; list-style-type: decimal; }
  .markdown-preview :global(li) { margin: 0.25em 0; display: list-item; }

  /* Table styles for GFM tables */
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