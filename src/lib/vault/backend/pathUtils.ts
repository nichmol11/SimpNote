// src/lib/vault/backend/pathUtils.ts

// Helper function to check if a node being dropped on itself or a descendant of itself
export function isDescendantOrSelf(targetPath: string, draggedPath: string): boolean {
    return targetPath === draggedPath || targetPath.startsWith(draggedPath + '/');
}

// Function to get a file's base name (remove path + file extension if applicable)
export function getBaseName(path: string): string {
    const fileName = path.split('/').at(-1) ?? '';
    return fileName.replace(/\.md$/, '');
}