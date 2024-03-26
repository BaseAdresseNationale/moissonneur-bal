import { Module } from '@nestjs/common';

import { QueueService } from './queue.service';

@Module({
  imports: [],
  providers: [QueueService],
  controllers: [],
  exports: [QueueService],
})
export class QueueModule {}
