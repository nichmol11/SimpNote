<!-- src/lib/editor/PageRow.svelte -->
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

  marked.setOptions({ gfm: true, breaks: true });

  function renderMarkdown(text: string): string {
    if (!text) return '';
    return marked.parse(text) as string;
  }

  onMount(() => {
    renderPdf();
  });

  async function renderPdf() {
    const pixelRatio = window.devicePixelRatio || 1;
    const maxDisplayWidth = 550;

    const naturalViewport = pageProxy.getViewport({ scale: 1 });
    const displayScale = maxDisplayWidth / naturalViewport.width;
    const renderScale = displayScale * pixelRatio;

    const viewport = pageProxy.getViewport({ scale: renderScale });
    const context = canvas.getContext('2d');
    displayWidth = viewport.width / pixelRatio;
    displayHeight = viewport.height / pixelRatio;

    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;

      await pageProxy.render({
        canvas,
        canvasContext: context,
        viewport
      }).promise;
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onNoteUpdate(target.value);
  }
</script>

<section class="page-row">
  <div class="pdf-viewer">
    <div class="pdf-container" role="img" aria-label="PDF page {id}">
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