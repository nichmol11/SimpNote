<script lang="ts">
    // Define the prop to receive the function from +page.svelte
    export let onUpload: (e: Event) => void;``
    export let onRemove: () => void;
    
    let currentFileName: string = "No PDF selected";
    let fileInput: HTMLInputElement;
    
    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            currentFileName = file.name;
            onUpload(e);
        }
    }
    
    function removePDF() {
        currentFileName = "No PDF selected";
        if (fileInput) {
            fileInput.value = '';
        }
        onRemove();
    }
</script>

<nav class="navbar">
    <div class="nav-content">
        <span class="logo">PDF Notes</span>
        <div class="file-section">
            {#if currentFileName === "No PDF selected"}
                <input type="file" bind:this={fileInput} id="fileInput" accept=".pdf" on:change={handleFileChange} />
                <label for="fileInput" class="custom-upload-btn">Upload PDF</label>
            {:else}
                <button class="custom-upload-btn disabled" disabled>Upload PDF</button>
            {/if}
            <span class="file-name">{currentFileName}</span>
            {#if currentFileName !== "No PDF selected"}
                <button class="remove-btn" on:click={removePDF}>Remove PDF</button>
            {/if}
        </div>
        <div class="navigation-options">
            <span class="save-btn" title="Save notes"><img src="src/lib/img/save-icon.svg" alt="save button"/></span>
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
    }

    .file-section {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    #fileInput {
        position: absolute;
        opacity: 0;
        width: 0.1px;
        height: 0.1px;
        overflow: hidden;
    }
    
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
    
    .logo { 
        font-weight: bold; 
    }

    .save-btn img {
        height: 40px;
        cursor: pointer;
        position: absolute;
        right: 20px;
        top: 10px;
    }
</style>