import React, {Component} from 'react'
import {connect} from "react-redux"
import {Button, Modal, Form, Icon} from 'semantic-ui-react'
import {hidePlotModal} from "../actions/applicationDialogs"
import {setProperty} from "../actions/graph"
import {getPresentGraph} from "../selectors"

class PlotModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      queryText: '',
      propertyKey: '',
      tMin: 0,
      tMax: 1,
      initialTMin: 0,
      initialTMax: 1,
      isDragging: false,
      dragStartX: 0,
      dragStartTMin: 0,
      dragStartTMax: 0,
      hoverX: null,
      hoverY: null
    }
    this.canvasRef = React.createRef()
  }

  getLayout() {
    return {
      width: 700,
      height: 300,
      paddingLeft: 60,
      paddingRight: 20,
      paddingTop: 20,
      paddingBottom: 40
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.showModal && !prevProps.showModal) {
      const { nodeId, plotType, graph, prometheusData, bigQueryData } = this.props
      const node = graph.nodes.find(n => n.id === nodeId)
      let queryText = ''
      let propertyKey = ''
      if (node) {
        if (plotType === 'PROMETHEUS_PLOT') {
          queryText = (node.properties && node.properties.promQL) || ''
          propertyKey = 'promQL'
        } else if (plotType === 'BIGQUERY_PLOT') {
          queryText = (node.properties && node.properties.SQL) || ''
          propertyKey = 'SQL'
        } else if (plotType === 'CONSTANT_PLOT') {
          queryText = (node.properties && node.properties.value) || ''
          propertyKey = 'value'
        }
      }

      let allPoints = []
      if (plotType === 'PROMETHEUS_PLOT') {
        const state = prometheusData[nodeId] || {}
        const results = state.data || []
        results.forEach((series) => {
          if (series.values) {
            series.values.forEach(val => {
              const t = val[0]
              const v = parseFloat(val[1])
              if (!isNaN(v)) {
                allPoints.push({ t, v })
              }
            })
          }
        })
      } else if (plotType === 'BIGQUERY_PLOT') {
        const state = bigQueryData[nodeId] || {}
        const dataPayload = state.data || {}
        const rows = dataPayload.rows || []
        const schema = dataPayload.schema
        let tIdx = -1
        let vIdx = -1
        if (schema && schema.fields) {
          tIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 't')
          vIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 'value')
        }
        if (tIdx === -1) tIdx = 0
        if (vIdx === -1) vIdx = 1

        rows.forEach(row => {
          if (row && row.f && row.f[tIdx] && row.f[vIdx]) {
            const rawT = row.f[tIdx].v
            let t = parseFloat(rawT)
            if (isNaN(t) || t < 100000) {
              const parsedDate = Date.parse(rawT)
              if (!isNaN(parsedDate)) {
                t = parsedDate / 1000
              }
            }
            const v = parseFloat(row.f[vIdx].v)
            if (!isNaN(t) && !isNaN(v)) {
              allPoints.push({ t, v })
            }
          }
        })
      }

      let tMin = 0
      let tMax = 1
      if (allPoints.length > 0) {
        tMin = Math.min(...allPoints.map(p => p.t))
        tMax = Math.max(...allPoints.map(p => p.t))
        if (tMin === tMax) {
          tMin -= 1800
          tMax += 1800
        }
      } else {
        const now = Date.now() / 1000
        tMin = now - 3600
        tMax = now
      }

      this.setState({
        queryText,
        propertyKey,
        tMin,
        tMax,
        initialTMin: tMin,
        initialTMax: tMax,
        hoverX: null,
        hoverY: null
      }, () => {
        this.drawPlot()
      })
    } else if (this.props.showModal) {
      this.drawPlot()
    }
  }

  formatXAxisTime(t, range) {
    const date = new Date(t * 1000)
    if (range < 3600) {
      return date.toTimeString().split(' ')[0].substring(3)
    } else if (range < 86400) {
      return date.toTimeString().split(' ')[0].substring(0, 5)
    } else {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hours}:${minutes}`
    }
  }

  formatTooltipTime(t) {
    const date = new Date(t * 1000)
    const yyyy = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const time = date.toTimeString().split(' ')[0]
    return `${yyyy}-${month}-${day} ${time}`
  }

  drawPlot() {
    const canvas = this.canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = this.getLayout()
    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const { nodeId, plotType, prometheusData, bigQueryData } = this.props
    const { tMin, tMax } = this.state
    const tDiff = tMax - tMin || 1

    let allPoints = []
    let seriesData = {}

    if (plotType === 'PROMETHEUS_PLOT') {
      const state = prometheusData[nodeId] || {}
      const results = state.data || []
      results.forEach((series, sIdx) => {
        if (series.values) {
          series.values.forEach(val => {
            const t = val[0]
            const v = parseFloat(val[1])
            if (!isNaN(v)) {
              allPoints.push({ t, v, sIdx })
              if (!seriesData[sIdx]) seriesData[sIdx] = []
              seriesData[sIdx].push({ t, v, sIdx })
            }
          })
        }
      })
    } else if (plotType === 'BIGQUERY_PLOT') {
      const state = bigQueryData[nodeId] || {}
      const dataPayload = state.data || {}
      const rows = dataPayload.rows || []
      const schema = dataPayload.schema
      let tIdx = -1
      let vIdx = -1
      if (schema && schema.fields) {
        tIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 't')
        vIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 'value')
      }
      if (tIdx === -1) tIdx = 0
      if (vIdx === -1) vIdx = 1

      rows.forEach(row => {
        if (row && row.f && row.f[tIdx] && row.f[vIdx]) {
          const rawT = row.f[tIdx].v
          let t = parseFloat(rawT)
          if (isNaN(t) || t < 100000) {
            const parsedDate = Date.parse(rawT)
            if (!isNaN(parsedDate)) {
              t = parsedDate / 1000
            }
          }
          const v = parseFloat(row.f[vIdx].v)
          if (!isNaN(t) && !isNaN(v)) {
            allPoints.push({ t, v, sIdx: 0 })
            if (!seriesData[0]) seriesData[0] = []
            seriesData[0].push({ t, v, sIdx: 0 })
          }
        }
      })
    } else if (plotType === 'CONSTANT_PLOT') {
      const V = parseFloat(this.state.queryText)
      if (!isNaN(V)) {
        allPoints = [
          { t: tMin, v: V, sIdx: 0 },
          { t: tMax, v: V, sIdx: 0 }
        ]
        seriesData[0] = [...allPoints]
      }
    }

    // Determine Y-axis min/max
    const visiblePoints = allPoints.filter(p => p.t >= tMin && p.t <= tMax)
    let vMin = 0
    let vMax = 1
    if (visiblePoints.length > 0) {
      vMin = Math.min(...visiblePoints.map(p => p.v))
      vMax = Math.max(...visiblePoints.map(p => p.v))
      if (vMin === vMax) {
        vMin -= 1
        vMax += 1
      } else {
        const pad = (vMax - vMin) * 0.05
        vMin -= pad
        vMax += pad
      }
    } else if (allPoints.length > 0) {
      vMin = Math.min(...allPoints.map(p => p.v))
      vMax = Math.max(...allPoints.map(p => p.v))
      if (vMin === vMax) {
        vMin -= 1
        vMax += 1
      } else {
        const pad = (vMax - vMin) * 0.05
        vMin -= pad
        vMax += pad
      }
    }
    const vDiff = vMax - vMin || 1

    // Draw background grid
    ctx.strokeStyle = '#F1F5F9'
    ctx.lineWidth = 1

    // Draw horizontal gridlines (Y-axis)
    const yTicks = 5
    for (let i = 0; i <= yTicks; i++) {
      const y = paddingTop + (plotHeight / yTicks) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(paddingLeft + plotWidth, y)
      ctx.stroke()

      // Draw Y-axis labels
      const val = vMax - ((vMax - vMin) / yTicks) * i
      ctx.fillStyle = '#64748B'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      let formattedVal = val.toFixed(2)
      if (Math.abs(val) > 1000000) formattedVal = (val / 1000000).toFixed(1) + 'M'
      else if (Math.abs(val) > 1000) formattedVal = (val / 1000).toFixed(1) + 'K'
      ctx.fillText(formattedVal, paddingLeft - 8, y)
    }

    // Draw vertical gridlines (X-axis)
    const xTicks = 6
    for (let i = 0; i <= xTicks; i++) {
      const x = paddingLeft + (plotWidth / xTicks) * i
      ctx.beginPath()
      ctx.moveTo(x, paddingTop)
      ctx.lineTo(x, paddingTop + plotHeight)
      ctx.stroke()

      // Draw X-axis labels
      const t = tMin + (tDiff / xTicks) * i
      const formattedTime = this.formatXAxisTime(t, tDiff)
      ctx.fillStyle = '#64748B'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(formattedTime, x, paddingTop + plotHeight + 6)
    }

    // Draw each series
    const colors = ['#007ACC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    Object.keys(seriesData).forEach((sIdxStr, colorIdx) => {
      const sIdx = parseInt(sIdxStr)
      const pts = seriesData[sIdx].filter(p => p.t >= tMin && p.t <= tMax).sort((a, b) => a.t - b.t)
      if (pts.length === 0) return
      const color = colors[colorIdx % colors.length]

      // Draw translucent area under the line
      ctx.beginPath()
      pts.forEach((p, i) => {
        const x = paddingLeft + ((p.t - tMin) / tDiff) * plotWidth
        const y = paddingTop + plotHeight - ((p.v - vMin) / vDiff) * plotHeight
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      const lastX = paddingLeft + ((pts[pts.length - 1].t - tMin) / tDiff) * plotWidth
      const firstX = paddingLeft + ((pts[0].t - tMin) / tDiff) * plotWidth
      ctx.lineTo(lastX, paddingTop + plotHeight)
      ctx.lineTo(firstX, paddingTop + plotHeight)
      ctx.closePath()
      ctx.fillStyle = color + '1A'
      ctx.fill()

      // Draw the line
      ctx.beginPath()
      pts.forEach((p, i) => {
        const x = paddingLeft + ((p.t - tMin) / tDiff) * plotWidth
        const y = paddingTop + plotHeight - ((p.v - vMin) / vDiff) * plotHeight
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw hover tooltip
    if (this.state.hoverX !== null && visiblePoints.length > 0) {
      const { hoverX } = this.state
      if (hoverX >= paddingLeft && hoverX <= paddingLeft + plotWidth) {
        const tHover = tMin + ((hoverX - paddingLeft) / plotWidth) * tDiff
        let closestPt = visiblePoints[0]
        let minDiff = Math.abs(closestPt.t - tHover)
        visiblePoints.forEach(p => {
          const diff = Math.abs(p.t - tHover)
          if (diff < minDiff) {
            minDiff = diff
            closestPt = p
          }
        })

        const x = paddingLeft + ((closestPt.t - tMin) / tDiff) * plotWidth
        const y = paddingTop + plotHeight - ((closestPt.v - vMin) / vDiff) * plotHeight

        // Draw vertical dashed line
        ctx.strokeStyle = '#94A3B8'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(x, paddingTop)
        ctx.lineTo(x, paddingTop + plotHeight)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw highlighted circle
        ctx.fillStyle = '#0F172A'
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()

        // Draw tooltip box
        const tooltipW = 160
        const tooltipH = 50
        let tooltipX = x + 10
        let tooltipY = y - 25

        if (tooltipX + tooltipW > width) {
          tooltipX = x - tooltipW - 10
        }
        if (tooltipY < 5) {
          tooltipY = 5
        }
        if (tooltipY + tooltipH > height) {
          tooltipY = height - tooltipH - 5
        }

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 1
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 4)
        } else {
          ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH)
        }
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`Value: ${closestPt.v.toFixed(4)}`, tooltipX + 8, tooltipY + 8)

        ctx.fillStyle = '#94A3B8'
        ctx.font = '9px sans-serif'
        ctx.fillText(this.formatTooltipTime(closestPt.t), tooltipX + 8, tooltipY + 24)
      }
    }
  }

  handleZoomIn = () => {
    const { tMin, tMax } = this.state
    const center = (tMin + tMax) / 2
    const halfSpan = (tMax - tMin) / 4
    this.setState({
      tMin: center - halfSpan,
      tMax: center + halfSpan
    })
  }

  handleZoomOut = () => {
    const { tMin, tMax } = this.state
    const center = (tMin + tMax) / 2
    const halfSpan = (tMax - tMin) * 1
    this.setState({
      tMin: center - halfSpan,
      tMax: center + halfSpan
    })
  }

  handlePanLeft = () => {
    const { tMin, tMax } = this.state
    const shift = (tMax - tMin) * 0.25
    this.setState({
      tMin: tMin - shift,
      tMax: tMax - shift
    })
  }

  handlePanRight = () => {
    const { tMin, tMax } = this.state
    const shift = (tMax - tMin) * 0.25
    this.setState({
      tMin: tMin + shift,
      tMax: tMax + shift
    })
  }

  handleReset = () => {
    this.setState({
      tMin: this.state.initialTMin,
      tMax: this.state.initialTMax
    })
  }

  handleCanvasMouseDown = (e) => {
    const rect = this.canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const { paddingLeft, plotWidth } = this.getLayout()
    if (x >= paddingLeft && x <= paddingLeft + plotWidth) {
      this.setState({
        isDragging: true,
        dragStartX: e.clientX,
        dragStartTMin: this.state.tMin,
        dragStartTMax: this.state.tMax
      })
    }
  }

  handleCanvasMouseMove = (e) => {
    const rect = this.canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (this.state.isDragging) {
      const { paddingLeft, plotWidth } = this.getLayout()
      const dx = e.clientX - this.state.dragStartX
      const tDiff = this.state.dragStartTMax - this.state.dragStartTMin
      const tShift = -(dx / plotWidth) * tDiff
      this.setState({
        tMin: this.state.dragStartTMin + tShift,
        tMax: this.state.dragStartTMax + tShift,
        hoverX: null,
        hoverY: null
      })
    } else {
      this.setState({
        hoverX: x,
        hoverY: y
      })
    }
  }

  handleCanvasMouseUp = () => {
    this.setState({ isDragging: false })
  }

  handleCanvasMouseLeave = () => {
    this.setState({ isDragging: false, hoverX: null, hoverY: null })
  }

  handleCanvasWheel = (e) => {
    e.preventDefault()
    const rect = this.canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const { paddingLeft, plotWidth } = this.getLayout()
    if (x >= paddingLeft && x <= paddingLeft + plotWidth) {
      const { tMin, tMax } = this.state
      const tDiff = tMax - tMin
      const tCenter = tMin + ((x - paddingLeft) / plotWidth) * tDiff

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15
      const newTDiff = tDiff * zoomFactor

      const ratio = (x - paddingLeft) / plotWidth
      const newTMin = tCenter - ratio * newTDiff
      const newTMax = tCenter + (1 - ratio) * newTDiff

      this.setState({
        tMin: newTMin,
        tMax: newTMax
      })
    }
  }

  onSave = () => {
    const { nodeId } = this.props
    const { propertyKey, queryText } = this.state
    if (nodeId && propertyKey) {
      this.props.onSaveProperty(nodeId, propertyKey, queryText)
    }
    this.props.onCancel()
  }

  render() {
    const { showModal, plotType, onCancel } = this.props
    const { width, height } = this.getLayout()

    let title = 'Enlarged Plot'
    if (plotType === 'PROMETHEUS_PLOT') title = 'Prometheus Query Plot'
    else if (plotType === 'BIGQUERY_PLOT') title = 'BigQuery Query Plot'
    else if (plotType === 'CONSTANT_PLOT') title = 'Constant Value Plot'

    return (
      <Modal
        size="large"
        open={showModal}
        onClose={onCancel}
        style={{ width: '740px' }}
      >
        <Modal.Header>{title}</Modal.Header>
        <Modal.Content>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas
              ref={this.canvasRef}
              width={width}
              height={height}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                cursor: this.state.isDragging ? 'grabbing' : 'crosshair',
                backgroundColor: '#FFFFFF',
                touchAction: 'none'
              }}
              onMouseDown={this.handleCanvasMouseDown}
              onMouseMove={this.handleCanvasMouseMove}
              onMouseUp={this.handleCanvasMouseUp}
              onMouseLeave={this.handleCanvasMouseLeave}
              onWheel={this.handleCanvasWheel}
            />
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
              <Button icon onClick={this.handlePanLeft} title="Pan Left">
                <Icon name="arrow left" />
              </Button>
              <Button icon onClick={this.handleZoomIn} title="Zoom In">
                <Icon name="zoom in" />
              </Button>
              <Button icon onClick={this.handleReset} title="Reset View">
                <Icon name="undo" />
              </Button>
              <Button icon onClick={this.handleZoomOut} title="Zoom Out">
                <Icon name="zoom out" />
              </Button>
              <Button icon onClick={this.handlePanRight} title="Pan Right">
                <Icon name="arrow right" />
              </Button>
            </div>
          </div>

          <Form style={{ marginTop: '20px' }}>
            <Form.TextArea
              label={`${this.state.propertyKey || 'Query / Value'}`}
              value={this.state.queryText}
              onChange={(e) => this.setState({ queryText: e.target.value })}
              rows={6}
              style={{ fontFamily: 'monospace' }}
            />
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={onCancel} content="Cancel" />
          <Button onClick={this.onSave} positive content="Save" />
        </Modal.Actions>
      </Modal>
    )
  }
}

const mapStateToProps = state => {
  const graph = getPresentGraph(state)
  return {
    showModal: state.applicationDialogs.showPlotModal,
    nodeId: state.applicationDialogs.plotModalNodeId,
    plotType: state.applicationDialogs.plotModalPlotType,
    graph,
    prometheusData: state.prometheusData || {},
    bigQueryData: state.bigQueryData || {}
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onCancel: () => {
      dispatch(hidePlotModal())
    },
    onSaveProperty: (nodeId, key, value) => {
      dispatch(setProperty({ entities: [{ entityType: 'node', id: nodeId }] }, key, value))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(PlotModal)
