import * as vscode from 'vscode';
import { runCommand, catchAsync, registerSafeCommand } from '../../../shared/utils/commandGuard';

describe('commandGuard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('runCommand executes action', async () => {
        const action = jest.fn(async () => undefined);
        await runCommand('toggle', action);
        expect(action).toHaveBeenCalled();
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('runCommand surfaces errors to the user', async () => {
        await runCommand('toggle', () => {
            throw new Error('boom');
        });
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('boom')
        );
    });

    it('runCommand handles non-Error throws', async () => {
        await runCommand('x', () => {
            throw 'string-fail';
        });
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('string-fail')
        );
    });

    it('catchAsync swallows rejections and calls onError', async () => {
        const onError = jest.fn();
        catchAsync('label', async () => {
            throw new Error('async-fail');
        }, onError);
        await new Promise((r) => setTimeout(r, 10));
        expect(onError).toHaveBeenCalled();
    });

    it('catchAsync succeeds without onError', async () => {
        const action = jest.fn(async () => undefined);
        catchAsync('ok', action);
        await new Promise((r) => setTimeout(r, 10));
        expect(action).toHaveBeenCalled();
    });

    it('registerSafeCommand wires registerCommand and swallows handler throws', async () => {
        let handler: ((...a: unknown[]) => unknown) | undefined;
        (vscode.commands.registerCommand as jest.Mock).mockImplementation(
            (_id: string, fn: (...a: unknown[]) => unknown) => {
                handler = fn;
                return { dispose: jest.fn() };
            }
        );
        const subs: { dispose: () => void }[] = [];
        registerSafeCommand(subs, 'faultline.toggle', () => {
            throw new Error('handler-boom');
        });
        expect(handler).toBeDefined();
        await Promise.resolve(handler!());
        await new Promise((r) => setTimeout(r, 10));
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('handler-boom')
        );
        expect(subs.length).toBe(1);
    });
});
