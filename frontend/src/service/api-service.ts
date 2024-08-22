import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { AUTH_TOKEN } from './user-service'

class APIService {
  private readonly client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem(AUTH_TOKEN)}`
      },
    })
    this.client.interceptors.response.use(
      (config) => {
        console.info(
          `received response status: ${config.status} , data: ${config.data}`,
        )
        return config
      },
      (error) => {
        console.error(error)
      },
    )
  }

  public getAxiosInstance(): AxiosInstance {
    return this.client
  }
}

export default new APIService()
