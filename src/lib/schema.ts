import { TModel } from "./model";

type SchemaDefinitionProperty<T> = {
  /** The default value for this property. */
  default?: T | (() => T);

  /** defines a custom getter for this property. */
  get?: (value: any) => T;

  /** defines a custom setter for this property. */
  set?: (value: any) => any;

  ref?: () => TModel<any>;
}

type SchemaDefinition<DocType> = {
  [path in keyof DocType]?: SchemaDefinitionProperty<DocType[path]>;
}

type SchemaOptions<DocType> = {
}

class Schema<DocType> {

  constructor(
    definition: SchemaDefinition<DocType>,
    options?: SchemaOptions<DocType>,
  ) {
    this.init(definition, options)
  }

  paths!: SchemaDefinition<DocType>;

  init!: (
    definition: SchemaDefinition<DocType>,
    options?: SchemaOptions<DocType>,
  ) => void;

  add!: (
    obj: SchemaDefinition<DocType>,
  ) => this;
}

Schema.prototype.init = function (definition, options) {
  this.paths = {};

  this.add(definition);
};

Schema.prototype.add = function (obj) {
  Object.assign(this.paths, obj);
  return this;
};


export default Schema
