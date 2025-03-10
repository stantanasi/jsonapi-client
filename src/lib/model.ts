import { JsonApiBody, JsonApiResource } from "../types/jsonapi.type";
import Client, { client } from "./client";
import Query, { FilterQuery } from "./query";
import Schema from "./schema";

const models: {
  [type: string]: ModelConstructor<any>,
} = {};


export type ModelConstructor<DocType> = {

  new(
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean;
    }
  ): ModelInstance<DocType>;

  /** The JSON:API resource type. */
  type: string;

  client: Client;

  schema: Schema<DocType>;

  find: (
    filter?: FilterQuery<DocType>,
  ) => Query<ModelInstance<DocType>[], DocType>;

  findById: (
    id: string,
    filter?: FilterQuery<DocType>,
  ) => Query<ModelInstance<DocType> | null, DocType>;

  fromJsonApi: <
    DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null,
  > (
    body: JsonApiBody<DataType>,
  ) => DataType extends Array<JsonApiResource>
    ? ModelInstance<DocType>[]
    : ModelInstance<DocType> | null;

  prototype: ModelInstance<DocType>;
}

class ModelClass<DocType> {

  /** The JSON:API resource type. */
  type!: string;

  /** The JSON:API resource id. */
  id!: string;

  _doc!: DocType;

  _modifiedPath!: (keyof DocType)[];

  constructor(
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean;
    },
  ) {
    this.init(obj, options);
  }

  assign!: (obj: Partial<DocType>) => this;

  delete!: () => Promise<void>;

  get!: <T extends keyof DocType>(
    path: T,
    options?: {
      getter?: boolean,
    },
  ) => DocType[T];

  init!: (
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean;
    },
  ) => void;

  isModified!: <T extends keyof DocType>(path?: T) => boolean;

  isNew!: boolean;

  markModified!: <T extends keyof DocType>(path: T) => void;

  model!: () => ModelConstructor<DocType>;

  save!: () => Promise<this>;

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

  toJsonApi!: () => JsonApiBody<JsonApiResource>;

  toObject!: () => DocType;

  unmarkModified!: <T extends keyof DocType>(path: T) => void;
}

export type ModelInstance<DocType> = ModelClass<DocType> & DocType


const BaseModel = ModelClass as ModelConstructor<Record<string, any>>;


BaseModel.find = function (filter) {
  const query = new Query(this);
  return query.find(filter);
};

BaseModel.findById = function (id, filter) {
  const query = new Query(this);
  return query.findById(id, filter);
};

BaseModel.fromJsonApi = function (body) {
  const schema = this.schema;

  if (Array.isArray(body.data)) {
    return body.data
      .map((resource) => this.fromJsonApi({
        ...body,
        data: resource,
      }));
  } else if (body.data) {
    const doc = new this({}, {
      isNew: false,
    });

    if (body.data.id) {
      doc.id = body.data.id;
    }

    // Attributes
    for (const [attribute, value] of Object.entries(body.data.attributes ?? {})) {
      doc.set(attribute, value, { skipMarkModified: true });
    }

    // Relationships
    for (const [relationship, value] of Object.entries(body.data.relationships ?? {})) {
      if (Array.isArray(value.data)) {
        const related = value.data.map((identifier) => {
          const model = models[identifier.type];

          return model.fromJsonApi({
            ...body,
            data: body.included!.find((resource) => resource.type === identifier.type && resource.id === identifier.id),
          });
        });

        doc.set(relationship, related, { skipMarkModified: true });
      } else if (value.data) {
        const identifier = value.data;
        const model = models[identifier.type];

        const related = model.fromJsonApi({
          ...body,
          data: body.included!.find((resource) => resource.type === identifier.type && resource.id === identifier.id),
        });

        doc.set(relationship, related, { skipMarkModified: true });
      }
    }

    return doc;
  } else {
    return null as any;
  }
};


BaseModel.prototype.init = function (obj, options) {
  this._doc = {}
  this._modifiedPath = []

  this.isNew = options?.isNew ?? true

  const schema = this.schema

  for (const [path, options] of Object.entries(schema.attributes).concat(Object.entries(schema.relationships))) {
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
};

BaseModel.prototype.assign = function (obj) {
  for (const [path, value] of Object.entries(obj)) {
    if (this.get(path) !== value) {
      this.set(path, value);
    }
  }

  return this;
};

BaseModel.prototype.delete = async function () {
  await client.client.delete(
    `/${this.type}/${this.id}`,
    this.toJsonApi(),
  );
}

BaseModel.prototype.get = function (path, options) {
  const schema = this.schema;

  let value = this._doc[path];

  if (options?.getter !== false) {
    const property = schema.attributes[path] ?? schema.relationships[path];
    const getter = property?.get;

    if (property && getter) {
      value = getter(value);
    }
  }

  return value;
};

BaseModel.prototype.isModified = function (path) {
  if (path) {
    return this._modifiedPath.includes(path);
  }

  return this._modifiedPath.length > 0;
};

BaseModel.prototype.markModified = function (path) {
  this._modifiedPath.push(path);
};

BaseModel.prototype.save = async function () {
  let response;
  if (this.isNew) {
    response = await client.client.post<JsonApiBody<JsonApiResource>>(
      `/${this.type}`,
      this.toJsonApi(),
    );
  } else {
    response = await client.client.patch<JsonApiBody<JsonApiResource>>(
      `/${this.type}/${this.id}`,
      this.toJsonApi(),
    );
  }

  const body = response.data;
  const model = this.model().fromJsonApi(body);

  if (model) {
    this.assign(model.toObject());

    this.isNew = false;
    this._modifiedPath = [];
  }

  return this;
}

BaseModel.prototype.set = function (path, value, options) {
  const schema = this.schema;

  if (options?.setter !== false) {
    const property = schema.attributes[path] ?? schema.relationships[path];
    const setter = property?.set;

    if (property && setter) {
      value = setter(value);
    }
  }

  this._doc[path] = value;

  if (options?.skipMarkModified !== true) {
    this.markModified(path);
  }

  return this;
};

BaseModel.prototype.toJSON = function () {
  return this.toObject();
};

BaseModel.prototype.toJsonApi = function () {
  const body: JsonApiBody<JsonApiResource> = {
    jsonapi: {
      version: '1.0',
    },
  };

  const type = this.type;
  const id = this.id;

  const data: JsonApiResource = {
    type: type,
    id: id,
    attributes: {},
    relationships: {},
  };

  for (const [attribute, options] of Object.entries(this.schema.attributes)) {
    if (!this.isModified(attribute)) continue;

    const value = this.get(attribute);

    data.attributes![attribute] = value;
  }

  for (const [relationship, options] of Object.entries(this.schema.relationships)) {
    if (!this.isModified(relationship)) continue;

    const value = this.get(relationship) as ModelInstance<any> | ModelInstance<any>[] | null;

    if (Array.isArray(value)) {
      data.relationships![relationship] = {
        data: value.map((val) => ({
          type: val.type,
          id: val.id,
        })),
      };
    } else if (value) {
      data.relationships![relationship] = {
        data: {
          type: value.type,
          id: value.id,
        }
      };
    } else {
      data.relationships![relationship] = {
        data: null,
      };
    }
  }

  body.data = data;

  return body;
};

BaseModel.prototype.toObject = function () {
  const schema = this.schema;

  const obj: any = {};

  for (const [path, options] of Object.entries(schema.attributes).concat(Object.entries(schema.relationships))) {
    let value = this.get(path);

    if (options?.transform) {
      value = options.transform(value);
    }

    if (value) {
      if (value instanceof BaseModel) {
        obj[path] = value.toObject();
      } else if (Array.isArray(value)) {
        obj[path] = value.map((val) => {
          if (val instanceof BaseModel) {
            return val.toObject();
          } else {
            return val;
          }
        });
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

BaseModel.prototype.unmarkModified = function (path) {
  this._modifiedPath = this._modifiedPath.filter((p) => p !== path);
};


export function model<DocType>(
  type: string,
  schema: Schema<DocType>,
): ModelConstructor<DocType> {
  class ModelClass extends BaseModel { }

  ModelClass.client = client;

  ModelClass.type = type;
  ModelClass.prototype.type = type;

  ModelClass.schema = schema;
  ModelClass.prototype.schema = schema;

  ModelClass.prototype.model = function () {
    return ModelClass;
  };

  return ModelClass as any as ModelConstructor<DocType>;
}
