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
        
        // DEBUG: Keep these for now to track keystrokes
        console.log("[MarkdownEditor] Input captured:", target.value);
        
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

    /* Keep your existing markdown styling overrides here */
    .markdown-preview :global(h1) { font-size: 1.8em; margin: 0.5em 0; font-weight: bold; }
    .markdown-preview :global(p) { margin: 0.5em 0; line-height: 1.6; }
    .markdown-preview :global(code) { background: #e8e8e8; padding: 2px 6px; border-radius: 3px; }
</style>