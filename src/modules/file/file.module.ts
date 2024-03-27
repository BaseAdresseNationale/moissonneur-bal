import { Module } from '@nestjs/common';

import { FileService } from './file.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [FileService],
  controllers: [],
  exports: [FileService],
})
export class FileModule {}
