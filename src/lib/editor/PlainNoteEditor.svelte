<!-- src/lib/editor/PlainNoteEditor.svelte -->
<script lang="ts">
    import MarkdownEditor from '../editor/MarkdownEditor.svelte'; 
    import { 
        getCurrentNoteContent, 
        savePlainNote, 
		updateCurrentNoteContent

    } from '$lib/vault/backend/store.svelte';

    interface Props {
        notePath: string;
        showMarkdownAll: boolean;
    }

    let { notePath, showMarkdownAll }: Props = $props();

    let content = $state(typeof getCurrentNoteContent() === 'string' ? getCurrentNoteContent() as string : '');
    let autoSaveTimer: ReturnType<typeof setTimeout>;

    function handleInput(updatedText: string) {
        content = updatedText;
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(async () => {
            try {
                console.log(`[PlainNoteEditor] Triggering autosave for file: ${notePath}`);
                updateCurrentNoteContent(content);
                await savePlainNote(notePath, content);
            } catch (err) {
                console.error('[PlainNoteEditor] Autosave error:', err);
            }
        }, 1500);
    }
</script>

<section class="text-note-layout">
    <MarkdownEditor 
        value={content} 
        showMarkdown={showMarkdownAll} 
        placeholder="Write your markdown note here..."
        onContentInput={handleInput}
    />
</section>

<style>
    .text-note-layout {
        display: block;
        margin: 0 auto 50px auto;
        width: min(1120px, calc(100vw - 120px));
        min-height: 720px;
    }
</style>