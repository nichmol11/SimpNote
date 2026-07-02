// src/lib/vault/validation.ts

// Function to validate node (file/folder) names e.g. check for illegal characters
export function validateNodeName(name: string): string | null {
    // Returns an error message string if invalid, null if valid

    if (!name.trim()) {
        return "Name cannot be empty";
    }

    // Invalid characters on Windows and/or Linux
    if (/[/\\:*?"<>|\x00]/.test(name)) {
        return 'Name contains invalid characters ( / \\ : * ? " < > | )';
    }

    // Reserved Windows names (case-insensitive)
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name.trim())) {
        return `"${name}" is a reserved name and cannot be used`;
    }

    // Can't be just dots
    if (/^\.+$/.test(name)) {
        return "Name cannot be just dots";
    }

    // Windows doesn't allow names ending in . or space
    if (/[. ]$/.test(name)) {
        return "Name cannot end with a dot or space";
    }

    return null; // valid
}
