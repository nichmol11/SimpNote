<script lang="ts">
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { onMount } from 'svelte';
    import sidebarIcon from '$lib/img/sidebar-icon.svg';
    import appIcon from '$lib/img/icon_64x64.png';
    import saveIcon from '$lib/img/save-icon.svg';
    import saveEnabledIcon from '$lib/img/save-enabled-icon.svg';

    // Define props
    export let onUpload: () => void;
    export let onCreateTextNote: () => void;
    export let onRemove: () => void;
    export let toggleSidebar: () => void;
    export let onSave: () => void;
    export let isSaving: boolean = false;
    export let hasAutosaveEnabled: boolean = false;
    export let currentFileName: string = "No note selected";
    let isWindowMaximized = false;
    let isWindowFullscreen = false;

    function handleUploadClick() {
        onUpload();
    }

    function removePDF() {
        onRemove();
    }

    function createTextNote() {
        onCreateTextNote();
    }

    async function updateWindowState() {
        try {
            const appWindow = getCurrentWindow();
            isWindowMaximized = await appWindow.isMaximized();
            isWindowFullscreen = await appWindow.isFullscreen();
        } catch (error) {
            console.error('Failed to update window state:', error);
        }
    }

    async function handleMinimizeOrRestore() {
        try {
            const appWindow = getCurrentWindow();
            if (isWindowFullscreen) {
                await appWindow.setFullscreen(false);
            } else {
                await appWindow.minimize();
            }
            await updateWindowState();
        } catch (error) {
            console.error('Failed to minimize or restore window:', error);
        }
    }

    async function toggleMaximizeWindow() {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.toggleMaximize();
            await updateWindowState();
        } catch (error) {
            console.error('Failed to maximize/restore window:', error);
        }
    }

    async function closeWindow() {
        try {
            await getCurrentWindow().close();
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    }

    onMount(() => {
        const appWindow = getCurrentWindow();
        void updateWindowState();

        let unlistenResize: (() => void) | undefined;
        appWindow.onResized(() => {
            void updateWindowState();
        }).then((dispose) => {
            unlistenResize = dispose;
        }).catch((error) => {
            console.error('Failed to listen for resize events:', error);
        });

        return () => {
            unlistenResize?.();
        };
    });
</script>


<nav class="navbar">
    <div class="nav-content" data-tauri-drag-region>
        <button id="sidebar-toggle" data-tauri-drag-region="false" on:click={toggleSidebar} title="Toggle Sidebar">
            <img src={sidebarIcon} alt="sidebar button"/>
        </button>
        
        <span class="logo"><img src={appIcon} alt="Note Taker App Logo"/></span>
        
        <div class="file-section" data-tauri-drag-region="false">
            {#if currentFileName === "No note selected"}
                <button class="custom-upload-btn" on:click={handleUploadClick}>Import PDF</button>
                <button class="custom-upload-btn text-note-btn" on:click={createTextNote}>New Text Note</button>
            {:else}
                <button class="custom-upload-btn disabled" disabled>Import PDF</button>
                <button class="custom-upload-btn text-note-btn disabled" disabled>New Text Note</button>
            {/if}
            
            <span class="file-name">{currentFileName}</span>
            
            {#if currentFileName !== "No note selected"}
                <button class="remove-btn" on:click={removePDF}>
                    {#if hasAutosaveEnabled}
                        Close note
                    {:else}
                        Remove note
                    {/if}
                </button>
            {/if}
        </div>
        
        <div class="navigation-options" data-tauri-drag-region="false">
            {#if isSaving}
                <span class="save-indicator">Saving...</span>
            {/if}
            <button
                type="button"
                class="save-btn"
                class:autosave-enabled={hasAutosaveEnabled}
                on:click={onSave}
                title={hasAutosaveEnabled ? "Autosave enabled" : "Save notes"}
            >
                <img
                    src={hasAutosaveEnabled ? saveEnabledIcon : saveIcon}
                    alt={hasAutosaveEnabled ? "autosave enabled" : "save button"}
                />
            </button>
        </div>

        <div class="drag-region"></div>

        <div class="window-controls" aria-label="Window controls" data-tauri-drag-region="false">
            <button
                type="button"
                class="window-btn utility"
                on:click={handleMinimizeOrRestore}
                title={isWindowFullscreen ? "Restore from fullscreen" : "Minimize"}
            >
                {isWindowFullscreen ? "❐" : "−"}
            </button>
            <button
                type="button"
                class="window-btn utility"
                on:click={toggleMaximizeWindow}
                title={isWindowMaximized ? "Restore" : "Maximize"}
            >
                {isWindowMaximized ? "❐" : "□"}
            </button>
            <button type="button" class="window-btn close" on:click={closeWindow} title="Close">×</button>
        </div>
    </div>
</nav>


<style>
    .navbar {
        top: 0;
        width: 100%;
        height: 50px;
        position: fixed;
        border-bottom: 1px solid #ddd;
        background-color: white;
        z-index: 100;
        display: flex;
        align-items: center;
    }
    
    .nav-content {
        width: 100%;
        padding: 0 20px;
        display: flex;
        gap: 20px;
        align-items: center;
    }
    
    .logo {
        font-weight: bold; /* Moved from bottom rules for consistency */
    }

    .logo img {
        height: 50px;
    }


    .file-section {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .drag-region {
        flex: 1;
        height: 100%;
        min-width: 40px;
    }
    
    /* Removed #fileInput styles as it is deleted */
    
    .custom-upload-btn {
        display: inline-block;
        height: 35px;
        padding: 8px 16px;
        background-color: #007bff;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
        border: none;
    }
    
    .custom-upload-btn:hover:not(.disabled) {
        background-color: #0056b3;
    }

    .text-note-btn {
        background-color: #198754;
    }

    .text-note-btn:hover:not(.disabled) {
        background-color: #157347;
    }
    
    .custom-upload-btn.disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    .file-name {
        font-size: 14px;
        color: #333;
        min-width: 250px;
        text-align: center;
    }
    
    .remove-btn {
        padding: 8px 16px;
        background-color: #dc3545;
        height: 35px;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    
    .remove-btn:hover {
        background-color: #c82333;
    }
    
    .save-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }

    .save-btn img {
        height: 40px;
        cursor: pointer;
    }

    .save-btn.autosave-enabled img {
        transform: scale(0.95);
    }


    #sidebar-toggle {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }

    #sidebar-toggle img {
        height: 40px;
        cursor: pointer;
    }

    .save-indicator {
        font-size: 12px;
        color: #666;
        animation: pulse 1s ease-in-out infinite;
    }

    .navigation-options {
        display: flex;
        align-items: center;
        gap: 10px;
        height:100%;
    }

    .window-controls {
        border-left: 1px solid #ddd;
        height: 100%;
        padding-left: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .window-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        min-height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        color: #333;
        font-size: 17px;
        line-height: 1;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .window-btn.utility:hover {
        background: #ececec;
    }

    .window-btn.close:hover {
        background: #dc3545;
        color: #fff;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
</style>
