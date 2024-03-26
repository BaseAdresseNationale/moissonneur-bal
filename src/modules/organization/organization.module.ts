import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  providers: [OrganizationService],
  controllers: [],
  exports: [OrganizationService],
})
export class OrganizationModule {}
