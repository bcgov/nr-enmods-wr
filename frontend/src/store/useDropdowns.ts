/**
 * Custom React Hook for Accessing Dropdown Data
 *
 * This hook provides a convenient, type-safe way for components to access
 * dropdown data from Redux state without needing to know the state structure.
 *
 * Usage in components:
 * ```tsx
 * const { locationTypes, projects, isLoading } = useDropdowns()
 * ```
 *
 * @module store/useDropdowns
 * @returns {Object} Object containing all dropdown arrays and loading state
 */

import { useSelector } from "react-redux"
import type { RootState } from "@/store/index"

/**
 * Hook to access all dropdown data and loading state from Redux.
 *
 * Selects only the needed properties from Redux state to avoid unnecessary
 * component re-renders when unrelated state changes.
 *
 * @returns {Object} Dropdown state including:
 *   - All 15 dropdown arrays (locationTypes, projects, mediums, etc.)
 *   - isLoading: boolean indicating if data is being fetched
 *   - isInitialized: boolean indicating if initial fetch has completed
 */
export const useDropdowns = () => {
  // Select all dropdown data from Redux state
  // This prevents unnecessary re-renders by only subscribing to these specific values
  return useSelector((state: RootState) => ({
    // All 15 dropdown types used throughout the application
    locationTypes: state.dropdowns.locationTypes,
    locationNames: state.dropdowns.locationNames,
    permitNumbers: state.dropdowns.permitNumbers,
    projects: state.dropdowns.projects,
    mediums: state.dropdowns.mediums,
    observedPropGroups: state.dropdowns.observedPropGroups,
    locationGroups: state.dropdowns.locationGroups,
    observedProperties: state.dropdowns.observedProperties,
    workedOrderNos: state.dropdowns.workedOrderNos,
    analyzingAgencies: state.dropdowns.analyzingAgencies,
    analyticalMethods: state.dropdowns.analyticalMethods,
    samplingAgencies: state.dropdowns.samplingAgencies,
    collectionMethods: state.dropdowns.collectionMethods,
    qcSampleTypes: state.dropdowns.qcSampleTypes,
    dataClassifications: state.dropdowns.dataClassifications,
    // Status flags for components to handle loading and initialization states
    isLoading: state.dropdowns.isLoading,
    isInitialized: state.dropdowns.isInitialized,
  }))
}
