import { JsonApiBody, JsonApiIdentifier, JsonApiResource } from "../types/jsonapi.type";
import Client, { client } from "./client";
import Query, { FilterQuery } from "./query";
import Schema from "./schema";

type JsonifiedValue<T> =
  T extends Model<infer DocType> ? Json<DocType> :
  T extends Model<infer DocType>[] ? Json<DocType>[] :
  T extends Date ? string :
  T;

export type Json<DocType> = {
  /** The JSON:API resource type. */
  type: string;

  /** The JSON:API resource id. */
  id: string;
} & {
  [K in keyof DocType]: JsonifiedValue<DocType[K]>;
};

type ObjectifiedValue<T> =
  T extends Model<infer DocType> ? Object<DocType> :
  T extends Model<infer DocType>[] ? Object<DocType>[] :
  T;

export type Object<DocType> = {
  /** The JSON:API resource type. */
  type: string;

  /** The JSON:API resource id. */
  id: string;
} & {
  [K in keyof DocType]: ObjectifiedValue<DocType[K]>;
};


export const models: {
  [type: string]: ModelConstructor<Record<string, any>>,
} = {};


export type ModelConstructor<DocType> = {

  new(
    obj?: Partial<DocType> | Partial<Object<DocType>> | Partial<Json<DocType>> | Record<string, any>,
    options?: {
      isNew?: boolean;
    }
  ): ModelInstance<DocType>;

  /** The JSON:API resource type. */
  type: string;

  client: Client;

  schema: Schema<DocType>;

  find: <ModelType extends ModelConstructor<DocType>> (
    this: ModelType,
    filter?: FilterQuery<DocType>,
  ) => Query<InstanceType<ModelType>[], DocType>;

  findById: <ModelType extends ModelConstructor<DocType>> (
    this: ModelType,
    id: string,
    filter?: FilterQuery<DocType>,
  ) => Query<InstanceType<ModelType>, DocType>;

  fromJsonApi: <
    DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null,
  > (
    body: JsonApiBody<DataType>,
  ) => DataType extends Array<JsonApiResource>
    ? ModelInstance<DocType>[]
    : ModelInstance<DocType> | null;

  register: (type: string) => void;

  prototype: ModelInstance<DocType>;
}

export class Model<DocType> {

  /** The JSON:API resource type. */
  type!: string;

  /** The JSON:API resource id. */
  id!: string;

  private _doc!: DocType;

  private _modifiedPath!: (keyof DocType)[];

  constructor(
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean;
    },
  ) {
    this.init(obj, options);
  }

  assign!: (obj: Partial<DocType> | Partial<Object<DocType>> | Partial<Json<DocType>> | Record<string, any>) => this;

  copy!: (obj?: Partial<DocType>) => this;

  delete!: () => Promise<void>;

  get!: <T extends keyof DocType>(
    path: T,
    options?: {
      getter?: boolean,
    },
  ) => DocType[T];

  identifier!: () => JsonApiIdentifier;

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

  modifiedPaths!: () => string[];

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

  toJSON!: () => Json<DocType>;

  toJsonApi!: () => JsonApiBody<JsonApiResource>;

  toObject!: (
    options?: {
      transform?: boolean,
    },
  ) => Object<DocType>;

  unmarkModified!: <T extends keyof DocType>(path: T) => void;
}

export type ModelInstance<DocType> = Model<DocType> & DocType


const BaseModel = Model as ModelConstructor<Record<string, any>>;


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
    for (let [name, value] of Object.entries(body.data.attributes ?? {})) {
      const [attribute, property] = Object.entries(schema.attributes)
        .find(([_, property]) => property?.name === name)
        ?? [name, schema.attributes[name]];

      if (property?.type === Date && value) {
        value = new Date(value);
      }

      doc.set(attribute, value, { skipMarkModified: true });
    }

    // Relationships
    for (const [name, value] of Object.entries(body.data.relationships ?? {})) {
      const [relationship, property] = Object.entries(schema.relationships)
        .find(([_, property]) => property?.name === name)
        ?? [name, schema.relationships[name]];

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

BaseModel.register = function (type) {
  this.type = type;
  this.prototype.type = type;

  this.prototype.model = () => {
    return this;
  };

  models[type] = this;
};


BaseModel.prototype.init = function (obj, options) {
  this['_doc'] = {};
  this['_modifiedPath'] = [];

  this.isNew = options?.isNew ?? true;

  const schema = this.schema;

  for (const [attribute, property] of Object.entries(schema.attributes)) {
    Object.defineProperty(this, attribute, {
      enumerable: true,
      configurable: true,
      get: () => {
        return this.get(attribute)
      },
      set: (value) => {
        this.set(attribute, value)
      }
    });

    if (property?.default !== undefined) {
      const defaultValue = typeof property.default === 'function'
        ? property.default()
        : property.default;
      this.set(attribute, defaultValue, { skipMarkModified: true });
    }
  }

  for (const [relationship, property] of Object.entries(schema.relationships)) {
    Object.defineProperty(this, relationship, {
      enumerable: true,
      configurable: true,
      get: () => {
        return this.get(relationship)
      },
      set: (value) => {
        this.set(relationship, value)
      }
    });

    if (property?.default !== undefined) {
      const defaultValue = typeof property.default === 'function'
        ? property.default()
        : property.default;
      this.set(relationship, defaultValue, { skipMarkModified: true });
    }
  }

  if (obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'type') {
        this.type = value;
      } else if (key === 'id') {
        this.id = value;
      } else {
        this.set(key, value, { skipMarkModified: true });
      }
    }
  }
};

BaseModel.prototype.assign = function (obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'type') {
      if (this.type !== value) {
        this.type = value;
      }
    } else if (key === 'id') {
      if (this.id !== value) {
        this.id = value;
      }
    } else if (this.get(key) !== value) {
      this.set(key, value);
    }
  }

  return this;
};

BaseModel.prototype.copy = function (obj) {
  const model = this.model();

  const doc = new model();

  doc['_doc'] = { ...this['_doc'] };
  doc['_modifiedPath'] = [...this['_modifiedPath']];
  doc.isNew = this.isNew;

  doc.id = this.id;
  if (obj) doc.assign(obj);

  return doc;
};

BaseModel.prototype.delete = async function () {
  await client.client.delete(
    `/${this.type}/${this.id}`,
    this.toJsonApi(),
  );
};

BaseModel.prototype.get = function (path, options) {
  const schema = this.schema;

  let value = this['_doc'][path];

  if (options?.getter !== false) {
    const property = schema.attributes[path] ?? schema.relationships[path];
    const getter = property?.get;

    if (property && getter) {
      value = getter(value);
    }
  }

  return value;
};

BaseModel.prototype.identifier = function () {
  return {
    type: this.type,
    id: this.id,
  };
};

BaseModel.prototype.isModified = function (path) {
  if (path) {
    return this['_modifiedPath'].includes(path);
  }

  return this['_modifiedPath'].length > 0;
};

BaseModel.prototype.markModified = function (path) {
  this['_modifiedPath'].push(path);
};

BaseModel.prototype.modifiedPaths = function () {
  return [...this['_modifiedPath']];
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
  const doc = this.model().fromJsonApi(body);

  if (doc) {
    const obj = doc.toObject();
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
    this.assign(obj);

    this.isNew = false;
    this['_modifiedPath'] = [];
  }

  return this;
};

BaseModel.prototype.set = function (path, value, options) {
  const schema = this.schema;

  if (options?.setter !== false) {
    if (schema.attributes[path]) {
      const property = schema.attributes[path];

      if (value && property?.type === Date && !(value instanceof Date)) {
        value = new Date(value);
      }

      if (property?.set) {
        value = property.set(value);
      }
    } else if (schema.relationships[path]) {
      const property = schema.relationships[path];

      if (value && !(value instanceof Model) && value.type && models[value.type]) {
        const model = models[value.type];
        value = new model(value);
      } else if (Array.isArray(value) && value.some((val) => !(val instanceof Model))) {
        value = value.map((val) => {
          if (val && !(val instanceof Model) && val.type && models[val.type]) {
            const model = models[val.type];
            return new model(val);
          }
          return val;
        });
      }

      if (property?.set) {
        value = property.set(value);
      }
    }
  }

  this['_doc'][path] = value;

  if (options?.skipMarkModified !== true) {
    this.markModified(path);
  }

  return this;
};

BaseModel.prototype.toJSON = function () {
  return this.toObject({ transform: true });
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

  for (const [attribute, property] of Object.entries(this.schema.attributes)) {
    if (!this.isNew && !this.isModified(attribute)) continue;

    let value = this.get(attribute);
    if (property?.transform) {
      value = property.transform(value);
    } else {
      if (property?.type === Date && value instanceof Date) {
        value = value.toISOString();
      }
    }

    const name = property?.name ?? attribute;

    data.attributes![name] = value;
  }

  for (const [relationship, property] of Object.entries(this.schema.relationships)) {
    if (!this.isNew && !this.isModified(relationship)) continue;

    const value = this.get(relationship) as ModelInstance<Record<string, any>> | ModelInstance<Record<string, any>>[] | null;

    const name = property?.name ?? relationship;

    if (Array.isArray(value)) {
      data.relationships![name] = {
        data: value.map((val) => ({
          type: val.type,
          id: val.id,
        })),
      };
    } else if (value) {
      data.relationships![name] = {
        data: {
          type: value.type,
          id: value.id,
        },
      };
    } else {
      data.relationships![name] = {
        data: null,
      };
    }
  }

  body.data = data;

  return body;
};

BaseModel.prototype.toObject = function (options) {
  const schema = this.schema;

  const obj: any = {
    type: this.type,
    id: this.id,
  };

  for (const [attribute, property] of Object.entries(schema.attributes)) {
    let value = this.get(attribute);

    if (options?.transform) {
      if (property?.transform) {
        value = property.transform(value);
      } else {
        if (property?.type === Date && value instanceof Date) {
          value = value.toISOString();
        }
      }
    }

    if (value) {
      if (value instanceof Date) {
        obj[attribute] = value;
      } else if (typeof value === 'object') {
        obj[attribute] = { ...value };
      } else {
        obj[attribute] = value;
      }
    } else {
      obj[attribute] = value;
    }
  }

  for (const [relationship, property] of Object.entries(schema.relationships)) {
    let value = this.get(relationship);

    if (options?.transform) {
      if (property?.transform) {
        value = property.transform(value);
      }
    }

    if (value) {
      if (value instanceof BaseModel) {
        obj[relationship] = value.toObject(options);
      } else if (Array.isArray(value)) {
        obj[relationship] = value.map((val) => {
          if (val instanceof BaseModel) {
            return val.toObject(options);
          } else {
            return val;
          }
        });
      } else if (typeof value === 'object') {
        obj[relationship] = { ...value };
      } else {
        obj[relationship] = value;
      }
    } else {
      obj[relationship] = value;
    }
  }

  return obj;
};

BaseModel.prototype.unmarkModified = function (path) {
  this['_modifiedPath'] = this['_modifiedPath'].filter((p) => p !== path);
};


export function model<DocType>(
  schema: Schema<DocType>,
): ModelConstructor<DocType> {
  class ModelClass extends BaseModel { }

  ModelClass.client = client;

  ModelClass.schema = schema;
  ModelClass.prototype.schema = schema;

  return ModelClass as ModelConstructor<DocType>;
}

export function fromJsonApi<
  DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null,
>(
  body: JsonApiBody<DataType>,
): DataType extends Array<JsonApiResource> ? ModelInstance<any>[] : ModelInstance<any> | null {
  if (Array.isArray(body.data)) {
    return body.data
      .map((resource) => {
        const model = models[resource.type];

        return model.fromJsonApi({
          ...body,
          data: resource,
        });
      });
  } else if (body.data) {
    const model = models[body.data.type];

    return model.fromJsonApi(body);
  }

  return null as any;
}
