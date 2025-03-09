type SchemaDefinition<DocType> = {
  attributes?: AttributesDefinition<DocType>;
  relationships?: RelationshipsDefinition<DocType>;
}

type AttributesDefinition<DocType> = {
  [path in keyof DocType]?: PropertyDefinition<DocType[path]>;
}

type RelationshipsDefinition<DocType> = {
  [path in keyof DocType]?: PropertyDefinition<DocType[path]>;
}

type PropertyDefinition<T> = {
  /** The default value for this property. */
  default?: T | (() => T);

  /** defines a custom getter for this property. */
  get?: (value: any) => T;

  /** defines a custom setter for this property. */
  set?: (value: any) => any;
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

  attributes!: AttributesDefinition<DocType>;

  relationships!: RelationshipsDefinition<DocType>;

  init!: (
    definition: SchemaDefinition<DocType>,
    options?: SchemaOptions<DocType>,
  ) => void;

  add!: (
    obj: SchemaDefinition<DocType>,
  ) => this;
}

Schema.prototype.init = function (definition, options) {
  this.attributes = {};
  this.relationships = {};

  this.add(definition);
};

Schema.prototype.add = function (obj) {
  if (obj.attributes)
    Object.assign(this.attributes, obj.attributes)

  if (obj.relationships)
    Object.assign(this.relationships, obj.relationships)

  return this;
};


export default Schema
