// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

export interface PDFDocument {
    id?: number;
    fileName: string;
    pdfData: ArrayBuffer;
    uploadedAt: Date;
    lastModified: Date;
}

export interface PageNote {
    id?: number;
    documentId: number;
    pageNumber: number;
    note: string;
}

export interface DirectoryMeta {
    id?: number;
    handle: string; // Updated: Now stores the absolute path string
    name: string;
}

export class AppDatabase extends Dexie {
    documents!: Table<PDFDocument>;
    pageNotes!: Table<PageNote>;
    directoryMeta!: Table<DirectoryMeta>;

    constructor() {
        super('PDFNotesDB');
        
        // Version 1: Initial schema
        this.version(1).stores({
            documents: '++id, fileName, uploadedAt',
            pageNotes: '++id, documentId, pageNumber'
        });

        // Version 2: Added directoryMeta (using old handle type)
        this.version(2).stores({
            directoryMeta: '++id'
        });

        // Version 3: Migrating directoryMeta to use string paths
        // We keep the table definition the same, but bumping version ensures
        // any schema caching issues are cleared.
        this.version(3).stores({
            directoryMeta: '++id'
        });
    }
}

export const db = new AppDatabase();
