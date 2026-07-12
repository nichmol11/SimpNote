<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import type { PDFPageProxy } from 'pdfjs-dist';

  interface Props {
    id: number;
    note: string;
    pageProxy: PDFPageProxy;
    showMarkdown: boolean;
    onNoteUpdate: (newText: string) => void;
  }

  let { id, note = $bindable(), pageProxy, showMarkdown, onNoteUpdate }: Props = $props();

  let canvas: HTMLCanvasElement;
  let displayWidth = $state(550);
  let displayHeight = $state(720);

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
    displayWidth = viewport.width / pixelRatio;
    displayHeight = viewport.height / pixelRatio;

    if (context) {
      // Set canvas internal resolution (high res for crisp rendering)
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Set CSS display size (scaled down for proper visual size)
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;

      // 2. Render PDF Page to Canvas
      const renderContext = {
        canvas,
        canvasContext: context,
        viewport: viewport
      };
      await pageProxy.render(renderContext).promise;
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onNoteUpdate(target.value); // Bubbles the change to the parent
  }

</script>

<section class="page-row">
  <div class="pdf-viewer">
    <div
      class="pdf-container"
      role="img"
      aria-label="PDF page {id}"
    >
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
    gap: 30px; 
    margin-bottom: 50px; 
    justify-content: center;
    align-items: flex-start;
    /* background-color: #fafafa; */
  }
  .pdf-viewer {
    flex: 1;
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
    /* Don't use max-width: 100% as it breaks aspect ratio */
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
