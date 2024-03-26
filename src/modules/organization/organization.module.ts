import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './organization.schema';
import { SourceModule } from '../source/source.module';
import { OrganizationController } from './organization.controller';
import { ConfigModule } from '@nestjs/config';
import { OrganizationMiddleware } from './organization.middleware';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
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
