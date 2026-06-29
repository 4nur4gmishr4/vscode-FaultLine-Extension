/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { promisify } from 'util';
import { execFile as execFileCb } from 'child_process';

const execFile = promisify(execFileCb);

/**
 * Git utility functions for branch detection and pattern matching.
 */

/**
 * Get the current git branch name.
 * @returns The current branch name, or null if not in a git repository
 */
export async function getCurrentGitBranch(): Promise<string | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }

    try {
        const { stdout } = await execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workspaceFolders[0].uri.fsPath, windowsHide: true, timeout: 2000 });
        return stdout.trim();
    } catch {
        return null;
    }
}

/**
 * Check if a branch name matches any of the given glob patterns.
 * Supports simple patterns like 'main', 'feature/*', 'release/*', etc.
 * @param branch - The branch name to check
 * @param patterns - Array of glob patterns to match against
 * @returns True if the branch matches any pattern, false otherwise
 */
export function matchesBranchPattern(branch: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
        return true; // Empty patterns means match all branches
    }
    
    for (const pattern of patterns) {
        if (matchesGlob(branch, pattern)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Simple glob pattern matching.
 * Supports * wildcard for matching any characters.
 * @param text - The text to match
 * @param pattern - The glob pattern
 * @returns True if the text matches the pattern
 */
function matchesGlob(text: string, pattern: string): boolean {
    // Escape special regex characters except *
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
}
