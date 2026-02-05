import type { AxiosInstance } from "axios"
import axios from "axios"
import config from "@/config"

class APIService {
  private readonly client: AxiosInstance
  private activeRequests: number = 0
  private requestListeners: Set<(isLoading: boolean) => void> = new Set()
  private hideLoadingTimeout: NodeJS.Timeout | null = null
  private readonly MIN_LOADING_TIME = 300 // Minimum time to show loading indicator (ms)

  constructor() {
    this.client = axios.create({
      baseURL: config.API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Request interceptor - track when requests start
    this.client.interceptors.request.use(
      (config) => {
        // Clear any pending hide timeout
        if (this.hideLoadingTimeout) {
          clearTimeout(this.hideLoadingTimeout)
          this.hideLoadingTimeout = null
        }
        this.activeRequests++
        this.notifyListeners()
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // Response interceptor - track when requests complete
    this.client.interceptors.response.use(
      (response) => {
        this.decrementRequests()
        return response
      },
      (error) => {
        this.decrementRequests()
        return Promise.reject(error)
      },
    )
  }

  private decrementRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1)

    // If no more requests, delay hiding to show minimum time
    if (this.activeRequests === 0) {
      this.hideLoadingTimeout = setTimeout(() => {
        this.notifyListeners()
        this.hideLoadingTimeout = null
      }, this.MIN_LOADING_TIME)
    } else {
      this.notifyListeners()
    }
  }

  public getAxiosInstance(): AxiosInstance {
    return this.client
  }

  /**
   * Subscribe to loading state changes
   * @param callback - Called whenever loading state changes
   * @returns Unsubscribe function
   */
  public subscribeToLoadingState(
    callback: (isLoading: boolean) => void,
  ): () => void {
    this.requestListeners.add(callback)
    // Call immediately with current state
    callback(this.isLoading())
    // Return unsubscribe function
    return () => {
      this.requestListeners.delete(callback)
    }
  }

  /**
   * Get current loading state
   */
  public isLoading(): boolean {
    return this.activeRequests > 0
  }

  /**
   * Get count of active requests
   */
  public getActiveRequestCount(): number {
    return this.activeRequests
  }

  /**
   * Notify all listeners of loading state change
   */
  private notifyListeners(): void {
    const isLoading = this.isLoading()
    this.requestListeners.forEach((callback) => {
      callback(isLoading)
    })
  }
}

export default new APIService()
