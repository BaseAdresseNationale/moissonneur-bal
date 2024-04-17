import {
  Controller,
  Get,
  Put,
  Post,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Inject,
  forwardRef,
  Query,
  HttpException,
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
import { PageDTO } from 'src/lib/class/page.dto';
import { SourceHarvestsQuery } from './dto/source_harvests.query';
import {
  SourceHarvestsQueryPipe,
  SourceHarvestsQueryTransformed,
} from './pipe/search_query.pipe';
import { QueueService } from '../queue/queue.service';
import { HarvestingWorker } from '../worker/workers/harvesting.worker';
import { PipelineStage } from 'mongoose';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';
import { AggregateRevision } from '../revision/dto/aggregation_revision.dto';

@ApiTags('sources')
@Controller('sources')
export class SourceController {
  constructor(
    private sourceService: SourceService,
    private queueService: QueueService,
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
    @Inject(forwardRef(() => HarvestService))
    private harvestService: HarvestService,
    @Inject(forwardRef(() => HarvestingWorker))
    private harvestingWorker: HarvestingWorker,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Find many sources', operationId: 'findMany' })
  @ApiResponse({ status: HttpStatus.OK, type: Source, isArray: true })
  async findMany(@Res() res: Response) {
    const sources: Source[] = await this.sourceService.findMany(
      {},
      { _id: 1, _updated: 1, _deleted: 1, title: 1, enabled: 1 },
    );
    res.status(HttpStatus.OK).json(sources);
  }

  @Get(':sourceId')
  @ApiOperation({ summary: 'Find one source', operationId: 'findOne' })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Source })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.source);
  }

  @Put(':sourceId')
  @ApiOperation({ summary: 'update one source', operationId: 'updateOne' })
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
    const revisions: Revision[] = await this.revisionService.findMany({
      sourceId: req.source._id,
      current: true,
    });
    res.status(HttpStatus.OK).json(revisions);
  }

  @Get(':sourceId/last-updated-revisions')
  @ApiOperation({
    summary: 'Find last revisions by source',
    operationId: 'findLastUpdatedRevision',
  })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AggregateRevision,
    isArray: true,
  })
  async findLastRevision(@Req() req: CustomRequest, @Res() res: Response) {
    const aggregation: PipelineStage[] = [
      {
        $match: {
          sourceId: req.source._id,
          $or: [
            {
              updateStatus: StatusUpdateEnum.UNCHANGED,
              publication: { $ne: null },
            },
            { updateStatus: { $ne: StatusUpdateEnum.UNCHANGED } },
          ],
        },
      },
      { $sort: { _created: 1 } },
      {
        $group: {
          _id: '$codeCommune',
          id: { $last: '$_id' },
          codeCommune: { $last: '$codeCommune' },
          sourceId: { $last: '$sourceId' },
          harvestId: { $last: '$harvestId' },
          updateStatus: { $last: '$updateStatus' },
          updateRejectionReason: { $last: '$updateRejectionReason' },
          fileId: { $last: '$fileId' },
          dataHash: { $last: '$dataHash' },
          nbRows: { $last: '$nbRows' },
          nbRowsWithErrors: { $last: '$nbRowsWithErrors' },
          uniqueErrors: { $last: '$uniqueErrors' },
          current: { $last: '$current' },
          publication: { $last: '$publication' },
          _created: { $last: '$_created' },
        },
      },
    ];
    const revisions: AggregateRevision[] =
      await this.revisionService.aggregate(aggregation);
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
      { startedAt: 'desc' },
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

  @Post(':sourceId/harvest')
  @ApiOperation({
    summary: 'Ask harvest of source',
    operationId: 'askHarvest',
  })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Source })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async askHarvest(@Req() req: CustomRequest, @Res() res: Response) {
    if (req.source.harvesting.harvestingSince !== null) {
      throw new HttpException('Moissonnage en cours', HttpStatus.NOT_FOUND);
    }

    if (!req.source.enabled) {
      throw new HttpException(`Source inactive`, HttpStatus.NOT_FOUND);
    }

    if (req.source._deleted) {
      throw new HttpException(`Source archivée`, HttpStatus.NOT_FOUND);
    }

    this.queueService.pushTask(
      this.harvestingWorker,
      `Harvesting of source ${req.source._id}`,
      req.source._id,
    );

    res.status(HttpStatus.OK).json(req.source);
  }
}
