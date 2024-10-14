import { Logger, Module } from '@nestjs/common';

import { ApiBetaGouvService } from './api_beta_gouv.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('URL_API_DATA_GOUV'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiBetaGouvService],
  controllers: [],
  exports: [ApiBetaGouvService],
})
export class ApiBetaGouvModule {}
