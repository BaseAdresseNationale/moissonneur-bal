import { Logger, Module } from '@nestjs/common';

import { QueueService } from './queue.service';

@Module({
  imports: [],
  providers: [QueueService, Logger],
  controllers: [],
  exports: [QueueService],
})
export class QueueModule {}
