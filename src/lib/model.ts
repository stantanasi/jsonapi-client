import { JsonApiBody, JsonApiResource } from "../types/jsonapi.type";
import Client, { client } from "./client";
import Query, { FilterQuery } from "./query";
import Schema from "./schema";

function ModelFunction<DocType>() {
  class ModelFunction {

    /** The JSON:API resource type. */
    static type: string;

    static client: Client;

    static schema: Schema<DocType>;

    static find: (
      filter?: FilterQuery<DocType>,
    ) => Query<ModelInstance<DocType>[], DocType>;

    static findById: (
      id: string,
      filter?: FilterQuery<DocType>,
    ) => Query<ModelInstance<DocType> | null, DocType>;

    static fromJsonApi: <
      DataType extends JsonApiResource | JsonApiResource[] | null = JsonApiResource | JsonApiResource[] | null,
    > (
      body: JsonApiBody<DataType>,
    ) => DataType extends Array<JsonApiResource>
      ? ModelInstance<DocType>[]
      : ModelInstance<DocType> | null;


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
        isDraft?: boolean;
      },
    ) {
      this.init(obj, options)
    }

    assign!: (obj: Partial<DocType>) => this;

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
        isDraft?: boolean;
      },
    ) => void;

    isModified!: <T extends keyof DocType>(path?: T) => boolean;

    isNew!: boolean;

    markModified!: <T extends keyof DocType>(path: T) => void;

    model!: () => ModelConstructor<DocType>;

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

  return ModelFunction
}

class BaseModel extends ModelFunction<Record<string, any>>() { }


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


BaseModel.prototype.init = function (obj, options) {
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
};

BaseModel.prototype.assign = function (obj) {
  for (const [path, value] of Object.entries(obj)) {
    if (this.get(path) !== value) {
      this.set(path, value);
    }
  }

  return this;
};



BaseModel.prototype.get = function (path, options) {
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

BaseModel.prototype.isModified = function (path) {
  if (path) {
    return this._modifiedPath.includes(path);
  }

  return this._modifiedPath.length > 0;
};

BaseModel.prototype.markModified = function (path) {
  this._modifiedPath.push(path);
};

BaseModel.prototype.set = function (path, value, options) {
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

BaseModel.prototype.toJSON = function () {
  return this.toObject();
};

BaseModel.prototype.toObject = function () {
  const schema = this.schema;

  const obj: any = {};

  for (const [path, options] of Object.entries(schema.paths)) {
    let value = this.get(path);

    if (value) {
      if (value instanceof BaseModel) {
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

BaseModel.prototype.unmarkModified = function (path) {
  this._modifiedPath = this._modifiedPath.filter((p) => p !== path);
};


export type ModelConstructor<DocType> = ReturnType<typeof ModelFunction<DocType>>

export type ModelInstance<DocType> = InstanceType<ModelConstructor<DocType>> & DocType

export function model<DocType>(
  type: string,
  schema: Schema<DocType>,
): ModelConstructor<DocType> {
  class ModelClass extends BaseModel { }

  ModelClass.client = client;
  ModelClass.type = type;

  ModelClass.schema = schema;
  ModelClass.prototype.schema = schema;

  ModelClass.prototype.model = function () {
    return ModelClass;
  };

  return ModelClass as ModelConstructor<DocType>;
}
