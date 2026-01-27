<script lang="ts">
    // Define props
    export let onUpload: () => void;
    export let onRemove: () => void;
    export let toggleSidebar: () => void;
    export let onSave: () => void;
    export let isSaving: boolean = false;
    export let currentFileName: string = "No PDF selected";

    function handleUploadClick() {
        onUpload();
    }

    function removePDF() {
        onRemove();
    }
</script>


<nav class="navbar">
    <div class="nav-content">
        <button id="sidebar-toggle" on:click={toggleSidebar} title="Toggle Sidebar">
            <img src="src/lib/img/sidebar-icon.svg" alt="sidebar button"/>
        </button>
        
        <span class="logo">PDF Notes</span>
        
        <div class="file-section">
            {#if currentFileName === "No PDF selected"}
                <!-- Replaced <input> logic with direct button -->
                <button class="custom-upload-btn" on:click={handleUploadClick}>Import PDF</button>
            {:else}
                <button class="custom-upload-btn disabled" disabled>Import PDF</button>
            {/if}
            
            <span class="file-name">{currentFileName}</span>
            
            {#if currentFileName !== "No PDF selected"}
                <button class="remove-btn" on:click={removePDF}>Remove PDF</button>
            {/if}
        </div>
        
        <div class="navigation-options">
            {#if isSaving}
                <span class="save-indicator">Saving...</span>
            {/if}
            <button type="button" class="save-btn" on:click={onSave} title="Save notes">
                <img src="src/lib/img/save-icon.svg" alt="save button"/>
            </button>
        </div>
    </div>
</nav>


<style>
    .navbar {
        top: 0;
        width: 100%;
        height: 60px;
        position: fixed;
        border-bottom: 1px solid #ddd;
        background-color: white;
        z-index: 100;
        display: flex;
        align-items: center;
    }
    
    .nav-content {
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
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    /* Removed #fileInput styles as it is deleted */
    
    .custom-upload-btn {
        display: inline-block;
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
        position: absolute;
        right: 20px;
        top: 10px;
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
        position: absolute;
        right: 70px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        color: #666;
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
</style>
