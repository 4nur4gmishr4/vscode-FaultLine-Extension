import * as vscode from 'vscode';
import { TaskDetector } from '../../../infrastructure/detectors/taskDetector';
import { Logger } from '../../../shared/utils/logger';
import type { FaultLineConfig } from '../../../domain/types/index';

jest.mock('../../../shared/utils/git', () => ({
    getCurrentGitBranch: jest.fn(async () => 'main'),
    matchesBranchPattern: jest.fn((branch: string, patterns: string[]) =>
        patterns.length === 0 || patterns.includes(branch)
    )
}));

import { getCurrentGitBranch, matchesBranchPattern } from '../../../shared/utils/git';

describe('TaskDetector', () => {
    let onFailure: jest.Mock;
    let onSuccess: jest.Mock;
    let startCb: (e: unknown) => void;
    let endCb: (e: unknown) => void | Promise<void>;
    let config: FaultLineConfig;
    const execution = { task: { name: 'build' } };

    beforeEach(() => {
        onFailure = jest.fn();
        onSuccess = jest.fn();
        (getCurrentGitBranch as jest.Mock).mockResolvedValue('main');
        (matchesBranchPattern as jest.Mock).mockImplementation(
            (branch: string, patterns: string[]) => patterns.length === 0 || patterns.includes(branch)
        );

        config = {
            detection: {
                sources: new Set(['task']),
                branchPatterns: [] as string[]
            },
            audio: { successEnabled: true }
        } as unknown as FaultLineConfig;

        (vscode.tasks.onDidStartTaskProcess as jest.Mock).mockImplementation((cb: (e: unknown) => void) => {
            startCb = cb;
            return { dispose: jest.fn() };
        });
        (vscode.tasks.onDidEndTaskProcess as jest.Mock).mockImplementation((cb: (e: unknown) => void | Promise<void>) => {
            endCb = cb;
            return { dispose: jest.fn() };
        });

        new TaskDetector(() => config, new Logger('test'), onFailure, onSuccess).register([]);
    });

    it('reports failure on non-zero exit', async () => {
        startCb({ execution });
        await endCb({ execution, exitCode: 1 });
        expect(onFailure).toHaveBeenCalledWith(
            expect.objectContaining({ source: 'task', label: 'build' })
        );
    });

    it('reports success on zero exit when successEnabled', async () => {
        startCb({ execution });
        await endCb({ execution, exitCode: 0 });
        expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ source: 'task', label: 'build' })
        );
    });

    it('skips when branch patterns do not match', async () => {
        config.detection.branchPatterns = ['release/*'];
        (matchesBranchPattern as jest.Mock).mockReturnValueOnce(false);
        startCb({ execution });
        await endCb({ execution, exitCode: 1 });
        expect(getCurrentGitBranch).toHaveBeenCalled();
        expect(onFailure).not.toHaveBeenCalled();
    });

    it('fails closed when branch patterns set but branch is unknown', async () => {
        config.detection.branchPatterns = ['main'];
        (getCurrentGitBranch as jest.Mock).mockResolvedValueOnce(null);
        startCb({ execution });
        await endCb({ execution, exitCode: 1 });
        expect(onFailure).not.toHaveBeenCalled();
    });
});
