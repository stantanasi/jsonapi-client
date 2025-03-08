import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import People from './people.model';

export interface IComment {
  id: string;

  body: string;

  article: Article;
  author: People;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = new Schema<IComment>({
  body: {},


  article: {},

  author: {},
});


class Comment extends model<IComment>('comments', CommentSchema) { }
export default Comment
