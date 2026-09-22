<!-- src/lib/ui/Navbar.svelte -->
<script lang="ts">
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { onMount } from 'svelte';
    import { setThemePreference, themeState, type ThemePreference } from '$lib/theme/theme.svelte';
    import sidebarIcon from '$lib/img/sidebar-icon.svg';
    import { getBaseName } from '$lib/vault/backend/pathUtils';
    import { getCurrentNotePath, toggleSidebar, closeNote } from '$lib/vault/backend/store.svelte';

    let currentNotePath = $derived(getCurrentNotePath());
    let isWindowMaximized = $state(false);
    let isWindowFullscreen = $state(false);
    let themePreference = $derived(themeState.preference);

    function handleThemeChange(event: Event) {
        setThemePreference((event.currentTarget as HTMLSelectElement).value as ThemePreference);
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
            <label class="theme-control">
                <span class="sr-only">Theme</span>
                <span class="theme-select-wrap">
                    <select value={themePreference} onchange={handleThemeChange} title="Theme">
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                    <span class="theme-select-arrow" aria-hidden="true"></span>
                </span>
            </label>
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
        border-bottom: 1px solid var(--color-border);
        background-color: var(--color-surface);
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
        color: var(--color-text);
        text-align: center;
        margin: 0;
        pointer-events: none;
    }

    .close-note-btn {
        font-size: 20px;
        cursor: pointer;
    }

    .close-note-btn:hover {
        color: var(--color-danger);
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
        border-left: 1px solid var(--color-border);
        height: 100%;
        padding-left: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .theme-select-wrap {
        position: relative;
        display: inline-flex;
        flex-shrink: 0;
    }

    .theme-control select {
        width: 82px;
        min-width: 82px;
        height: 28px;
        flex-shrink: 0;
        box-sizing: border-box;
        padding: 0 22px 0 6px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 12px;
        appearance: none;
        -webkit-appearance: none;
    }

    .theme-select-arrow {
        position: absolute;
        top: 50%;
        right: 8px;
        width: 6px;
        height: 6px;
        border-right: 1.5px solid var(--color-text-muted);
        border-bottom: 1.5px solid var(--color-text-muted);
        transform: translateY(-65%) rotate(45deg);
        pointer-events: none;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .window-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        min-height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-text);
        font-size: 17px;
        line-height: 1;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .window-btn.utility:hover {
        background: var(--color-surface-raised);
    }

    .window-btn.close:hover {
        background: var(--color-danger);
        color: var(--color-accent-text);
    }
</style>