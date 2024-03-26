import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RevisionService } from './revision.service';
import { RevisionSchema, Revision } from './revision.schema';
import { RevisionMiddleware } from './revision.middleware';
import { RevisionController } from './revision.controller';
import { ConfigModule } from '@nestjs/config';
import { SourceModule } from '../source/source.module';
import { OrganizationModule } from '../organization/organization.module';
import { FileModule } from '../file/file.module';
import { ApiDepotModule } from '../api_depot/api_depot.module';
import { CommuneController } from './commune.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Revision.name, schema: RevisionSchema },
    ]),
    forwardRef(() => SourceModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => FileModule),
    forwardRef(() => ApiDepotModule),
  ],
  providers: [RevisionService],
  controllers: [RevisionController, CommuneController],
  exports: [RevisionService],
})
export class RevisionModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RevisionMiddleware).forRoutes(RevisionController);
  }
}
