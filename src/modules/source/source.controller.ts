import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
  Inject,
  forwardRef,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SourceService } from './source.service';
import { Source } from './source.schema';
import { CustomRequest } from 'src/lib/types/request.type';
import { AdminGuard } from 'src/lib/admin.guard';
import { UpdateSourceDTO } from './dto/update_source.dto';
import { RevisionService } from '../revision/revision.service';
import { Revision } from '../revision/revision.schema';
import { HarvestService } from '../harvest/harvest.service';
import { Harvest } from '../harvest/harvest.schema';
import { PageDTO } from 'src/lib/types/page.dto';
import { SourceHarvestsQuery } from './dto/source_harvests.query';
import {
  SourceHarvestsQueryPipe,
  SourceHarvestsQueryTransformed,
} from './pipe/search_query.pipe';

@ApiTags('sources')
@Controller('sources')
export class SourceController {
  constructor(
    private sourceService: SourceService,
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
    @Inject(forwardRef(() => HarvestService))
    private harvestService: HarvestService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Find all sources', operationId: 'findSources' })
  @ApiResponse({ status: HttpStatus.OK, type: Source, isArray: true })
  async findMany(@Req() req: CustomRequest, @Res() res: Response) {
    const sources: Source[] = await this.sourceService.findMany(
      {},
      { _id: 1, _updated: 1, _deleted: 1, title: 1, enabled: 1 },
    );
    res.status(HttpStatus.OK).json(sources);
  }

  @Get(':sourceId')
  @ApiOperation({ summary: 'Find one source', operationId: 'findSource' })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Source })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.source);
  }

  @Put(':sourceId')
  @ApiOperation({ summary: 'update one source', operationId: 'updateSource' })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiBody({ type: UpdateSourceDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Source })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(@Req() req: CustomRequest, @Res() res: Response) {
    const source: Source = await this.sourceService.updateOne(
      req.source._id,
      req.body,
    );
    res.status(HttpStatus.OK).json(source);
  }

  @Get(':sourceId/current-revisions')
  @ApiOperation({
    summary: 'Find current revisions by source',
    operationId: 'findCurrentRevision',
  })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Revision, isArray: true })
  async findCurrentRevision(@Req() req: CustomRequest, @Res() res: Response) {
    const revisions: Revision[] =
      await this.revisionService.getCurrentRevisionsBySource(req.source._id);
    res.status(HttpStatus.OK).json(revisions);
  }

  @Get(':sourceId/harvests')
  @ApiOperation({
    summary: 'Find harvest from source',
    operationId: 'findHarvests',
  })
  @ApiQuery({ type: SourceHarvestsQuery })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PageDTO<Harvest> })
  async findHarvests(
    @Req() req: CustomRequest,
    @Query(SourceHarvestsQueryPipe)
    { limit, offset }: SourceHarvestsQueryTransformed,
    @Res() res: Response,
  ) {
    const harvests: Harvest[] = await this.harvestService.findMany(
      {
        sourceId: req.source._id,
      },
      null,
      limit,
      offset,
    );
    const count: number = await this.harvestService.count({
      sourceId: req.source._id,
    });
    const page: PageDTO<Harvest> = {
      results: harvests,
      count,
      limit,
      offset,
    };
    res.status(HttpStatus.OK).json(page);
  }
}
