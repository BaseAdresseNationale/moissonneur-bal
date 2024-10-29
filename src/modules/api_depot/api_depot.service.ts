import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  Publication,
  Revision,
  StatusPublicationEnum,
} from '../revision/revision.entity';
import { Revision as RevisionApiDepot } from '../../lib/types/api-depot.types';
import { Organization } from '../organization/organization.entity';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, firstValueFrom, of } from 'rxjs';
import hasha from 'hasha';

@Injectable()
export class ApiDepotService {
  private API_DEPOT_CLIENT_ID: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {
    this.API_DEPOT_CLIENT_ID = this.configService.get<string>(
      'API_DEPOT_CLIENT_ID',
    );
  }

  private async getCurrentRevision(
    codeCommune: string,
  ): Promise<RevisionApiDepot> {
    const url: string = `/communes/${codeCommune}/current-revision`;
    const options: AxiosRequestConfig = { responseType: 'json' };
    const { data: revision } = await firstValueFrom(
      this.httpService.get<any>(url, options).pipe(
        catchError((error: AxiosError) => {
          if (error.response && error.response.status === 404) {
            return of({ data: null });
          }
          this.logger.error(
            `Impossible de récupérer la revision courante de la commune ${codeCommune}`,
            { reponse: error.response?.data || 'No server response' },
            ApiDepotService.name,
          );
          throw error;
        }),
      ),
    );
    return revision;
  }

  private async createRevision(
    codeCommune: string,
    extras: any,
    organisation: string,
  ): Promise<RevisionApiDepot> {
    const url: string = `/communes/${codeCommune}/revisions`;
    const options: AxiosRequestConfig = { responseType: 'json' };
    const body = { context: { extras, organisation } };

    const { data } = await firstValueFrom(
      this.httpService.post<any>(url, body, options).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );

    return data;
  }

  private async uploadFileRevision(revisionId: string, balFile: Buffer) {
    const fileHash: string = hasha(balFile, { algorithm: 'md5' });
    const url: string = `/revisions/${revisionId}/files/bal`;
    const options: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/csv',
        'Content-MD5': fileHash,
      },
    };

    return firstValueFrom(
      this.httpService.put<any>(url, balFile, options).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
  }

  private async computeRevision(revisionId: string) {
    const url: string = `/revisions/${revisionId}/compute`;
    const { data }: AxiosResponse = await firstValueFrom(
      this.httpService.post<any>(url).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
    if (!data.validation.valid) {
      throw new HttpException(
        'Fichier BAL rejeté par api-depot',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  private async publishRevision(revisionId: string): Promise<RevisionApiDepot> {
    const url: string = `/revisions/${revisionId}/publish`;

    const { data }: AxiosResponse = await firstValueFrom(
      this.httpService.post<Buffer>(url).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );

    return data;
  }

  async publishBal(
    { sourceId, codeCommune, harvestId, validation }: Partial<Revision>,
    file: Buffer,
    organization: Organization,
    options: { force?: boolean } = {},
  ): Promise<Publication> {
    if (!this.API_DEPOT_CLIENT_ID) {
      return { status: StatusPublicationEnum.NOT_CONFIGURED };
    }
    // RECUPERE LA REVISION COURANTE DE L API-DEPOT
    const currentPublishedRevision = await this.getCurrentRevision(codeCommune);
    // CHECK SI IL EXISTE DEJA UN AUTRE CLIENT DE L API DEPOT POUR LA COMMUNE
    if (
      !options.force &&
      currentPublishedRevision?.client &&
      currentPublishedRevision?.client?.legacyId !== this.API_DEPOT_CLIENT_ID
    ) {
      return {
        status: StatusPublicationEnum.PROVIDED_BY_OTHER_CLIENT,
        currentClientId: currentPublishedRevision.client.id,
      };
    }
    // CHECK SI IL EXISTE UNE AUTRE SOURCE QUI MOISSONE CETTE COMMUNE
    if (
      !options.force &&
      currentPublishedRevision?.context?.extras?.sourceId &&
      !currentPublishedRevision?.context?.extras?.sourceId?.includes(
        sourceId.toString(),
      )
    ) {
      return {
        status: StatusPublicationEnum.PROVIDED_BY_OTHER_SOURCE,
        currentSourceId: currentPublishedRevision.context.extras.sourceId,
      };
    }
    // POUR PUBLIER SUR L API_DEPOT IL Y A UN ENSSEMBLE DE 4 REQUETES
    try {
      const extras = {
        sourceId,
        harvestId,
        nbRows: validation.nbRows,
        nbRowsWithErrors: validation.nbRowsWithErrors,
        uniqueErrors: validation.uniqueErrors,
      };
      // ON CREER UNE REVISION POUR LA COMMUNE
      const { id: revisionId } = await this.createRevision(
        codeCommune,
        extras,
        organization.name,
      );
      // ON ATTACHE LE FICHIER BAL A LA NOUVELLE REVISION
      await this.uploadFileRevision(revisionId, file);
      // ON VERIFIE QUE TOUTES LES INFO DE LA REVISION ET DU FICHIER RATTACHE SONT CONFORME
      await this.computeRevision(revisionId);
      // ON PUBLIE LA REVISION
      const publishedRevision = await this.publishRevision(revisionId);
      return {
        status: StatusPublicationEnum.PUBLISHED,
        publishedRevisionId: publishedRevision.id,
      };
    } catch (error) {
      this.logger.error(
        `Une erreur est survenu pendant la publication pour la commune ${codeCommune} et le harvest ${harvestId}`,
        error,
      );
      return {
        status: StatusPublicationEnum.ERROR,
        errorMessage: error.message,
      };
    }
  }
}
