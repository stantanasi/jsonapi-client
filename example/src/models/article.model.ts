import { model, Schema } from '@stantanasi/jsonapi-client';

export interface IArticle {
  id: string;

  title: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ArticleSchema = new Schema<IArticle>({
  title: {},
});


class Article extends model('articles', ArticleSchema) { }
export default Article
