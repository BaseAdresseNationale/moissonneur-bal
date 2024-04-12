import {
  Perimeter,
  TypePerimeterEnum,
} from 'src/modules/organization/organization.schema';
import { communeIsInPerimeters } from '../perimeters';

describe('PERIMETERS UTILS', () => {
  it('communeIsInPerimeters perimeters empty false', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeFalsy();
  });

  it('communeIsInPerimeters commune', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.COMMUNE,
        code: commune,
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeTruthy();
  });

  it('communeIsInPerimeters commune false', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.COMMUNE,
        code: '91400',
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeFalsy();
  });

  it('communeIsInPerimeters departement', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.DEPARTEMENT,
        code: '44',
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeTruthy();
  });

  it('communeIsInPerimeters departement false', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.DEPARTEMENT,
        code: '46',
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeFalsy();
  });

  it('communeIsInPerimeters epci', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.EPCI,
        code: '244400404',
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeTruthy();
  });

  it('communeIsInPerimeters epci false', async () => {
    const commune: string = '44198';
    const perimeters: Perimeter[] = [
      {
        type: TypePerimeterEnum.EPCI,
        code: '244400405',
      },
    ];
    const res: boolean = communeIsInPerimeters(commune, perimeters);

    expect(res).toBeFalsy();
  });
});
