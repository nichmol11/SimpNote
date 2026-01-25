<script lang="ts">
	import './layout.css';
	import Sidebar from '$lib/img/Sidebar.svelte';
	import Navbar from '$lib/Navbar.svelte';
	import { setContext } from 'svelte';

	const { children } = $props();
	
	let isSidebarOpen = $state(true);
	let onUpload = $state<(e: Event) => void>(() => {});
	let onRemove = $state<() => void>(() => {});
	let refreshSidebar = $state<() => void>(() => {});
	
	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	let onSave = $state<() => void>(() => {});

	setContext('navbar', {
		setHandlers: (
			uploadHandler: (e: Event) => void, 
			removeHandler: () => void,
			saveHandler: () => void
		) => {
			onUpload = uploadHandler;
			onRemove = removeHandler;
			onSave = saveHandler;
		},
		setRefreshSidebar: (refreshFn: () => void) => {
			refreshSidebar = refreshFn;
		},
		getRefreshSidebar: () => refreshSidebar
	});

</script>

<Navbar {toggleSidebar} {onUpload} {onRemove} {onSave} />
<Sidebar {isSidebarOpen} {toggleSidebar} />
{@render children()}
