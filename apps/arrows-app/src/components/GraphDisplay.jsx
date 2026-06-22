import React, { Component } from 'react';
import { renderVisuals } from "../graphics/visualsRenderer";
import {
  DELETE_SELECTION,
  DUPLICATE_SELECTION,
  MOVE_LEFT,
  MOVE_UP,
  MOVE_RIGHT,
  MOVE_DOWN,
  SELECT_ALL,
  UNDO,
  REDO, TOGGLE_FOCUS
} from "../interactions/Keybindings";
import MouseHandler from "../interactions/MouseHandler";
import GraphTextContainer from "../containers/GraphTextContainer";
import { interpolatePromQL } from "../model/properties";

class GraphDisplay extends Component {
  constructor(props) {
    super(props)
    props.registerAction(
      DUPLICATE_SELECTION,
      () => props.duplicateSelection()
    )
    props.registerAction(
      DELETE_SELECTION,
      () => props.deleteSelection()
    )
    props.registerAction(
      SELECT_ALL,
      () => props.selectAll()
    )
    props.registerAction(
      MOVE_LEFT,
      (extraKeys) => props.jumpToNextNode('LEFT', extraKeys)
    )
    props.registerAction(
      MOVE_UP,
      (extraKeys) => props.jumpToNextNode('UP', extraKeys)
    )
    props.registerAction(
      MOVE_RIGHT,
      (extraKeys) => props.jumpToNextNode('RIGHT', extraKeys)
    )
    props.registerAction(
      MOVE_DOWN,
      (extraKeys) => props.jumpToNextNode('DOWN', extraKeys)
    )
    props.registerAction(
      TOGGLE_FOCUS,
      () => props.tryActivateEditing()
    )

    this.registerOptionalActions(props)
  }

  registerOptionalActions (props) {
    const supportsUndo = ['GOOGLE_DRIVE', 'LOCAL_STORAGE'].includes(props.storage.mode)

    props.registerAction(
      UNDO,
      (() => supportsUndo && props.undo()).bind(this)
    )
    props.registerAction(
      REDO,
      (() => supportsUndo && props.redo()).bind(this)
    )
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if(nextProps.storage.mode !== this.props.storage.mode) {
      this.registerOptionalActions(nextProps)
    }
  }

  componentDidMount() {
    this.touchHandler = new MouseHandler(this.canvas)
    this.fitCanvasSize(this.canvas, this.props.canvasSize.width, this.props.canvasSize.height)
    this.drawVisuals()
    this.checkPrometheusQueries()
    this.checkBigQueryQueries()
  }

  componentDidUpdate() {
    this.fitCanvasSize(this.canvas, this.props.canvasSize.width, this.props.canvasSize.height)
    this.drawVisuals()
    this.checkPrometheusQueries()
    this.checkBigQueryQueries()
  }

  checkPrometheusQueries() {
    const { visualGraph, prometheusData, fetchPrometheusData, prometheusSettings } = this.props
    if (!visualGraph || !visualGraph.graph || !visualGraph.graph.nodes || !fetchPrometheusData) return

    const settings = prometheusSettings || {
      timeRangeType: "relative",
      relativeRange: "1h",
      absoluteStart: "",
      absoluteEnd: "",
      step: 30
    }

    visualGraph.graph.nodes.forEach(node => {
      const promQL = node.properties && node.properties.promQL
      if (promQL) {
        const interpolatedQuery = interpolatePromQL(promQL, node.properties)
        if (interpolatedQuery) {
          const cached = prometheusData && prometheusData[node.id]
          const step = settings.step || 30
          let needsFetch = !cached || cached.query !== interpolatedQuery || cached.step !== step || cached.timeRangeType !== settings.timeRangeType
          
          if (!needsFetch) {
            if (settings.timeRangeType === 'custom') {
              needsFetch = cached.absoluteStart !== settings.absoluteStart || cached.absoluteEnd !== settings.absoluteEnd
            } else {
              needsFetch = cached.relativeRange !== settings.relativeRange || (Date.now() - (cached.fetchedAt || 0) > step * 1000)
            }
          }

          if (needsFetch) {
            fetchPrometheusData(node.id, interpolatedQuery)
          }
        }
      }
    })
  }

  checkBigQueryQueries() {
    const { visualGraph, bigQueryData, fetchBigQueryData, prometheusSettings } = this.props
    if (!visualGraph || !visualGraph.graph || !visualGraph.graph.nodes || !fetchBigQueryData) return

    const settings = prometheusSettings || {
      timeRangeType: "relative",
      relativeRange: "1h",
      absoluteStart: "",
      absoluteEnd: "",
      step: 30
    }

    const step = settings.step || 30

    let start, end
    if (settings.timeRangeType === 'custom' && settings.absoluteStart && settings.absoluteEnd) {
      const sDate = new Date(settings.absoluteStart)
      const eDate = new Date(settings.absoluteEnd)
      start = isNaN(sDate.getTime()) ? Math.floor(Date.now() / 1000) - 3600 : Math.floor(sDate.getTime() / 1000)
      end = isNaN(eDate.getTime()) ? Math.floor(Date.now() / 1000) : Math.floor(eDate.getTime() / 1000)
    } else {
      const nowSec = Math.floor(Date.now() / 1000)
      end = Math.floor(nowSec / step) * step
      const relativeSec = {
        '15m': 15 * 60,
        '1h': 3600,
        '1d': 86400
      }[settings.relativeRange || '1h'] || 3600
      start = end - relativeSec
    }

    const startTimeStr = new Date(start * 1000).toISOString()
    const endTimeStr = new Date(end * 1000).toISOString()

    visualGraph.graph.nodes.forEach(node => {
      const sql = node.properties && node.properties.SQL
      if (sql) {
        const extendedProps = {
          ...node.properties,
          start_time: startTimeStr,
          end_time: endTimeStr
        }
        const interpolatedQuery = interpolatePromQL(sql, extendedProps)
        if (interpolatedQuery) {
          const cached = bigQueryData && bigQueryData[node.id]
          if (!cached || cached.query !== interpolatedQuery) {
            fetchBigQueryData(node.id, interpolatedQuery)
          }
        }
      }
    })
  }

  render() {
    return (
      <div style={{
        transform: 'translate(0, 0)'
      }}>
        <canvas style={{
          display: 'block',
          backgroundColor: this.props.visualGraph.style['background-color']
        }} ref={(elm) => this.canvas = elm}/>
        <GraphTextContainer/>
      </div>
    )
  }

  fitCanvasSize(canvas, width, height) {
    canvas.width = width
    canvas.height = height
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const context = canvas.getContext('2d');

    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1
    const ratio = devicePixelRatio / backingStoreRatio

    if (devicePixelRatio !== backingStoreRatio) {
      canvas.width = width * ratio
      canvas.height = height * ratio

      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'

      // now scale the context to counter
      // the fact that we've manually scaled
      // our canvas element
      context.scale(ratio, ratio)
    }

    return ratio
  }

  drawVisuals() {
    const { visualGraph, backgroundImage, selection, gestures, guides, handles, toolboxes, viewTransformation, canvasSize } = this.props
    renderVisuals({
      visuals: { visualGraph, backgroundImage, selection, gestures, guides, handles, toolboxes },
      canvas: this.canvas,
      displayOptions: { canvasSize, viewTransformation }
    })

    this.touchHandler.setDispatch(this.props.dispatch)
  }
}

export default GraphDisplay
