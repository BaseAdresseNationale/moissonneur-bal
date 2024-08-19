import {
  Controller,
  Get,
  Res,
  Req,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CustomRequest } from 'src/lib/types/request.type';
import { RevisionService } from '../revision/revision.service';
import { Revision } from '../revision/revision.schema';
import { Harvest } from '../harvest/harvest.schema';

@ApiTags('harvests')
@Controller('harvests')
export class HarvestController {
  constructor(
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
  ) {}

  @Get(':harvestId')
  @ApiOperation({ summary: 'Find one harvest', operationId: 'findOne' })
  @ApiResponse({ status: HttpStatus.OK, type: Harvest })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.harvest);
  }

  @Get(':sourceId/revisions')
  @ApiOperation({ summary: 'Find one source', operationId: 'findRevisions' })
  @ApiParam({ name: 'sourceId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Revision, isArray: true })
  async findRevisions(@Req() req: CustomRequest, @Res() res: Response) {
    const revisions: Revision[] = await this.revisionService.findMany({
      harvestId: req.harvest.id,
    });
    res.status(HttpStatus.OK).json(revisions);
  }
}
