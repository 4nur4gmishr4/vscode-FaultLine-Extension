import { Scheduler } from '../../../shared/utils/scheduler';
import { Logger } from '../../../shared/utils/logger';
import { FaultLineConfig } from '../../../domain/types';

describe('Scheduler', () => {
    let scheduler: Scheduler;
    let mockLogger: Logger;
    let configFn: () => FaultLineConfig;

    beforeEach(() => {
        mockLogger = new Logger('test');
        configFn = () =>
            ({
                core: { enabled: true },
                detection: { quietHours: { enabled: false }, muteWhenFocused: false }
            }) as FaultLineConfig;
        scheduler = new Scheduler(configFn, mockLogger);
    });

    it('snoozes correctly', () => {
        scheduler.snooze(10);
        expect(scheduler.isMuted('task')).toBe(true);
    });
});
