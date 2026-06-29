/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler, SuccessHandler } from '../../domain/types/index';
import { Logger } from '../../shared/utils/logger';
import { getCurrentGitBranch, matchesBranchPattern } from '../../shared/utils/git';

/**
 * Detects failures and successes in VS Code tasks.
 */
export class TaskDetector {
    private readonly taskStarts = new Map<vscode.TaskExecution, { timestamp: number; label: string }>();

    constructor(
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger,
        private readonly onFailure: FailureHandler,
        private readonly onSuccess: SuccessHandler
    ) {}

    public register(disposables: vscode.Disposable[]): void {
        disposables.push(
            vscode.tasks.onDidStartTaskProcess((e) => {
                const label = e.execution.task.name;
                this.taskStarts.set(e.execution, { timestamp: Date.now(), label });
            })
        );

        disposables.push(
            vscode.tasks.onDidEndTaskProcess(async (e) => {
                try {
                    const configObj = this.config();
                    const cfg = configObj.detection;
                    const startInfo = this.taskStarts.get(e.execution);
                    this.taskStarts.delete(e.execution);

                    if (!cfg.sources.has('task')) {
                        return;
                    }

                    const label = e.execution.task.name;
                    const code = e.exitCode;

                    // Check branch patterns if configured
                    if (cfg.branchPatterns.length > 0) {
                        const currentBranch = await getCurrentGitBranch();
                        if (currentBranch && !matchesBranchPattern(currentBranch, cfg.branchPatterns)) {
                            this.logger.debug(`Task skipped due to branch pattern mismatch: ${currentBranch}`);
                            return;
                        }
                    }

                    if (code !== undefined && code !== 0) {
                        this.onFailure({ source: 'task', label, timestamp: Date.now() });
                    } else if (code === 0 && configObj.audio.successEnabled) {
                        const executionTime = startInfo ? Date.now() - startInfo.timestamp : undefined;
                        this.onSuccess({ source: 'task', label, executionTime });
                    }
                } catch (err) {
                    this.logger.error('Unhandled rejection in Task Detector', err);
                }
            })
        );
    }
}
