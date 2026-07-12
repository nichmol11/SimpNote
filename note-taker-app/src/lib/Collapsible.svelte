<script lang="ts">

  interface Props {
    title?: string;
    icon?: string;
    children?: import('svelte').Snippet;
  }

  let { title = "Click to expand", icon = "🚫", children }: Props = $props();
  
  let isOpen = $state(true);

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="collapsible-container" class:expanded={isOpen}>
  <button class="header" onclick={toggle} aria-expanded={isOpen}>
    <span>{icon}</span>
    <span>{title}</span>
    <span class="arrow" title={isOpen ? 'collapse' : 'expand'}>{isOpen ? '▲' : '▼'}</span>
  </button>

  {#if isOpen && children}
    <div class="content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .collapsible-container {
    border-radius: 3px;     /* Strict 3px radius */
    overflow: hidden;       
    width: 100%;
    background-color: white;
    margin: 10px 0;         /* Added margin to help it stand out in your sidebar */
  }

  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 15px;
    padding-right:20px;
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    font-family: inherit;
  }

  .arrow {
    font-size: 0.8rem;
    color: gray;
  }

  .content {
    width: 100%;
    background-color: #ffffff;
    color: #333;
  }
</style>