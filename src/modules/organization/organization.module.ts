import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';

import { OrganizationService } from './organization.service';
import { SourceModule } from '../source/source.module';
import { OrganizationController } from './organization.controller';
import { ConfigModule } from '@nestjs/config';
import { OrganizationMiddleware } from './organization.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Organization]),
    forwardRef(() => SourceModule),
  ],
  providers: [OrganizationService],
  controllers: [OrganizationController],
  exports: [OrganizationService],
})
export class OrganizationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OrganizationMiddleware).forRoutes(OrganizationController);
  }
}
