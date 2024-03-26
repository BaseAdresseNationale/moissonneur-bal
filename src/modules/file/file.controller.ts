import { Controller, Get, Res, HttpStatus, Param } from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { FileService } from './file.service';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(private fileService: FileService) {}

  @Get(':fileId/download')
  @ApiOperation({
    summary: 'Download ile',
    operationId: 'findMany',
  })
  @ApiParam({ name: 'fileId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Buffer })
  async findMany(@Param('fileId') fileId: string, @Res() res: Response) {
    const file: Buffer = await this.fileService.getFile(fileId);
    res
      .status(HttpStatus.OK)
      .attachment(`bal-${fileId}.csv`)
      .type('csv')
      .send(file);
  }
}
