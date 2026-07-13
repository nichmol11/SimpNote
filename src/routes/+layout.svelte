<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import './layout.css';
    import Sidebar from '$lib/ui/Sidebar.svelte';
    import Navbar from '$lib/ui/Navbar.svelte';
    import { onMount, setContext } from 'svelte';
    import { restoreVault, getIsRestoring, getIsSidearOpen } from '$lib/vault/backend/store.svelte';

    const { children } = $props();

    onMount(() => {
        restoreVault();
    })

    let isSidebarOpen = $derived(getIsSidearOpen());
    let isSaving = $state(false);
    let hasAutosaveEnabled = $state(false);
    let currentFileName = $state("No note selected");
    let onUpload = $state<() => void>(() => {});
    let onCreateTextNote = $state<() => void>(() => {});
    let onRemove = $state<() => void>(() => {});
    let refreshSidebar = $state<() => void>(() => {});
    let onLoadNote = $state<(jsonName: string) => Promise<void>>(async () => {});
    let onRenameNote = $state<(oldName: string, newName: string) => void>(() => {});
    let onSave = $state<() => void>(() => {});

    setContext('navbar', {
        setHandlers: (
            uploadHandler: () => void,
            createTextNoteHandler: () => void,
            removeHandler: () => void,
            saveHandler: () => void
        ) => {
            onUpload = uploadHandler;
            onCreateTextNote = createTextNoteHandler;
            onRemove = removeHandler;
            onSave = saveHandler;
        },
        setRefreshSidebar: (refreshFn: () => void) => {
            refreshSidebar = refreshFn;
        },
        getRefreshSidebar: () => refreshSidebar,
        setIsSaving: (saving: boolean) => {
            isSaving = saving;
        },
        setHasAutosaveEnabled: (enabled: boolean) => {
            hasAutosaveEnabled = enabled;
        },
        setLoadNote: (loadFn: (jsonName: string) => Promise<void>) => {
            onLoadNote = loadFn;
        },
        getLoadNote: () => onLoadNote,
        setRenameHandler: (renameHandler: (oldName: string, newName: string) => void) => {
            onRenameNote = renameHandler;
        },
        getRenameHandler: () => onRenameNote,
        setCurrentFileName: (name: string) => {
            currentFileName = name;
        }
    });
</script>

<div class="app-shell">
    <Navbar/>
    <div class="app-body" class:sidebar-closed={!isSidebarOpen}>
        <Sidebar/>
        <main class="app-main">
            {@render children()}
        </main>
    </div>
</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        overflow: hidden;
    }

    .app-shell {
        height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .app-body {
        flex: 1;
        display: grid;
        grid-template-columns: 300px 1fr;
        min-height: 0;
        overflow: hidden;
    }

    .app-body.sidebar-closed {
        grid-template-columns: 0px 1fr;
    }

    .app-main {
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        position: relative;
    }
</style>