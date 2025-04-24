type SchemaDefinition<DocType> = {
  attributes?: AttributesDefinition<DocType>;
  relationships?: RelationshipsDefinition<DocType>;
}

type AttributesDefinition<DocType> = {
  [path in keyof DocType]?: AttributeDefinition<DocType[path]>;
}

type AttributeDefinition<T> = {
  /** The JSON:API attribute name. */
  name?: string;

  type?: typeof Date;

  /** The default value for this property. */
  default?: T | (() => T);

  /** defines a custom getter for this property. */
  get?: (value: any) => T;

  /** defines a custom setter for this property. */
  set?: (value: any) => any;

  /**
   * Define a transform function for this individual schema type.
   * Only called when calling `toJSON()` or `toObject()`.
   */
  transform?: (val: T) => any;
}

type RelationshipsDefinition<DocType> = {
  [path in keyof DocType]?: RelationshipDefinition<DocType[path]>;
}

type RelationshipDefinition<T> = {
  /** The JSON:API relationship name. */
  name?: string;

  /** The default value for this property. */
  default?: T | (() => T);

  /** defines a custom getter for this property. */
  get?: (value: any) => T;

  /** defines a custom setter for this property. */
  set?: (value: any) => any;

  /**
   * Define a transform function for this individual schema type.
   * Only called when calling `toJSON()` or `toObject()`.
   */
  transform?: (val: T) => any;
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
