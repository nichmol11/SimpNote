<!-- src/lib/editor/MarkdownEditor.svelte -->

<script lang="ts">
    import { marked } from 'marked';

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
        
        // 🎯 DEBUG LOG 1: Check if the textarea is capturing your keystroke
        console.log("[MarkdownEditor Core] Textarea changed! Current text:", target.value);
        
        // Pass the value up to the parent wrapper callback
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