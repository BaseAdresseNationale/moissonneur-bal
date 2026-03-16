import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Organization } from '../organization/organization.entity';
import { Perimeter } from '../organization/perimeters.entity';

type PerimeterPayload = Pick<Perimeter, 'type' | 'code'>;

type ClientPayload = {
  clientId: string;
  name: string;
  type: 'moissonneur-bal';
  perimeters: PerimeterPayload[];
};

@Injectable()
export class BalAdminService {
  private readonly logger = new Logger(BalAdminService.name);

  constructor(private readonly httpService: HttpService) {}

  private buildPayload(organization: Organization): ClientPayload {
    return {
      clientId: organization.id,
      name: organization.name,
      type: 'moissonneur-bal',
      perimeters: (organization.perimeters ?? []).map(({ type, code }) => ({
        type,
        code,
      })),
    };
  }

  async createClient(organization: Organization): Promise<void> {
    await firstValueFrom(
      this.httpService
        .post<void>('/clients', this.buildPayload(organization))
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Impossible de créer le client bal-admin pour l'organisation ${organization.id}`,
              error.message,
            );
            return [];
          }),
        ),
    );
  }

  async updateClientPerimeters(organization: Organization): Promise<void> {
    await firstValueFrom(
      this.httpService
        .put<void>(
          `/clients/${organization.id}`,
          this.buildPayload(organization),
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Impossible de mettre à jour les périmètres bal-admin pour l'organisation ${organization.id}`,
              error.message,
            );
            return [];
          }),
        ),
    );
  }

  async deleteClient(organizationId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete<void>(`/clients/${organizationId}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(
            `Impossible de supprimer le client bal-admin pour l'organisation ${organizationId}`,
            error.message,
          );
          return [];
        }),
      ),
    );
  }

  async restoreClient(organizationId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.put<void>(`/clients/${organizationId}/restore`, {}).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(
            `Impossible de restaurer le client bal-admin pour l'organisation ${organizationId}`,
            error.message,
          );
          return [];
        }),
      ),
    );
  }
}
