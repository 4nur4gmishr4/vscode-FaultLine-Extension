import * as fs from 'fs';
import * as path from 'path';
import { FahhConfig, FailureSource } from './config';
import { Logger } from './logger';

const DEFAULT_SOUND = 'Fahhh.mp3';

export class SoundResolver {
    private defaultSoundPath: string;
    private packDir: string;

    public constructor(
        _extensionPath: string,
        private readonly config: () => FahhConfig,
        private readonly logger: Logger
    ) {
        this.defaultSoundPath = path.join(_extensionPath, DEFAULT_SOUND);
        this.packDir = path.join(_extensionPath, 'media', 'packs');
    }

    public resolveForFailure(source: FailureSource, isSuccess = false): string | null {
        const cfg = this.config();

        if (isSuccess && cfg.successEnabled) {
            if (cfg.successSound && fs.existsSync(cfg.successSound)) {
                return cfg.successSound;
            }
            return this.defaultSoundPath;
        }

        // Per-source sound
        const perSource = cfg.sounds[source as keyof typeof cfg.sounds] as string | undefined;
        if (perSource && fs.existsSync(perSource)) {
            return perSource;
        }

        // Sound folder (random)
        if (cfg.soundFolder && fs.existsSync(cfg.soundFolder)) {
            const files = this.listAudioFiles(cfg.soundFolder);
            if (files.length > 0) {
                const pick = files[Math.floor(Math.random() * files.length)];
                return pick;
            }
        }

        // Global sound path
        if (cfg.soundPath && fs.existsSync(cfg.soundPath)) {
            return cfg.soundPath;
        }

        // Default
        if (fs.existsSync(this.defaultSoundPath)) {
            return this.defaultSoundPath;
        }

        this.logger.error(`No sound file available for source: ${source}`);
        return null;
    }

    public getVolume(source: FailureSource): number {
        const cfg = this.config();
        const perSource = cfg.volumes[source as keyof typeof cfg.volumes];
        if (perSource !== undefined && perSource >= 0) {
            return perSource;
        }
        return cfg.volume;
    }

    public listSoundPacks(): { id: string; name: string; path: string }[] {
        const packs: { id: string; name: string; path: string }[] = [];
        if (!fs.existsSync(this.packDir)) {
            return packs;
        }
        try {
            const entries = fs.readdirSync(this.packDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const packPath = path.join(this.packDir, entry.name);
                    const files = this.listAudioFiles(packPath);
                    if (files.length > 0) {
                        packs.push({ id: entry.name, name: this.titleCase(entry.name), path: packPath });
                    }
                }
            }
        } catch {
            // Ignore
        }
        return packs;
    }

    public pickFromPack(packId: string): string | null {
        const packPath = path.join(this.packDir, packId);
        if (!fs.existsSync(packPath)) {
            return null;
        }
        const files = this.listAudioFiles(packPath);
        if (files.length === 0) {
            return null;
        }
        return files[Math.floor(Math.random() * files.length)];
    }

    private listAudioFiles(dir: string): string[] {
        try {
            return fs.readdirSync(dir)
                .filter(f => /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f))
                .map(f => path.join(dir, f));
        } catch {
            return [];
        }
    }

    private titleCase(str: string): string {
        return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}
