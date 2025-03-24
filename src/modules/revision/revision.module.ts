import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RevisionService } from './revision.service';
import { RevisionMiddleware } from './revision.middleware';
import { RevisionController } from './revision.controller';
import { ConfigModule } from '@nestjs/config';
import { SourceModule } from '../source/source.module';
import { OrganizationModule } from '../organization/organization.module';
import { FileModule } from '../file/file.module';
import { ApiDepotModule } from '../api_depot/api_depot.module';
import { CommuneController } from './commune.controller';
import { Revision } from './revision.entity';
import { ValidateurApiModule } from '../validateur_api/validateur_api.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Revision]),
    ValidateurApiModule,
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
