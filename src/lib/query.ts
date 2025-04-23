import { JsonApiBody, JsonApiResource } from "../types/jsonapi.type";
import { fromJsonApi, Model, ModelConstructor, ModelInstance } from "./model";
import Schema from "./schema";

type ExtractDocType<T> =
  T extends Model<infer U> ? U :
  T extends Model<infer U>[] ? U :
  never;

export type FilterQuery<DocType> = {
  [P in keyof DocType]?: DocType[P];
} & {
  [key: string]: any;
}

export type IncludeQuery<DocType> = {
  [P in keyof DocType as ExtractDocType<DocType[P]> extends never ? never : P]?: IncludeQuery<ExtractDocType<DocType[P]>> | boolean;
};

export type FieldsQuery = {
  [type: string]: string[];
};

export type SortQuery<DocType> = {
  [P in keyof DocType]?: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
} & {
  [key: string]: -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';
};

interface QueryOptions<DocType> {
  op?: 'find' | 'findById' | 'findRelationship';
  id?: string;
  related?: string;
  filter?: FilterQuery<DocType>;
  include?: IncludeQuery<DocType>;
  fields?: FieldsQuery;
  sort?: SortQuery<DocType>;
  limit?: number;
  offset?: number;
}


class Query<ResultType, DocType> {

  constructor(model: ModelConstructor<DocType>) {
    this.init(model);
  }

  catch!: Promise<ResultType>['catch'];

  exec!: () => Promise<ResultType>;

  fields!: (
    fields: FieldsQuery,
  ) => this;

  filter!: (
    filter: FilterQuery<DocType>,
  ) => this;

  finally!: Promise<ResultType>['finally'];

  find!: (
    filter?: FilterQuery<DocType>,
  ) => Query<ModelInstance<DocType>[], DocType>;

  findById!: (
    id: string,
    filter?: FilterQuery<DocType>,
  ) => Query<ModelInstance<DocType>, DocType>;

  getOptions!: () => QueryOptions<DocType>;

  get!: <
    P extends {
      [K in keyof DocType]: ExtractDocType<DocType[K]> extends never ? never : K
    }[keyof DocType]
  > (
    this: Query<ModelInstance<DocType>, DocType>,
    relationship: P,
    filter?: FilterQuery<ExtractDocType<DocType[P]>>,
  ) => Query<Exclude<DocType[P], undefined>, ExtractDocType<DocType[P]>>;

  include!: (
    include: IncludeQuery<DocType>,
  ) => this;

  init!: (model: ModelConstructor<DocType>) => void;

  limit!: (
    limit: number,
  ) => this;

  model!: ModelConstructor<DocType>;

  offset!: (
    offset: number,
  ) => this;

  options!: QueryOptions<DocType>;

  schema!: Schema<DocType>;

  setOptions!: (options: QueryOptions<DocType>, overwrite?: boolean) => this;

  sort!: (
    sort: SortQuery<DocType>,
  ) => this;

  then!: Promise<ResultType>['then'];
}

Query.prototype.init = function (model) {
  this.model = model;
  this.schema = this.model.schema;

  this.options = {};
};

Query.prototype.catch = function (reject) {
  return this.exec().then(null, reject);
};

Query.prototype.exec = async function exec() {
  const client = this.model.client;

  const flattenIncludeQuery = (obj: IncludeQuery<any>, prefix = ''): string[] => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'boolean') {
        return value
          ? acc.concat(path)
          : acc;
      } else {
        const childPaths = flattenIncludeQuery(value ?? {}, path);
        return childPaths.length > 0
          ? acc.concat(childPaths)
          : acc.concat(path);
      }
    }, [] as string[]);
  };

  const options = this.getOptions();
  const params = {
    filter: options.filter,
    include: options.include
      ? flattenIncludeQuery(options.include).join(',')
      : undefined,
    fields: options.fields,
    sort: options.sort
      ? Object.entries(options.sort)
        .map(([field, order]) => {
          if (order === -1 || order === 'desc' || order === 'descending') {
            return `-${field}`;
          }
          return field;
        })
        .join(',')
      : undefined,
    page: {
      limit: options.limit,
      offset: options.offset,
    },
  };

  if (options.op === 'find') {
    const response = await client.client.get<JsonApiBody<JsonApiResource[]>>(
      `/${this.model.type}`,
      {
        params: params,
      }
    );

    return this.model.fromJsonApi(response.data);

  } else if (options.op === 'findById') {
    const response = await client.client.get<JsonApiBody<JsonApiResource | null>>(
      `/${this.model.type}/${options.id}`,
      {
        params: params,
      }
    );

    return this.model.fromJsonApi(response.data);
  } else if (options.op === 'findRelationship') {
    const response = await client.client.get<JsonApiBody<JsonApiResource | null>>(
      `/${this.model.type}/${options.id}/${options.related}`,
      {
        params: params,
      }
    );

    return fromJsonApi(response.data)
  }

  return;
};

Query.prototype.fields = function (fields) {
  this.setOptions({
    fields: fields,
  });
  return this;
}

Query.prototype.filter = function (filter) {
  this.setOptions({
    filter: filter,
  });
  return this;
};

Query.prototype.finally = function (onFinally) {
  return this.exec().finally(onFinally);
};

Query.prototype.find = function (filter) {
  this.setOptions({
    op: 'find',
    filter: filter,
  });
  return this;
};

Query.prototype.findById = function (id, filter) {
  this.setOptions({
    op: 'findById',
    id: id,
    filter: filter,
  });
  return this;
};

Query.prototype.get = function (relationship, filter) {
  this.setOptions({
    op: 'findRelationship',
    related: relationship,
    filter: filter,
  });
  return this;
};

Query.prototype.getOptions = function () {
  return this.options;
};

Query.prototype.include = function (include) {
  this.setOptions({
    include: include,
  });
  return this;
};

Query.prototype.limit = function (limit) {
  this.setOptions({
    limit: limit,
  });
  return this;
};

Query.prototype.offset = function (offset) {
  this.setOptions({
    offset: offset,
  });
  return this;
};

Query.prototype.setOptions = function (options, overwrite) {
  if (overwrite) {
    this.options = options;
    return this;
  }

  const merge = (target: any, source: any) => {
    Object.keys(source).forEach(key => {
      const s_val = source[key]
      const t_val = target[key]
      target[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
        ? merge(t_val, s_val)
        : s_val
    });
    return target;
  };

  merge(this.options, { ...options });

  return this;
};

Query.prototype.sort = function (sort) {
  this.setOptions({
    sort: sort,
  });
  return this;
};

Query.prototype.then = function (resolve, reject) {
  return this.exec().then(resolve, reject);
};


export default Query
