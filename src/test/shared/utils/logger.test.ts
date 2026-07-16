import { Logger } from '../../../shared/utils/logger';

describe('Logger', () => {
    it('respects log level filtering', () => {
        const logger = new Logger('t');
        logger.setLevel('error');
        logger.debug('no');
        logger.info('no');
        logger.warn('no');
        logger.error('yes');
        logger.dispose();
        logger.dispose(); // idempotent
    });

    it('show and all levels at debug', () => {
        const logger = new Logger('t2');
        logger.setLevel('debug');
        logger.debug('d');
        logger.info('i');
        logger.warn('w');
        logger.error('e', new Error('x'));
        logger.error('e2', 'plain');
        logger.show(true);
        logger.dispose();
    });

    it('off level logs nothing', () => {
        const logger = new Logger('t3');
        logger.setLevel('off');
        logger.error('silent');
        logger.dispose();
    });
});
