import {connect} from "react-redux"
import GraphDisplay from "../components/GraphDisplay"
import {compose} from "react-recompose"
import withKeyBindings from "../interactions/Keybindings"
import {
  getVisualGraph,
  getTransformationHandles
} from "../selectors/index"
import {deleteSelection, duplicateSelection} from "../actions/graph"
import {selectAll, jumpToNextNode, tryActivateEditing} from "../actions/selection";
import {computeCanvasSize} from "../model/applicationLayout";
import { ActionCreators as UndoActionCreators } from 'redux-undo'
import {getBackgroundImage} from "../selectors";
import {fetchPrometheusData} from "../actions/prometheus";
import {fetchBigQueryData} from "../actions/bigQuery";

const mapStateToProps = state => {
  return {
    visualGraph: getVisualGraph(state),
    backgroundImage: getBackgroundImage(state),
    selection: state.selection,
    gestures: state.gestures,
    guides: state.guides,
    handles: getTransformationHandles(state),
    canvasSize: computeCanvasSize(state.applicationLayout),
    viewTransformation: state.viewTransformation,
    storage: state.storage,
    prometheusData: state.prometheusData,
    bigQueryData: state.bigQueryData
  }
}

const mapDispatchToProps = dispatch => ({
  duplicateSelection: () => dispatch(duplicateSelection()),
  deleteSelection: () => dispatch(deleteSelection()),
  selectAll: () => dispatch(selectAll()),
  jumpToNextNode: (direction, extraKeys) => dispatch(jumpToNextNode(direction, extraKeys)),
  undo: () => dispatch(UndoActionCreators.undo()),
  redo: () => dispatch(UndoActionCreators.redo()),
  tryActivateEditing: () => dispatch(tryActivateEditing()),
  fetchPrometheusData: (nodeId, query) => dispatch(fetchPrometheusData(nodeId, query)),
  fetchBigQueryData: (nodeId, sql) => dispatch(fetchBigQueryData(nodeId, sql)),
  dispatch: dispatch
})

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  withKeyBindings
)(GraphDisplay)
