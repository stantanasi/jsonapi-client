# JSON:API Client

A TypeScript client to support [JSON:API](https://jsonapi.org) specification

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/stantanasi)

## Installation

```bash
npm install @stantanasi/jsonapi-client
```

## Usage

Create JSON:API model

### JavaScript

```javascript
import { model, Schema } from '@stantanasi/jsonapi-client';

export const ArticleSchema = new Schema({
  attributes: {
    title: {},
  },

  relationships: {
    author: {},
    comments: {},
  },
});


export default class Article extends model('articles', ArticleSchema) { }
```

### TypeScript

```typescript
import { model, Schema } from '@stantanasi/jsonapi-client';
import Comment from './comment.model';
import People from './people.model';

export interface IArticle {
  id: string;

  title: string;

  author: People;
  comments: Comment[];
}

export const ArticleSchema = new Schema<IArticle>({
  attributes: {
    title: {},
  },

  relationships: {
    author: {},
    comments: {},
  },
});


export default class Article extends model('articles', ArticleSchema) { }
```

Use methods

```typescript
import { connect } from '@stantanasi/jsonapi-client'

connect({
  baseURL: 'https://example.com',
})

const article = new Article({
  title: 'JSON:API paints my bikeshed!',
})

// POST /articles HTTP/1.1
await article.save()
article.id // '1'


// GET /articles HTTP/1.1
await Article.find()


// GET /articles/1 HTTP/1.1
await Article.findById('1')


// GET /articles/1/comments HTTP/1.1
await Article.findById('1').get('comments')


// PATCH /articles/1 HTTP/1.1
await article.save()


// DELETE /articles/1 HTTP/1.1
await article.delete()
```

Please refer to the [example](./example/README.md) folder to see how to use it

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## Author

- [Lory-Stan TANASI](https://github.com/stantanasi)

## License

This project is licensed under the `Apache-2.0` License - see the [LICENSE](LICENSE) file for details

<p align="center">
  <br />
  © 2025 Lory-Stan TANASI. All rights reserved
</p>