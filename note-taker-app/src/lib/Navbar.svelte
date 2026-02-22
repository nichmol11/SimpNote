<script lang="ts">
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { onMount } from 'svelte';

    // Define props
    export let onUpload: () => void;
    export let onRemove: () => void;
    export let toggleSidebar: () => void;
    export let onSave: () => void;
    export let isSaving: boolean = false;
    export let hasAutosaveEnabled: boolean = false;
    export let currentFileName: string = "No PDF selected";
    let isWindowMaximized = false;

    function handleUploadClick() {
        onUpload();
    }

    function removePDF() {
        onRemove();
    }

    async function minimizeWindow() {
        try {
            await getCurrentWindow().minimize();
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    }

    async function toggleMaximizeWindow() {
        try {
            const window = getCurrentWindow();
            await window.toggleMaximize();
            isWindowMaximized = await window.isMaximized();
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
        const window = getCurrentWindow();

        const updateWindowState = async () => {
            try {
                isWindowMaximized = await window.isMaximized();
            } catch (error) {
                console.error('Failed to read window maximized state:', error);
            }
        };

        void updateWindowState();
        let unlisten: (() => void) | undefined;
        window.onResized(() => {
            void updateWindowState();
        }).then((dispose) => {
            unlisten = dispose;
        }).catch((error) => {
            console.error('Failed to listen for window resize events:', error);
        });

        return () => {
            unlisten?.();
        };
    });
</script>


<nav class="navbar">
    <div class="nav-content" data-tauri-drag-region>
        <button id="sidebar-toggle" data-tauri-drag-region="false" on:click={toggleSidebar} title="Toggle Sidebar">
            <img src="src/lib/img/sidebar-icon.svg" alt="sidebar button"/>
        </button>
        
        <span class="logo">PDF Notes</span>
        <div class="drag-region"></div>
        
        <div class="file-section" data-tauri-drag-region="false">
            {#if currentFileName === "No PDF selected"}
                <!-- Replaced <input> logic with direct button -->
                <button class="custom-upload-btn" on:click={handleUploadClick}>Import PDF</button>
            {:else}
                <button class="custom-upload-btn disabled" disabled>Import PDF</button>
            {/if}
            
            <span class="file-name">{currentFileName}</span>
            
            {#if currentFileName !== "No PDF selected"}
                <button class="remove-btn" on:click={removePDF}>
                    {#if hasAutosaveEnabled}
                        Close note
                    {:else}
                        Remove PDF
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
                    src={hasAutosaveEnabled ? "src/lib/img/save-enabled-icon.svg" : "src/lib/img/save-icon.svg"}
                    alt={hasAutosaveEnabled ? "autosave enabled" : "save button"}
                />
            </button>
        </div>

        <div class="window-controls" aria-label="Window controls" data-tauri-drag-region="false">
            <button type="button" class="window-btn" on:click={minimizeWindow} title="Minimize">−</button>
            <button
                type="button"
                class="window-btn"
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
        padding-right: 20px;
        font-weight: bold; /* Moved from bottom rules for consistency */
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
    
    .custom-upload-btn.disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    .file-name {
        font-size: 14px;
        color: #333;
        min-width: 150px;
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
        gap: 6px;
    }

    .window-btn {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        color: #333;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .window-btn:hover {
        background: #ececec;
    }

    .window-btn.close:hover {
        background: #dc3545;
        color: #fff;
        border-color: #dc3545;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
</style>
