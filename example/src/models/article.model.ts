import { model, Schema } from '@stantanasi/jsonapi-client';
import Comment from './comment.model';
import People from './people.model';

export interface IArticle {
  id: string;

  title: string;

  author: People;
  comments: Comment[];

  createdAt: Date;
  updatedAt: Date;
}

export const ArticleSchema = new Schema<IArticle>({
  title: {},


  author: {},

  comments: {},
});


class Article extends model('articles', ArticleSchema) { }
export default Article
