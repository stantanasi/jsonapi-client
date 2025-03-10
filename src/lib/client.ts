import axios, { CreateAxiosDefaults } from "axios";

class Client {
  client = axios.create();
}

const client = new Client();


export { client };

export function connect(config: CreateAxiosDefaults) {
  client.client = axios.create({
    ...config,
    headers: {
      ...config.headers,
      "Content-Type": "application/vnd.api+json",
    },
  });
}

export default Client