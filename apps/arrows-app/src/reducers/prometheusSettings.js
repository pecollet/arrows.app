import { SET_PROMETHEUS_TIME_RANGE, SET_PROMETHEUS_STEP } from "../actions/prometheus"
import { retrievePrometheusStep } from "../actions/localStorage"

const initialState = {
  timeRangeType: "relative",
  relativeRange: "1h",
  absoluteStart: "",
  absoluteEnd: "",
  step: retrievePrometheusStep()
}

export default function prometheusSettings(state = initialState, action) {
  switch (action.type) {
    case SET_PROMETHEUS_TIME_RANGE:
      return {
        ...state,
        timeRangeType: action.timeRange.type,
        relativeRange: action.timeRange.relativeRange || state.relativeRange,
        absoluteStart: action.timeRange.absoluteStart || state.absoluteStart,
        absoluteEnd: action.timeRange.absoluteEnd || state.absoluteEnd
      }
    case SET_PROMETHEUS_STEP:
      return {
        ...state,
        step: action.step
      }
    default:
      return state
  }
}
