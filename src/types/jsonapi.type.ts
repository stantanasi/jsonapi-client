export interface JsonApiQueryParams {
  include?: string;
  fields?: {
    [type: string]: string;
  };
  sort?: string;
  page?: {
    offset?: number;
    limit?: number;
  };
  filter?: {
    [type: string]: string;
  };
}


export interface JsonApiBody<DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null> {
  jsonapi?: {
    version: string;
  };
  data?: DataType;
  included?: JsonApiResource[];
  meta?: {
    count: number;
  } | any;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
  errors?: JsonApiError[];
}

export interface JsonApiError {
  id?: string;
  links?: {
    about?: string;
  };
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  meta?: any;
}

export interface JsonApiIdentifier {
  type: string;
  id: string;
}

export interface JsonApiResource {
  type: string;
  id?: string;
  links?: {
    self?: string;
    related?: string;
  };
  attributes?: {
    [attribute: string]: any;
  };
  relationships?: {
    [relationship: string]: {
      links?: {
        self?: string;
        related?: string;
      };
      data?: JsonApiIdentifier | JsonApiIdentifier[] | null;
      meta?: any;
    };
  };
  meta?: any;
}