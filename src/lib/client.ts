import axios, { CreateAxiosDefaults } from "axios";

class Client {
  client = axios.create();
}

const client = new Client();


export { client }

export function connect(config: CreateAxiosDefaults) {
  client.client = axios.create(config);
}

export default Client