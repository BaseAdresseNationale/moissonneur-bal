export interface PageDataGouv {
  data: DatasetDataGouv[];
  next_page: string | null;
  page: number;
  page_size: number;
  previous_page: string | null;
  total: number;
}

export interface RessourceDataGouv {
  id: string;
  format: string;
  url: string;
  last_modified: Date;
}

export interface OrganizationDataGouv {
  badges: {
    kind: string;
  }[];
  id: string;
  logo: string;
  name: string;
  page: string;
}

export interface DatasetDataGouv {
  description: string;
  id: string;
  title: string;
  license: string;
  organization: OrganizationDataGouv;
  resources: RessourceDataGouv[];
  archived: boolean | null;
}
