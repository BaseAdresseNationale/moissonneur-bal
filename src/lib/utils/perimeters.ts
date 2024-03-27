import {
  Perimeter,
  TypePerimeterEnum,
} from 'src/modules/organization/organization.schema';
import {
  getCommunesByDepartement,
  getCommune,
  getEPCI,
  isArrondissement,
} from './cog';
import { CommuneCOG, EpciCOG } from '../types/cog';

function isInDepartement(departement: string, codeCommune: string): boolean {
  const communeByDepartement: CommuneCOG[] =
    getCommunesByDepartement(departement);
  return (
    communeByDepartement &&
    communeByDepartement.some(({ code }) => code === codeCommune)
  );
}

function isInEPCI(siren: string, codeCommune: string): boolean {
  const epci: EpciCOG = getEPCI(siren);
  return epci.membres && epci.membres.some(({ code }) => code === codeCommune);
}

export function communeIsInPerimeters(
  codeInsee: string,
  perimeters: Perimeter[],
) {
  const codeCommune: string = isArrondissement(codeInsee)
    ? getCommune(codeInsee).commune
    : codeInsee;

  return perimeters.some(({ type, code }) => {
    if (type === TypePerimeterEnum.COMMUNE && code === codeCommune) {
      return true;
    }

    if (
      type === TypePerimeterEnum.DEPARTEMENT &&
      isInDepartement(code, codeCommune)
    ) {
      return true;
    }

    if (type === TypePerimeterEnum.EPCI && isInEPCI(code, codeCommune)) {
      return true;
    }

    return false;
  });
}
