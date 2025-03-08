import { JsonApiBody, JsonApiResource } from "../types/jsonapi.type";
import Client, { client } from "./client";
import Query, { FilterQuery } from "./query";
import Schema from "./schema";

interface ModelConstructor<DocType> {

  (
    this: ModelInstance<DocType>,
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean,
      isDraft?: boolean,
    },
  ): Model<DocType>;
  new(
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean,
      isDraft?: boolean,
    },
  ): Model<DocType>;


  /** The JSON:API resource type. */
  type: string;

  client: Client;

  find(
    filter?: FilterQuery<DocType>,
  ): Query<Model<DocType>[], DocType>;

  findById(
    id: string,
    filter?: FilterQuery<DocType>,
  ): Query<Model<DocType> | null, DocType>;

  fromJsonApi<
    DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null,
  >(
    body: JsonApiBody<DataType>,
  ): DataType extends Array<JsonApiResource>
    ? Model<DocType>[]
    : Model<DocType> | null;

  schema: Schema<DocType>;

  prototype: ModelInstance<DocType>;
}

class ModelInstance<DocType> {

  /** The JSON:API resource id. */
  id!: string;

  _doc!: DocType;
  _modifiedPath!: (keyof DocType)[];

  assign!: (obj: Partial<DocType>) => this;

  get!: <T extends keyof DocType>(
    path: T,
    options?: {
      getter?: boolean,
    },
  ) => DocType[T];

  isModified!: <T extends keyof DocType>(path?: T) => boolean;

  isNew!: boolean;

  markModified!: <T extends keyof DocType>(path: T) => void;

  model!: () => TModel<DocType>;

  schema!: Schema<DocType>;

  set!: <P extends keyof DocType>(
    path: P,
    val: DocType[P],
    options?: {
      setter?: boolean,
      skipMarkModified?: boolean,
    },
  ) => this;

  toJSON!: () => DocType;

  toObject!: () => DocType;

  unmarkModified!: <T extends keyof DocType>(path: T) => void;
}

export type TModel<DocType> = ModelConstructor<DocType>

export type Model<DocType> = DocType & ModelInstance<DocType>


const ModelFunction: TModel<Record<string, any>> = function (obj, options) {
  this._doc = {}
  this._modifiedPath = []

  this.isNew = options?.isNew ?? true

  const schema = this.schema

  for (const [path, options] of Object.entries(schema.paths)) {
    Object.defineProperty(this, path, {
      enumerable: true,
      configurable: true,
      get: () => {
        return this.get(path)
      },
      set: (value) => {
        this.set(path, value)
      }
    });

    if (options?.default !== undefined) {
      const defaultValue = typeof options.default === 'function'
        ? options.default()
        : options.default
      this.set(path, defaultValue, { skipMarkModified: true });
    }
  }

  if (obj) {
    for (const [key, value] of Object.entries(obj)) {
      this.set(key, value, { skipMarkModified: true });
    }
  }
} as TModel<Record<string, any>>;

ModelFunction.prototype.assign = function (obj) {
  for (const [path, value] of Object.entries(obj)) {
    if (this.get(path) !== value) {
      this.set(path, value);
    }
  }

  return this;
};

ModelFunction.find = function (filter) {
  const query = new Query(this);
  return query.find(filter);
};

ModelFunction.findById = function (id, filter) {
  const query = new Query(this);
  return query.findById(id, filter);
};

ModelFunction.fromJsonApi = function (body) {
  const schema = this.schema;

  if (Array.isArray(body.data)) {
    return body.data
      .map((resource) => this.fromJsonApi({
        ...body,
        data: resource,
      }));
  } else if (body.data) {
    const doc = new this();

    if (body.data.id) {
      doc.id = body.data.id;
    }

    // Attributes
    for (const [attribute, value] of Object.entries(body.data.attributes ?? {})) {
      doc.set(attribute, value);
    }

    // Relationships
    for (const [relationship, value] of Object.entries(body.data.relationships ?? {})) {
      const ref = schema.paths[relationship]?.ref?.();
      if (!ref) continue;

      if (Array.isArray(value.data)) {
        const related = value.data.map((identifier) => {
          return ref.fromJsonApi({
            ...body,
            data: body.included!.find((resource) => resource.type === identifier.type && resource.id === identifier.id),
          });
        });

        doc.set(relationship, related);
      } else if (value.data) {
        const identifier = value.data;
        const related = ref.fromJsonApi({
          ...body,
          data: body.included!.find((resource) => resource.type === identifier.type && resource.id === identifier.id),
        });

        doc.set(relationship, related);
      }
    }

    return doc;
  } else {
    return null as any;
  }
};

ModelFunction.prototype.get = function (path, options) {
  const schema = this.schema;

  let value = this._doc[path];

  if (options?.getter !== false) {
    const getter = schema.paths[path]?.get;

    if (getter) {
      value = getter(value);
    }
  }

  return value;
};

ModelFunction.prototype.isModified = function (path) {
  if (path) {
    return this._modifiedPath.includes(path);
  }

  return this._modifiedPath.length > 0;
};

ModelFunction.prototype.markModified = function (path) {
  this._modifiedPath.push(path);
};

ModelFunction.prototype.set = function (path, value, options) {
  const schema = this.schema;

  if (options?.setter !== false) {
    const setter = schema.paths[path]?.set;

    if (setter) {
      value = setter(value);
    }
  }

  this._doc[path] = value;

  if (options?.skipMarkModified !== true) {
    this.markModified(path);
  }

  return this;
};

ModelFunction.prototype.toJSON = function () {
  return this.toObject();
};

ModelFunction.prototype.toObject = function () {
  const schema = this.schema;

  const obj: any = {};

  for (const [path, options] of Object.entries(schema.paths)) {
    let value = this.get(path);

    if (value) {
      if (value instanceof ModelFunction) {
        obj[path] = value.toObject();
      } else if (Array.isArray(value)) {
        obj[path] = [...value];
      } else if (typeof value === 'object') {
        obj[path] = { ...value };
      } else {
        obj[path] = value;
      }
    } else {
      obj[path] = value;
    }
  }

  return obj;
};

ModelFunction.prototype.unmarkModified = function (path) {
  this._modifiedPath = this._modifiedPath.filter((p) => p !== path);
};


export default ModelFunction

export function model<DocType>(
  type: string,
  schema: Schema<DocType>,
): TModel<DocType> {
  const model: TModel<DocType> = function (this, obj, options) {
    ModelFunction.call(this as any, obj, options)
  } as TModel<DocType>;

  if (!(model.prototype instanceof ModelFunction)) {
    Object.setPrototypeOf(model, ModelFunction);
    Object.setPrototypeOf(model.prototype, ModelFunction.prototype);
  }

  model.client = client;
  model.type = type;

  model.schema = schema;
  model.prototype.schema = schema;

  model.prototype.model = function () {
    return model;
  };

  return model;
}