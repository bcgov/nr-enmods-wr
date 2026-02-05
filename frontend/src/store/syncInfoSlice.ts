/**
 * Sync Info Slice - Redux Slice for Sync State Management
 *
 * This slice manages cached sync information, including the last sync time.
 * Data is fetched once and cached to avoid repeated database queries.
 *
 * @module store/syncInfoSlice
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import apiService from "@/service/api-service"
import { API_VERSION } from "@/util/utility"

/**
 * Interface defining the shape of the sync info state in Redux.
 */
interface SyncInfoState {
  /** Last sync time from the database */
  lastSyncTime: string | null
  /** Loading state - true when fetching data from API */
  isLoading: boolean
  /** Error message if fetch fails */
  error: string | null
  /** Flag indicating if initial fetch has completed (success or failure) */
  isInitialized: boolean
}

/**
 * Initial state for the sync info slice.
 */
const initialState: SyncInfoState = {
  lastSyncTime: null,
  isLoading: false,
  error: null,
  isInitialized: false,
}

/**
 * Async thunk for fetching the last sync time from the backend API.
 * Fetches once at app initialization and caches the result.
 *
 * @returns {Promise<string>} ISO string of the last sync time
 * @throws {string} Error message from API
 */
export const fetchLastSyncTime = createAsyncThunk(
  "syncInfo/fetchLastSyncTime",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService
        .getAxiosInstance()
        .get(`${API_VERSION}/s3-sync-log/last-sync-time`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch last sync time",
      )
    }
  },
)

/**
 * Redux slice for managing sync info state.
 *
 * Handles three states of the fetchLastSyncTime async thunk:
 * - pending: Sets isLoading to true while fetching
 * - fulfilled: Updates state with fetched time and marks as initialized
 * - rejected: Captures error message and marks as initialized (with error)
 */
const syncInfoSlice = createSlice({
  name: "syncInfo",
  initialState,
  reducers: {
    // No synchronous reducers needed - all mutations happen through async thunk
  },
  extraReducers: (builder) => {
    // Handle pending state - data is being fetched
    builder
      .addCase(fetchLastSyncTime.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      // Handle fulfilled state - data successfully fetched and stored
      .addCase(fetchLastSyncTime.fulfilled, (state, action) => {
        state.isLoading = false
        state.lastSyncTime = action.payload
        // Mark initialization as complete - data is now cached
        state.isInitialized = true
      })
      // Handle rejected state - fetch failed but initialization is marked complete
      .addCase(fetchLastSyncTime.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        // Still mark as initialized so UI doesn't show infinite loading state
        state.isInitialized = true
      })
  },
})

export default syncInfoSlice.reducer
