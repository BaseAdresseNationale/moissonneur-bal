import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Inject,
  forwardRef,
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
} from '@nestjs/swagger';
import ValidateurBal from '@ban-team/validateur-bal';
import { CustomRequest } from 'src/lib/types/request.type';
import { AdminGuard } from 'src/lib/admin.guard';
import { RevisionService } from '../revision/revision.service';
import { Revision, StatusPublicationEnum } from '../revision/revision.schema';
import { PublishRevisionDTO } from './dto/publish_revision.dto';
import { SourceService } from '../source/source.service';
import { FileService } from '../file/file.service';
import { ApiDepotService } from '../api_depot/api_depot.service';
import { OrganizationService } from '../organization/organization.service';

@ApiTags('revisions')
@Controller('revisions')
export class RevisionController {
  constructor(
    private revisionService: RevisionService,
    @Inject(forwardRef(() => SourceService))
    private sourceService: SourceService,
    @Inject(forwardRef(() => OrganizationService))
    private organizationService: OrganizationService,
    @Inject(forwardRef(() => FileService))
    private fileService: FileService,
    @Inject(forwardRef(() => ApiDepotService))
    private apiDepotService: ApiDepotService,
  ) {}

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
  async askHarvest(@Req() req: CustomRequest, @Res() res: Response) {
    const { force }: PublishRevisionDTO = req.body;
    const revison: Revision = req.revision;
    const source = await this.sourceService.findOneOrFail(revison.sourceId);
    const organization = await this.organizationService.findOneOrFail(
      source.organizationId,
    );
    if (!revison.current) {
      throw new HttpException(
        'La révision n’est pas la révision courante pour cette commune',
        HttpStatus.CONFLICT,
      );
    }

    if (
      !force &&
      ![
        StatusPublicationEnum.PUBLISHED,
        StatusPublicationEnum.PROVIDED_BY_OTHER_CLIENT,
        StatusPublicationEnum.PROVIDED_BY_OTHER_SOURCE,
      ].includes(revison.publication.status)
    ) {
      throw new HttpException(
        'La révision ne peut pas être publiée',
        HttpStatus.CONFLICT,
      );
    }

    if (!source.enabled || source._deleted) {
      throw new HttpException(
        'La source associée n’est plus active',
        HttpStatus.CONFLICT,
      );
    }

    let file = null;
    try {
      file = await this.fileService.getFile(revison.fileId.toHexString());
    } catch {
      throw new HttpException(
        'Le fichier BAL associé n’est plus disponible',
        HttpStatus.CONFLICT,
      );
    }

    const validationResult = await ValidateurBal.validate(file, {
      profile: '1.3-relax',
    });

    if (
      !validationResult.parseOk ||
      validationResult.rows.length !== revison.nbRows
    ) {
      throw new HttpException(
        'Problème de cohérence des données : investigation nécessaire',
        HttpStatus.CONFLICT,
      );
    }

    try {
      // ON ESSAYE DE PUBLIER LA BAL SUR L'API-DEPOT
      revison.publication = await this.apiDepotService.publishBal(
        revison,
        file,
        organization,
        { force },
      );
    } catch (error) {
      revison.publication = {
        status: StatusPublicationEnum.ERROR,
        errorMessage: error.message,
      };
    }

    const result: Revision = await this.revisionService.updateOne(
      revison._id.toHexString(),
      { publication: revison.publication },
    );

    res.status(HttpStatus.OK).json(result);
  }
}
