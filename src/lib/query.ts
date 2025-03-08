import { JsonApiBody, JsonApiResource } from "../types/jsonapi.type";
import { Model, TModel } from "./model";
import Schema from "./schema";

export type FilterQuery<DocType> = {
  [P in keyof DocType]?: DocType[P];
} & {
  [key: string]: any;
}

interface QueryOptions<DocType> {
  op?: 'find' | 'findById';
  id?: string;
  filter?: FilterQuery<DocType>;
  include?: string[];
  fields?: {
    [type: string]: string[];
  };
  sort?: string[];
  limit?: number;
  offset?: number;
}


class Query<ResultType, DocType> {

  constructor(model: TModel<DocType>) {
    this.init(model);
  }

  catch!: Promise<ResultType>['catch'];

  exec!: () => Promise<ResultType>;

  fields!: (
    fields: {
      [type: string]: string[];
    },
  ) => this;

  finally!: Promise<ResultType>['finally'];

  find!: (
    filter?: FilterQuery<DocType>,
  ) => Query<Model<DocType>[], DocType>;

  findById!: (
    id: string,
    filter?: FilterQuery<DocType>,
  ) => Query<Model<DocType>, DocType>;

  getOptions!: () => QueryOptions<DocType>;

  include!: (
    fields: string[],
  ) => this;

  init!: (model: TModel<DocType>) => void;

  limit!: (
    limit: number,
  ) => this;

  model!: TModel<DocType>;

  offset!: (
    offset: number,
  ) => this;

  options!: QueryOptions<DocType>;

  schema!: Schema<DocType>;

  setOptions!: (options: QueryOptions<DocType>, overwrite?: boolean) => this;

  sort!: (
    fields: string[],
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

  const options = this.getOptions();

  if (options.op === 'find') {
    return client.client.get<
      JsonApiBody<JsonApiResource[]>
    >(
      `/${this.model.type}`,
      {
        params: {
          filter: options.filter,
          include: options.include?.join(','),
          fields: options.fields,
          sort: options.sort?.join(','),
          page: {
            limit: options.limit,
            offset: options.offset,
          },
        },
      }
    )
      .then((response) => this.model.fromJsonApi(response.data));

  } else if (options.op === 'findById') {
    return client.client.get<
      JsonApiBody<JsonApiResource | null>
    >(
      `/${this.model.type}/${options.id}`,
      {
        params: {
          filter: options.filter,
          include: options.include?.join(','),
          fields: options.fields,
          sort: options.sort?.join(','),
          page: {
            limit: options.limit,
            offset: options.offset,
          },
        },
      }
    )
      .then((response) => this.model.fromJsonApi(response.data));
  }

  return;
};

Query.prototype.fields = function (fields) {
  this.setOptions({
    fields: fields,
  });
  return this;
}

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

Query.prototype.getOptions = function () {
  return this.options;
};

Query.prototype.include = function (fields) {
  this.setOptions({
    include: fields,
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

Query.prototype.sort = function (fields) {
  this.setOptions({
    sort: fields,
  });
  return this;
};

Query.prototype.then = function (resolve, reject) {
  return this.exec().then(resolve, reject);
};


export default Query
