<script lang="ts">
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { onMount } from 'svelte';
    import sidebarIcon from '$lib/img/sidebar-icon.svg';
    import appIcon from '$lib/img/icon_64x64.png';
    import saveIcon from '$lib/img/save-icon.svg';
    import saveEnabledIcon from '$lib/img/save-enabled-icon.svg';
	import { getBaseName } from './vault/pathUtils';
	import { getCurrentNotePath, toggleSidebar } from './vault/store.svelte';
 

    let currentNotePath = $derived(getCurrentNotePath());

    let isWindowMaximized = $state(false);
    let isWindowFullscreen = $state(false);

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
        try {
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
        } catch (error) {
            console.warn('Tauri window API not available (likely in dev mode):', error);
        }
    });
</script>


<nav class="navbar">
    <div class="nav-content" data-tauri-drag-region>
        <button id="sidebar-toggle" data-tauri-drag-region="false" onclick={toggleSidebar} title="Toggle Sidebar">
            <img src={sidebarIcon} alt="sidebar button"/>
        </button>
        
        <h1 class="note-title-name">
            {#if currentNotePath}
                {getBaseName(currentNotePath)}
            {:else}
                No note is open - create or open a note!
            {/if}
        </h1>
        <div class="drag-region"></div>

        <div class="window-controls" aria-label="Window controls" data-tauri-drag-region="false">
            <button
                type="button"
                class="window-btn utility"
                onclick={handleMinimizeOrRestore}
                title={isWindowFullscreen ? "Restore from fullscreen" : "Minimize"}
            >
                {isWindowFullscreen ? "❐" : "−"}
            </button>
            <button
                type="button"
                class="window-btn utility"
                onclick={toggleMaximizeWindow}
                title={isWindowMaximized ? "Restore" : "Maximize"}
            >
                {isWindowMaximized ? "❐" : "□"}
            </button>
            <button type="button" class="window-btn close" onclick={closeWindow} title="Close">×</button>
        </div>
    </div>
</nav>


<style>
    .navbar {
        top: 0;
        width: 100%;
        height: 40px;
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
