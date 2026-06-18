import {
  FETCH_PROMETHEUS_DATA_START,
  FETCH_PROMETHEUS_DATA_SUCCESS,
  FETCH_PROMETHEUS_DATA_FAILURE
} from "../actions/prometheus"

const initialState = {}

export default function prometheusData(state = initialState, action) {
  switch (action.type) {
    case FETCH_PROMETHEUS_DATA_START:
      return {
        ...state,
        [action.nodeId]: {
          ...state[action.nodeId],
          status: "loading",
          query: action.query,
          error: null
        }
      }

    case FETCH_PROMETHEUS_DATA_SUCCESS:
      return {
        ...state,
        [action.nodeId]: {
          ...state[action.nodeId],
          status: "success",
          query: action.query,
          data: action.data,
          error: null
        }
      }

    case FETCH_PROMETHEUS_DATA_FAILURE:
      return {
        ...state,
        [action.nodeId]: {
          ...state[action.nodeId],
          status: "error",
          query: action.query,
          error: action.error
        }
      }

    default:
      return state
  }
}
