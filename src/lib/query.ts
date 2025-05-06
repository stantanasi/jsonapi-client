import { JsonApiBody, JsonApiQueryParams, JsonApiResource } from "../types/jsonapi.type";
import { fromJsonApi, Model, ModelConstructor, ModelInstance, models } from "./model";
import Schema from "./schema";

type RawResultType<T> = {
  result: T;
  body: JsonApiBody<T extends ModelInstance<unknown>[] ? JsonApiResource[] : JsonApiResource>;
}

type ExtractDocType<T> =
  T extends Model<infer DocType> ? DocType :
  T extends Model<infer DocType>[] ? DocType :
  never;

type GraphitiComparator = {
  CaseSensitiveEqual: "eql",
  CaseInsensitiveEqual: "eq",
  GreaterThan: "gt",
  GreaterThanOrEqual: "gte",
  LessThan: "lt",
  LessThanOrEqual: "lte",
  Match: "match", // fuzzy/search
  Prefix: "prefix",
  Suffix: "suffix",
};
type GraphitiComparisonOperators = GraphitiComparator[keyof GraphitiComparator];
type Comparator<DocType, K extends keyof DocType> = Record<GraphitiComparisonOperators, DocType[K] | DocType[K][]>;

export type FilterQuery<DocType> = {
  [P in keyof DocType]?: DocType[P] | Partial<Comparator<DocType, P>>;
} & {
  [key: string]: any;
};

export type IncludeQuery<DocType> = {
  [P in keyof DocType as ExtractDocType<DocType[P]> extends never ? never : P]?: IncludeQuery<ExtractDocType<DocType[P]>> | boolean;
} & {
  [key: string]: IncludeQuery<any> | boolean;
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
  raw?: boolean;
  queryParams?: Record<string, any>;
}


class Query<ResultType, DocType> {

  constructor(model: ModelConstructor<DocType>) {
    this.init(model);
  }

  buildParams!: () => JsonApiQueryParams;

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

  queryParams!: (
    params: Record<string, any>,
  ) => this;

  raw!: () => this extends Query<infer ResultType, infer ResultDocType>
    ? ResultType extends RawResultType<any> ? this : Query<RawResultType<ResultType>, ResultDocType>
    : never;

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

Query.prototype.buildParams = function () {
  const options = this.getOptions();

  const getJsonApiName = (
    key: string,
    schema?: Schema<any>,
  ): string => {
    if (schema?.attributes[key]) {
      return schema.attributes[key].name ?? key;
    } else if (schema?.relationships[key]) {
      return schema.relationships[key].name ?? key;
    }
    return key;
  };

  const buildFilterParams = (
    filter: FilterQuery<any>,
    schema?: Schema<any>,
  ): JsonApiQueryParams['filter'] => {
    return Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [getJsonApiName(key, schema), value])
    );
  };

  const buildIncludeParams = (
    include: IncludeQuery<any>,
    schema?: Schema<any>,
  ): JsonApiQueryParams['include'] => {
    const flattenInclude = (
      obj: IncludeQuery<any>,
      schema?: Schema<any>,
      prefix = '',
    ): string[] => {
      return Object.entries(obj).flatMap(([key, value]) => {
        let name = schema?.relationships[key]?.name ?? key;
        const path = prefix ? `${prefix}.${name}` : name;

        if (typeof value === 'boolean') {
          return value ? [path] : [];
        }

        const subType = schema?.relationships[key]?.type;
        const subSchema = Array.isArray(subType)
          ? models[subType[0]].schema
          : subType
            ? models[subType].schema
            : undefined;

        const subPaths = flattenInclude(value ?? {}, subSchema, path);
        return subPaths.length ? subPaths : [path];
      });
    };

    return flattenInclude(include, schema).join(',');
  };

  const buildFieldsParams = (
    fields: FieldsQuery,
  ): JsonApiQueryParams['fields'] => {
    return Object.fromEntries(
      Object.entries(fields).map(([type, list]) => {
        const schema = models[type]?.schema;

        const names = list
          .map((field) => getJsonApiName(field, schema))
          .join(',');

        return [type, names];
      })
    );
  };

  const buildSortParams = (
    sort: SortQuery<any>,
    schema?: Schema<any>,
  ): JsonApiQueryParams['sort'] => {
    return Object.entries(sort)
      .map(([key, order]) => {
        let name = getJsonApiName(key, schema)

        if (order === -1 || order === 'desc' || order === 'descending') {
          return `-${name}`;
        }
        return name;
      })
      .join(',');
  };

  const getSchema = () => {
    if (options.op === 'findRelationship' && options.related) {
      const property = this.model.schema.relationships[options.related];
      return Array.isArray(property?.type)
        ? models[property.type[0]].schema
        : property?.type
          ? models[property.type].schema
          : undefined;
    }
    return this.model.schema;
  };
  const schema = getSchema();

  return {
    filter: options.filter ? buildFilterParams(options.filter, schema) : undefined,
    include: options.include ? buildIncludeParams(options.include, schema) : undefined,
    fields: options.fields ? buildFieldsParams(options.fields) : undefined,
    sort: options.sort ? buildSortParams(options.sort, schema) : undefined,
    page: {
      limit: options.limit,
      offset: options.offset,
    },
    ...options.queryParams,
  };
};

Query.prototype.catch = function (reject) {
  return this.exec().then(null, reject);
};

Query.prototype.exec = async function exec() {
  const client = this.model.client;

  const options = this.getOptions();

  if (options.op === 'find') {
    const response = await client.client.get<JsonApiBody<JsonApiResource[]>>(
      `/${this.model.type}`,
      {
        params: this.buildParams(),
      }
    );

    if (options.raw) {
      return {
        result: this.model.fromJsonApi(response.data),
        body: response.data,
      } as RawResultType<ModelInstance<unknown>[]>;
    }

    return this.model.fromJsonApi(response.data);
  } else if (options.op === 'findById') {
    const response = await client.client.get<JsonApiBody<JsonApiResource | null>>(
      `/${this.model.type}/${options.id}`,
      {
        params: this.buildParams(),
      }
    );

    if (options.raw) {
      return {
        result: this.model.fromJsonApi(response.data),
        body: response.data,
      } as RawResultType<ModelInstance<unknown>>;
    }

    return this.model.fromJsonApi(response.data);
  } else if (options.op === 'findRelationship' && options.related) {
    const property = this.model.schema.relationships[options.related];
    const relationship = property?.name ?? options.related;

    const response = await client.client.get<JsonApiBody<JsonApiResource | null>>(
      `/${this.model.type}/${options.id}/${relationship}`,
      {
        params: this.buildParams(),
      }
    );

    if (options.raw) {
      return {
        result: fromJsonApi(response.data),
        body: response.data,
      } as RawResultType<ModelInstance<unknown> | ModelInstance<unknown>[]>;
    }

    return fromJsonApi(response.data);
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

Query.prototype.queryParams = function (params) {
  this.setOptions({
    queryParams: params,
  });
  return this;
};

Query.prototype.raw = function () {
  this.setOptions({
    raw: true,
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
