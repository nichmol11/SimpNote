<!-- src/lib/ui/Navbar.svelte -->
<script lang="ts">
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { onMount } from 'svelte';
    import sidebarIcon from '$lib/img/sidebar-icon.svg';
    import { getBaseName } from '$lib/vault/backend/pathUtils';
    import { getCurrentNotePath, toggleSidebar, closeNote } from '$lib/vault/backend/store.svelte';

    let currentNotePath = $derived(getCurrentNotePath());
    let isWindowMaximized = $state(false);
    let isWindowFullscreen = $state(false);

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

<nav class="navbar" data-tauri-drag-region>
    <div class="nav-content" data-tauri-drag-region>
        <button id="sidebar-toggle" onclick={toggleSidebar} title="Toggle Sidebar" data-tauri-drag-region="false">
            <img src={sidebarIcon} alt="sidebar button"/>
        </button>
        
        <div class="note-title" data-tauri-drag-region="true">
            <h1 class="note-title-name">
                {#if currentNotePath}
                    {getBaseName(currentNotePath)}
                {:else}
                    No note is open
                {/if}
            </h1>
            {#if currentNotePath}
                <button class="close-note-btn" title="Close note" data-tauri-drag-region="false" onclick={() => closeNote()}>×</button>
            {/if}
        </div>


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
        width: 100%;
        height: 40px;
        border-bottom: 1px solid #ddd;
        background-color: white;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .nav-content {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
    }

    .note-title {
        display: flex;
        flex-direction: row;
        justify-content: center;
        gap: 10px;
        max-width: 500px;
        align-items: center;
        
    }

    .note-title-name {
        grid-column: 2;
        font-size: 14px;
        color: #333;
        text-align: center;
        margin: 0;
        pointer-events: none;
    }

    .close-note-btn {
        font-size: 20px;
        cursor: pointer;
    }

    .close-note-btn:hover {
        color:#ef4444;
    }

    #sidebar-toggle, .window-controls {
        -webkit-app-region: no-drag;
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
</style>