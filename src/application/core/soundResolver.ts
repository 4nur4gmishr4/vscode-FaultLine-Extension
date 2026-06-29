/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as fs from 'fs';
import * as path from 'path';
import { SOUNDS, RESOURCES } from '../../shared/config/constants';
import { Logger } from '../../shared/utils/logger';
import type { FaultLineConfig, FailureSource } from '../../domain/types/index';

/**
 * Resolves sound file paths based on configuration and failure source.
 * 
 * This class implements a priority-based sound resolution system:
 * 1. Success sounds (if enabled and isSuccess=true)
 * 2. Sound folder (random selection from folder)
 * 3. Global sound path (single custom sound)
 * 4. Sound pack selection (from built-in packs)
 * 5. Default sound (fallback)
 * 
 * @example
 * ```typescript
 * const resolver = new SoundResolver(extensionPath, () => config, logger);
 * 
 * // Resolve sound for a task failure
 * const soundPath = await resolver.resolveForFailure('task');
 * 
 * // Resolve sound for a success event
 * const successPath = await resolver.resolveForFailure('task', true);
 * 
 * // Get the global volume
 * const volume = resolver.getVolume();
 * ```
 */
export class SoundResolver {
    private readonly defaultSoundPath: string;
    private readonly packDir: string;

    /**
     * Creates a new SoundResolver instance.
     * 
     * @param extensionPath - Absolute path to the extension root directory
     * @param config - Function that returns the current extension configuration
     * @param logger - Logger instance for error reporting
     */
    public constructor(
        extensionPath: string,
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger
    ) {
        this.defaultSoundPath = path.join(extensionPath, RESOURCES.DEFAULT_PACK, SOUNDS.PACKS.FAULTLINE);
        this.packDir = path.join(extensionPath, RESOURCES.PACKS_DIR);
    }

    /**
     * Resolve the sound file path for a failure or success event.
     * 
     * This method implements the priority-based resolution system:
     * 1. If isSuccess=true and successEnabled, use success sound
     * 2. Check sound folder (random selection)
     * 3. Check global sound path
     * 4. Check sound pack selection
     * 5. Fall back to default sound
     * 
     * @param source - The failure source type
     * @param isSuccess - Whether this is a success event (default: false)
     * @returns The resolved sound file path, or null if no sound is available
     * 
     * @example
     * ```typescript
     * // Resolve for task failure
     * const path = await resolver.resolveForFailure('task');
     * 
     * // Resolve for task success
     * const successPath = await resolver.resolveForFailure('task', true);
     * ```
     */
    public async resolveForFailure(source: FailureSource, isSuccess = false): Promise<string | null> {
        const cfg = this.config().audio;

        // Success sound resolution
        if (isSuccess && cfg.successEnabled) {
            if (cfg.successSound) {
                // If the user selected from the success pack
                const successPackPath = path.join(this.packDir, 'success', path.basename(cfg.successSound));
                if (await this.fileExists(successPackPath)) {
                    return successPackPath;
                }
                // Fallback if absolute path was given
                if (await this.fileExists(cfg.successSound)) {
                    return cfg.successSound;
                }
            }
            // Default success sound
            const defaultSuccessPath = path.join(this.packDir, 'success', 'success_ding.mp3');
            if (await this.fileExists(defaultSuccessPath)) {
                return defaultSuccessPath;
            }
            return null;
        }

        // Error sound resolution
        // Priority 1: Global sound path
        if (cfg.soundPath && await this.fileExists(cfg.soundPath)) {
            return cfg.soundPath;
        }

        // Priority 2: Sound pack selection (from default error pack)
        if (cfg.soundPack) {
            const errorPackPath = path.join(this.packDir, 'default', path.basename(cfg.soundPack));
            if (await this.fileExists(errorPackPath)) {
                return errorPackPath;
            }
        }

        // Priority 3: Default error sound
        if (await this.fileExists(this.defaultSoundPath)) {
            return this.defaultSoundPath;
        }

        this.logger.error(`No sound file available for source: ${source}`);
        return null;
    }

    /**
     * Check if a file exists at the given path.
     * 
     * @param filePath - The file path to check
     * @returns True if the file exists and is accessible, false otherwise
     * @private
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the global volume level.
     * 
     * @returns Volume level (0-100)
     * 
     * @example
     * ```typescript
     * const volume = resolver.getVolume();
     * console.log(`Volume: ${volume}%`);
     * ```
     */
    public getVolume(_source?: FailureSource): number {
        const cfg = this.config().audio;
        return cfg.volume;
    }

    /**
     * List all available sound packs.
     * 
     * Scans the packs directory and returns metadata for each pack that contains
     * at least one audio file. Packs are directories containing audio files.
     * 
     * @returns Array of sound pack metadata objects
     * 
     * @example
     * ```typescript
     * const packs = await resolver.listSoundPacks();
     * for (const pack of packs) {
     *     console.log(`Pack: ${pack.name} (${pack.id})`);
     * }
     * ```
     */
    public async listSoundPacks(): Promise<{ id: string; name: string; path: string }[]> {
        const packs: { id: string; name: string; path: string }[] = [];
        if (!(await this.fileExists(this.packDir))) {
            return packs;
        }
        try {
            const entries = await fs.promises.readdir(this.packDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const packPath = path.join(this.packDir, entry.name);
                    const files = await this.listAudioFiles(packPath);
                    if (files.length > 0) {
                        packs.push({ id: entry.name, name: this.titleCase(entry.name), path: packPath });
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to list sound packs', error);
        }
        return packs;
    }

    /**
     * Pick a random sound file from a specific sound pack.
     * 
     * @param packId - The sound pack identifier (directory name)
     * @returns Path to a random sound file from the pack, or null if pack not found or empty
     * 
     * @example
     * ```typescript
     * const sound = await resolver.pickFromPack('default');
     * if (sound) {
     *     console.log(`Selected: ${sound}`);
     * }
     * ```
     */
    public async pickFromPack(packId: string): Promise<string | null> {
        const packPath = path.join(this.packDir, packId);
        if (!(await this.fileExists(packPath))) {
            return null;
        }
        const files = await this.listAudioFiles(packPath);
        if (files.length === 0) {
            return null;
        }
        return files[Math.floor(Math.random() * files.length)];
    }

    /**
     * List all audio files in a directory.
     * 
     * Scans the directory for files with audio extensions (.mp3, .wav, .ogg, .flac, .m4a, .aac)
     * and returns their full paths.
     * 
     * @param dir - Directory path to scan
     * @returns Array of full paths to audio files
     * @private
     */
    private async listAudioFiles(dir: string): Promise<string[]> {
        try {
            const files = await fs.promises.readdir(dir);
            return files
                .filter(f => /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f))
                .map(f => path.join(dir, f));
        } catch (error) {
            this.logger.error(`Failed to list audio files in ${dir}`, error);
            return [];
        }
    }

    /**
     * Convert a string to title case.
     * 
     * Replaces hyphens and underscores with spaces and capitalizes the first letter
     * of each word. Used for displaying pack names in the UI.
     * 
     * @param str - String to convert
     * @returns Title-cased string
     * @private
     * 
     * @example
     * ```typescript
     * titleCase('my-sound-pack') // Returns: 'My Sound Pack'
     * titleCase('default_sounds') // Returns: 'Default Sounds'
     * ```
     */
    private titleCase(str: string): string {
        return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}
