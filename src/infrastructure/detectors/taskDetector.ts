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
        const startTask = vscode.tasks?.onDidStartTaskProcess;
        const endTask = vscode.tasks?.onDidEndTaskProcess;

        if (typeof startTask !== 'function' || typeof endTask !== 'function') {
            this.logger.warn(
                'vscode.tasks shell process APIs unavailable. Task failure detection is disabled.'
            );
            return;
        }

        disposables.push(
            startTask.call(vscode.tasks, (e: vscode.TaskProcessStartEvent) => {
                try {
                    const label = e.execution.task.name;
                    this.taskStarts.set(e.execution, { timestamp: Date.now(), label });
                } catch (err) {
                    this.logger.error('TaskDetector start handler failed', err);
                }
            })
        );

        disposables.push(
            endTask.call(vscode.tasks, (e: vscode.TaskProcessEndEvent) => {
                void this.handleEnd(e).catch((err: unknown) => {
                    this.logger.error('Unhandled rejection in Task Detector', err);
                });
            })
        );
    }

    private async handleEnd(e: vscode.TaskProcessEndEvent): Promise<void> {
        const configObj = this.config();
        const cfg = configObj.detection;
        const startInfo = this.taskStarts.get(e.execution);
        this.taskStarts.delete(e.execution);

        if (!cfg.sources.has('task')) {
            return;
        }

        const label = e.execution.task.name;
        const code = e.exitCode;

        // Branch filter: fail closed if patterns set but branch unknown (no git / timeout).
        if (cfg.branchPatterns.length > 0) {
            const currentBranch = await getCurrentGitBranch();
            if (!currentBranch || !matchesBranchPattern(currentBranch, cfg.branchPatterns)) {
                this.logger.debug(
                    currentBranch
                        ? `Task skipped due to branch pattern mismatch: ${currentBranch}`
                        : 'Task skipped: branch patterns set but current branch unavailable'
                );
                return;
            }
        }

        if (code !== undefined && code !== 0) {
            this.onFailure({ source: 'task', label, timestamp: Date.now() });
        } else if (code === 0 && configObj.audio.successEnabled) {
            const executionTime = startInfo ? Date.now() - startInfo.timestamp : undefined;
            this.onSuccess({ source: 'task', label, executionTime });
        }
    }
}
