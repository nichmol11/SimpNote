<script lang="ts">
	import { page } from '$app/state';

    //import page row component
    import PageRow from '$lib/PageRow.svelte'

    //import navbar component
    import Navbar from '$lib/Navbar.svelte';

    //1. define data shape
    interface PageNote {
        id: number;
        note: string;
    }

    //2. tell svelte this is an array
    let pages: PageNote[] = [
        {id: 0, note: "# Page 1\nThis is an example note."},
        {id: 1, note: "# Page 2\nThis is another example note."}
    ]

    function addPage(): void {
        const newPage: PageNote = {
            id: pages.length,
            note: ""
        };
        pages = [...pages, newPage]
    }
</script>

<Navbar></Navbar>
<div id="content">
    {#each pages as page} 
    <PageRow id={page.id} bind:note={page.note}/>
    {/each}
</div>

<style>
    #content{
        margin-top: 95px;
    }
</style>

