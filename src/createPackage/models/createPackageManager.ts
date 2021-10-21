import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { SERVICES } from '../../common/constants';

@injectable()
export class CreatePackageManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}
}
