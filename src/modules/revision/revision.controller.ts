import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
  HttpStatus,
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

import { CustomRequest } from 'src/lib/types/request.type';
import { AdminGuard } from 'src/lib/admin.guard';
import { RevisionService } from '../revision/revision.service';
import { Revision } from '../revision/revision.schema';
import { PublishRevisionDTO } from './dto/publish_revision.dto';

@ApiTags('revisions')
@Controller('revisions')
export class RevisionController {
  constructor(private revisionService: RevisionService) {}

  @Get(':revisionId')
  @ApiOperation({ summary: 'Find one revision', operationId: 'findOne' })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Revision })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.revision);
  }

  @Post(':revisionId/publish')
  @ApiOperation({
    summary: 'Publish revison',
    operationId: 'publish',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiBody({ type: PublishRevisionDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Revision })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async publish(
    @Req() req: CustomRequest,
    @Body() body: PublishRevisionDTO,
    @Res() res: Response,
  ) {
    const result: Revision = await this.revisionService.publish(
      req.revision,
      body.force,
    );

    res.status(HttpStatus.OK).json(result);
  }
}
