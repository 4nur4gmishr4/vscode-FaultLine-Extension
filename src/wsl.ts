import * as fs from 'fs';
import { execFileSync } from 'child_process';

let cachedIsWSL: boolean | undefined;
const wslPathCache = new Map<string, string>();

export function isWSL(): boolean {
    if (cachedIsWSL !== undefined) {
        return cachedIsWSL;
    }
    if (process.platform !== 'linux') {
        cachedIsWSL = false;
        return false;
    }
    try {
        const release = fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8');
        cachedIsWSL = release.toLowerCase().includes('microsoft');
    } catch {
        cachedIsWSL = false;
    }
    return cachedIsWSL;
}

export function convertWSLPathToWindows(wslPath: string): string {
    const cached = wslPathCache.get(wslPath);
    if (cached !== undefined) {
        return cached;
    }
    const result = computeWindowsPath(wslPath);
    wslPathCache.set(wslPath, result);
    return result;
}

function computeWindowsPath(wslPath: string): string {
    // Convert /mnt/c/Users/... to C:\Users\...
    const mntMatch = wslPath.match(/^\/mnt\/([a-z])\//i);
    if (mntMatch) {
        const drive = mntMatch[1].toUpperCase();
        return `${drive}:${wslPath.slice(6)}`.replace(/\//g, '\\');
    }
    try {
        const stdout = execFileSync('wslpath', ['-w', wslPath], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });
        return stdout.trim();
    } catch {
        return wslPath;
    }
}
