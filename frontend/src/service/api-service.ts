import type { AxiosInstance } from "axios"
import axios from "axios"
import config from "@/config"

class APIService {
  private readonly client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: config.API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })
    this.client.interceptors.response.use(
      (config) => {
        return config
      },
      (error) => {
        return error.response
      },
    )
  }

  public getAxiosInstance(): AxiosInstance {
    return this.client
  }
}

export default new APIService()
