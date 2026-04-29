import * as fs from 'fs';

export function isWSL(): boolean {
    if (process.platform !== 'linux') {
        return false;
    }
    try {
        const release = fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8');
        return release.toLowerCase().includes('microsoft');
    } catch {
        return false;
    }
}

export function convertWSLPathToWindows(wslPath: string): string {
    // Convert /mnt/c/Users/... to C:/Users/...
    const mntMatch = wslPath.match(/^\/mnt\/([a-z])\//i);
    if (mntMatch) {
        const drive = mntMatch[1].toUpperCase();
        return `${drive}:${wslPath.slice(6)}`.replace(/\//g, '\\');
    }
    // Handle wslpath if available
    return wslPath;
}
