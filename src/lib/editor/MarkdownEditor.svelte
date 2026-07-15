<!-- src/lib/editor/MarkdownEditor.svelte -->
<script lang="ts">
    import { marked } from 'marked';

    // Configure marked for GFM (tables, etc.)
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    interface Props {
        value: string;
        showMarkdown: boolean;
        placeholder?: string;
        onContentInput: (newValue: string) => void;
    }

    let { 
        value, 
        showMarkdown, 
        placeholder = "Write your note here...", 
        onContentInput 
    }: Props = $props();

    function renderMarkdown(text: string): string {
        if (!text) return '';
        return marked.parse(text) as string;
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        onContentInput(target.value);
    }

</script>

<div class="markdown-editor-pane">
    {#if showMarkdown}
        <div class="markdown-preview">
            {@html renderMarkdown(value)}
        </div>
    {:else}
        <textarea 
            {value} 
            oninput={handleInput} 
            {placeholder}
        ></textarea>
    {/if}
</div>

<style>
    .markdown-editor-pane {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    textarea {
        width: 100%;
        height: 100%;
        min-height: 1000px;
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
        min-height: 1000px;
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