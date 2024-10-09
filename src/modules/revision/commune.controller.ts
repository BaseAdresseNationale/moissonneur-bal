import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/lib/admin.guard';
import { RevisionService } from '../revision/revision.service';
import { Revision } from '../revision/revision.entity';

@ApiTags('communes')
@Controller('communes')
export class CommuneController {
  constructor(private revisionService: RevisionService) {}

  @Get(':codeCommune/revisions')
  @ApiOperation({
    summary: 'Find revisions from communes',
    operationId: 'findRevisions',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Revision, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async findRevisions(
    @Param('codeCommune') codeCommune: string,
    @Res() res: Response,
  ) {
    const revisions: Revision[] = await this.revisionService.findMany({
      codeCommune,
    });
    res.status(HttpStatus.OK).json(revisions);
  }
}
