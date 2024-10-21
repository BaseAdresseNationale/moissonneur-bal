import {
  Controller,
  Get,
  Put,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Inject,
  forwardRef,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SourceService } from '../source/source.service';
import { CustomRequest } from 'src/lib/types/request.type';
import { AdminGuard } from 'src/lib/admin.guard';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationDTO } from './dto/update_organization.dto';
import { Source } from '../source/source.entity';
import { ExtendedSourceDTO } from '../source/dto/extended_source.dto';
import { Organization } from './organization.entity';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private organizationService: OrganizationService,
    @Inject(forwardRef(() => SourceService))
    private sourceService: SourceService,
  ) {}

  @Get('')
  @ApiOperation({
    summary: 'Find all organizations',
    operationId: 'findMany',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Organization, isArray: true })
  async findMany(@Req() req: CustomRequest, @Res() res: Response) {
    const organizations: Organization[] =
      await this.organizationService.findMany({});
    res.status(HttpStatus.OK).json(organizations);
  }

  @Get(':organizationId')
  @ApiOperation({
    summary: 'Find one organization',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'organizationId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Organization })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.organization);
  }

  @Put(':organizationId')
  @ApiOperation({
    summary: 'update one organization',
    operationId: 'updateOne',
  })
  @ApiParam({ name: 'organizationId', required: true, type: String })
  @ApiBody({ type: UpdateOrganizationDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Organization })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(
    @Req() req: CustomRequest,
    @Body() body: UpdateOrganizationDTO,
    @Res() res: Response,
  ) {
    const organization: Organization = await this.organizationService.updateOne(
      req.organization.id,
      body,
    );
    res.status(HttpStatus.OK).json(organization);
  }

  @Get('/:organizationId/sources')
  @ApiOperation({
    summary: 'Find sources from Organization',
    operationId: 'findSources',
  })
  @ApiParam({ name: 'organizationId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtendedSourceDTO,
    isArray: true,
  })
  async findSources(@Req() req: CustomRequest, @Res() res: Response) {
    const sources: Source[] = await this.sourceService.findMany(
      { organizationId: req.organization.id },
      {
        id: true,
        updatedAt: true,
        deletedAt: true,
        title: true,
        enabled: true,
      },
      true,
    );
    const extendedSources: ExtendedSourceDTO[] =
      await this.sourceService.extendMany(sources);
    res.status(HttpStatus.OK).json(extendedSources);
  }
}
