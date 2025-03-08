import { model, Schema } from '@stantanasi/jsonapi-client';

export interface IPeople {
  id: string;

  'first-name': string;
  'last-name': string;
  twitter: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PeopleSchema = new Schema<IPeople>({
  'first-name': {},

  'last-name': {},

  twitter: {},
});


class People extends model<IPeople>('people', PeopleSchema) { }
export default People
