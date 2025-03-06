import Client, { client } from "./client";
import Schema from "./schema";

interface ResourceConstructor<DocType> {

  (
    this: ResourceInstance<DocType>,
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean,
      isDraft?: boolean,
    },
  ): Resource<DocType>;
  new(
    obj?: Partial<DocType>,
    options?: {
      isNew?: boolean,
      isDraft?: boolean,
    },
  ): Resource<DocType>;


  /** The JSON:API resource type. */
  type: string;

  client: Client;

  schema: Schema<DocType>;

  prototype: ResourceInstance<DocType>;
}

class ResourceInstance<DocType> {

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

  resource!: () => TResource<DocType>;

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

export type TResource<DocType> = ResourceConstructor<DocType>

export type Resource<DocType> = DocType & ResourceInstance<DocType>


const ResourceFunction: TResource<Record<string, any>> = function (obj, options) {
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
} as TResource<Record<string, any>>;

ResourceFunction.prototype.assign = function (obj) {
  for (const [path, value] of Object.entries(obj)) {
    if (this.get(path) !== value) {
      this.set(path, value);
    }
  }

  return this;
};

ResourceFunction.prototype.get = function (path, options) {
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

ResourceFunction.prototype.isModified = function (path) {
  if (path) {
    return this._modifiedPath.includes(path);
  }

  return this._modifiedPath.length > 0;
};

ResourceFunction.prototype.markModified = function (path) {
  this._modifiedPath.push(path);
};

ResourceFunction.prototype.set = function (path, value, options) {
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

ResourceFunction.prototype.toJSON = function () {
  return this.toObject();
};

ResourceFunction.prototype.toObject = function () {
  const schema = this.schema;

  const obj: any = {};

  for (const [path, options] of Object.entries(schema.paths)) {
    let value = this.get(path);

    if (value) {
      if (value instanceof ResourceFunction) {
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

ResourceFunction.prototype.unmarkModified = function (path) {
  this._modifiedPath = this._modifiedPath.filter((p) => p !== path);
};


export default ResourceFunction

export function resource<DocType>(
  type: string,
  schema: Schema<DocType>,
): TResource<DocType> {
  const resource: TResource<DocType> = function (this, obj, options) {
    ResourceFunction.call(this as any, obj, options)
  } as TResource<DocType>;

  if (!(resource.prototype instanceof ResourceFunction)) {
    Object.setPrototypeOf(resource, ResourceFunction);
    Object.setPrototypeOf(resource.prototype, ResourceFunction.prototype);
  }

  resource.client = client;
  resource.type = type;

  resource.schema = schema;
  resource.prototype.schema = schema;

  resource.prototype.resource = function () {
    return resource;
  };

  return resource;
}