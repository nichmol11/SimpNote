<script lang="ts">
	import './layout.css';
	import Sidebar from '$lib/img/Sidebar.svelte';
	import Navbar from '$lib/Navbar.svelte';
	import { setContext } from 'svelte';

	const { children } = $props();

	let isSidebarOpen = $state(true);
	let isSaving = $state(false);
	let hasAutosaveEnabled = $state(false);
	let currentFileName = $state("No PDF selected");
	let onUpload = $state<() => void>(() => {});
	let onRemove = $state<() => void>(() => {});
	let refreshSidebar = $state<() => void>(() => {});
	let onLoadNote = $state<(jsonName: string) => Promise<void>>(async () => {});

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	let onSave = $state<() => void>(() => {});

	setContext('navbar', {
		setHandlers: (
			uploadHandler: () => void,
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
		getRefreshSidebar: () => refreshSidebar,
		setIsSaving: (saving: boolean) => {
			isSaving = saving;
		},
		setHasAutosaveEnabled: (enabled: boolean) => {
			hasAutosaveEnabled = enabled;
		},
		setLoadNote: (loadFn: (jsonName: string) => Promise<void>) => {
			onLoadNote = loadFn;
		},
		getLoadNote: () => onLoadNote,
		setCurrentFileName: (name: string) => {
			currentFileName = name;
		}
	});

</script>

<Navbar {toggleSidebar} {onUpload} {onRemove} {onSave} {isSaving} {hasAutosaveEnabled} {currentFileName} />
<Sidebar {isSidebarOpen} {toggleSidebar} />
<main class="app-main" class:sidebar-open={isSidebarOpen}>
	{@render children()}
</main>

<style>
	:global(:root) {
		--sidebar-width: 300px;
	}

	.app-main {
		margin-left: 0;
		width: 100%;
		transition: margin-left 0.3s ease, width 0.3s ease;
	}

	.app-main.sidebar-open {
		margin-left: var(--sidebar-width);
		width: calc(100% - var(--sidebar-width));
	}
</style>
