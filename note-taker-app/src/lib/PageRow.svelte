<script lang="ts">
    //'Export' to define props (inputs) for this component
    export let id: number;
    export let note: string;
</script>

<section class="page-row">
    <div class="pdf-viewer">
        <div class="canvas">PDF Page {id}</div>
    </div>

    <div class="editor">
        <textarea bind:value={note}></textarea>
    </div>
</section>

<style>
    .page-row {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
    }
    .pdf-viewer {
        flex: 1;
        aspect-ratio: 8.5/11;
        background: white;
        border: 1px solid grey;
    }
    .editor {
        flex: 1;
    }
    textarea {
        width: 100%;
        height: 100%;
        min-height: 300px;
    }
</style>