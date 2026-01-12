<script lang="ts">
  import { onMount } from 'svelte';
  import type { PDFPageProxy } from 'pdfjs-dist';

  export let id: number;
  export let note: string;
  export let pageProxy: PDFPageProxy;

  let canvas: HTMLCanvasElement;

  onMount(async () => {
    // 1. Determine size
    const viewport = pageProxy.getViewport({ scale: 1.5 });
    const context = canvas.getContext('2d');

    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 2. Render PDF Page to Canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      };
      await pageProxy.render(renderContext).promise;
    }
  });
</script>

<section class="page-row">
  <div class="pdf-viewer">
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="editor">
    <textarea bind:value={note} placeholder="Notes for page {id}..."></textarea>
  </div>
</section>

<style>
  .page-row { 
    display: flex; 
    gap: 30px; 
    margin-bottom: 50px; 
    justify-content: center;
  }
  .pdf-viewer {
    flex: 1;
    max-width: 600px;
  }
  canvas { 
    width: 100%; 
    height: auto;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
    border-radius: 4px;
  }
  .editor { 
    flex: 1; 
    max-width: 600px;
    display: flex;
  }
  textarea { 
    width: 100%; 
    min-height: 400px; 
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: 'Inter', sans-serif;
    resize: vertical;
  }
</style>