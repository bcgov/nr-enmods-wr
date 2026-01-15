/**
 * Dropdown Slice - Redux Slice for Dropdown Management
 *
 * This slice manages all dropdown data used throughout the search forms in the application.
 * It uses Redux Toolkit's createAsyncThunk to fetch all dropdown options in parallel,
 * improving performance by consolidating multiple API calls into a single initialization.
 *
 * Key Features:
 * - Fetches 15 different dropdown types in a single Promise.all() call
 * - Caches dropdown data to avoid refetching on component re-renders
 * - Tracks loading and error states
 * - Marks initialization complete with isInitialized flag
 *
 * @module store/dropdownSlice
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import apiService from "@/service/api-service"
import { API_VERSION } from "@/util/utility"

/**
 * Interface defining the shape of the dropdown state in Redux.
 * Contains arrays for each dropdown type used in search forms,
 * plus loading and status indicators.
 */
interface DropdownState {
  /** Location type options for filtering */
  locationTypes: any[]
  /** Location name options for filtering */
  locationNames: any[]
  /** Permit number options for filtering */
  permitNumbers: any[]
  /** Project options for filtering */
  projects: any[]
  /** Medium (e.g., water, soil) options for filtering */
  mediums: any[]
  /** Observed property group options for filtering */
  observedPropGroups: any[]
  /** Location group options for filtering */
  locationGroups: any[]
  /** Observed property options for filtering */
  observedProperties: any[]
  /** Worked order number options for filtering */
  workedOrderNos: any[]
  /** Analyzing agency options for filtering */
  analyzingAgencies: any[]
  /** Analytical method options for filtering */
  analyticalMethods: any[]
  /** Sampling agency options for filtering */
  samplingAgencies: any[]
  /** Collection method options for filtering */
  collectionMethods: any[]
  /** QC sample type options for filtering */
  qcSampleTypes: any[]
  /** Data classification options for filtering */
  dataClassifications: any[]
  /** Loading state - true when fetching data from API */
  isLoading: boolean
  /** Error message if fetch fails */
  error: string | null
  /** Flag indicating if initial fetch has completed (success or failure) */
  isInitialized: boolean
}

/**
 * Initial state for the dropdown slice.
 * All dropdown arrays start empty and are populated when fetchAllDropdowns succeeds.
 */
const initialState: DropdownState = {
  locationTypes: [],
  locationNames: [],
  permitNumbers: [],
  projects: [],
  mediums: [],
  observedPropGroups: [],
  locationGroups: [],
  observedProperties: [],
  workedOrderNos: [],
  analyzingAgencies: [],
  analyticalMethods: [],
  samplingAgencies: [],
  collectionMethods: [],
  qcSampleTypes: [],
  dataClassifications: [],
  isLoading: false,
  error: null,
  isInitialized: false,
}

/**
 * Async thunk for fetching all dropdown data from the backend API.
 *
 * This thunk makes 15 parallel API requests using Promise.all() to fetch all
 * dropdown options at once, significantly improving performance compared to
 * fetching each dropdown individually when components mount.
 *
 * Performance Improvement:
 * - Before: Multiple components fetching same data independently = N API calls
 * - After: Single centralized fetch at app initialization = 15 parallel API calls (once)
 *
 * @returns {Promise<Object>} Object containing all dropdown arrays keyed by dropdown type
 * @throws {string} Error message from API or generic "Failed to fetch dropdowns" message
 */
export const fetchAllDropdowns = createAsyncThunk(
  "dropdowns/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      // Define all dropdown API endpoints
      const endpoints = {
        locationTypes: `${API_VERSION}/search/getLocationTypes`,
        locationNames: `${API_VERSION}/search/getLocationNames`,
        permitNumbers: `${API_VERSION}/search/getLocationGroups`,
        projects: `${API_VERSION}/search/getProjects`,
        mediums: `${API_VERSION}/search/getMediums`,
        observedPropGroups: `${API_VERSION}/search/getObservedPropertyGroups`,
        locationGroups: `${API_VERSION}/search/getLocationGroups`,
        observedProperties: `${API_VERSION}/search/getObservedProperties`,
        workedOrderNos: `${API_VERSION}/search/getWorkedOrderNos`,
        analyzingAgencies: `${API_VERSION}/search/getAnalyzingAgencies`,
        analyticalMethods: `${API_VERSION}/search/getAnalyticalMethods`,
        samplingAgencies: `${API_VERSION}/search/getSamplingAgencies`,
        collectionMethods: `${API_VERSION}/search/getCollectionMethods`,
        qcSampleTypes: `${API_VERSION}/search/getQcSampleTypes`,
        dataClassifications: `${API_VERSION}/search/getDataClassifications`,
      }

      // Execute all API calls in parallel for better performance
      const responses = await Promise.all(
        Object.entries(endpoints).map(([key, url]) =>
          apiService.getAxiosInstance().get(url),
        ),
      )

      // Transform array of responses into an object mapping dropdown type to data
      const result: any = {}
      Object.keys(endpoints).forEach((key, index) => {
        result[key] = responses[index].data || []
      })

      return result
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dropdowns",
      )
    }
  },
)

/**
 * Redux slice for managing dropdown state.
 *
 * Handles three states of the fetchAllDropdowns async thunk:
 * - pending: Sets isLoading to true while fetching
 * - fulfilled: Updates state with fetched data and marks as initialized
 * - rejected: Captures error message and marks as initialized (with error)
 */
const dropdownSlice = createSlice({
  name: "dropdowns",
  initialState,
  reducers: {
    // No synchronous reducers needed - all mutations happen through async thunk
  },
  extraReducers: (builder) => {
    // Handle pending state - data is being fetched
    builder
      .addCase(fetchAllDropdowns.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      // Handle fulfilled state - data successfully fetched and stored
      .addCase(fetchAllDropdowns.fulfilled, (state, action) => {
        state.isLoading = false
        // Populate each dropdown array from the fetched data
        state.locationTypes = action.payload.locationTypes
        state.locationNames = action.payload.locationNames
        state.permitNumbers = action.payload.permitNumbers
        state.projects = action.payload.projects
        state.mediums = action.payload.mediums
        state.observedPropGroups = action.payload.observedPropGroups
        state.locationGroups = action.payload.locationGroups
        state.observedProperties = action.payload.observedProperties
        state.workedOrderNos = action.payload.workedOrderNos
        state.analyzingAgencies = action.payload.analyzingAgencies
        state.analyticalMethods = action.payload.analyticalMethods
        state.samplingAgencies = action.payload.samplingAgencies
        state.collectionMethods = action.payload.collectionMethods
        state.qcSampleTypes = action.payload.qcSampleTypes
        state.dataClassifications = action.payload.dataClassifications
        // Mark initialization as complete - data is now cached and ready to use
        state.isInitialized = true
      })
      // Handle rejected state - fetch failed but initialization is marked complete
      .addCase(fetchAllDropdowns.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        // Still mark as initialized so UI doesn't show infinite loading state
        state.isInitialized = true
      })
  },
})

export default dropdownSlice.reducer
