// src/lib/vault/backend/db.ts
// Minimal Dexie database for persisting the last selected directory path
import Dexie, { type Table } from 'dexie';

export interface DirectoryMeta {
    id?: number;
    handle: string; // Absolute path string to the selected directory
    name: string;   // Display name (folder name)
}

export class AppDatabase extends Dexie {
    directoryMeta!: Table<DirectoryMeta>;

    constructor() {
        super('PDFNotesDB');

        // Version 3: Only directoryMeta table
        // (Versions 1-2 had unused documents/pageNotes tables, now removed)
        this.version(3).stores({
            directoryMeta: '++id'
        });
    }
}

export const db = new AppDatabase();
