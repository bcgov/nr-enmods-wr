/**
 * Redux Store Configuration
 *
 * This file sets up the Redux store using Redux Toolkit's configureStore utility.
 * It combines all reducers and provides type-safe access to the Redux state and dispatch.
 *
 * @module store/index
 */

import { configureStore } from "@reduxjs/toolkit"
import dropdownReducer from "./dropdownSlice"

/**
 * Configure and create the Redux store with all reducers.
 * Uses Redux Toolkit's configureStore which automatically enables redux-thunk
 * middleware and redux-devtools integration.
 */
export const store = configureStore({
  reducer: {
    /** Dropdown data state slice - manages all dropdown options for search forms */
    dropdowns: dropdownReducer,
  },
})

/** Type representing the complete Redux state structure */
export type RootState = ReturnType<typeof store.getState>

/** Type representing the dispatch function for actions */
export type AppDispatch = typeof store.dispatch
