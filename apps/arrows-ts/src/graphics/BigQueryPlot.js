import {Point} from "../model/Point"
import BoundingBox from "./utils/BoundingBox"

export class BigQueryPlot {
  constructor(nodeId, bigQueryState, orientation, style) {
    this.nodeId = nodeId
    this.bigQueryState = bigQueryState || { status: 'loading' }
    this.orientation = orientation
    this.width = 180
    this.height = 100
    this.margin = 10

    const horizontalPosition = (() => {
      switch (orientation.horizontal) {
        case 'start':
          return 0
        case 'center':
          return -this.width / 2
        case 'end':
          return -this.width
        default:
          return 0
      }
    })()
    this.boxPosition = new Point(horizontalPosition, 0)
  }

  get type() {
    return 'BIGQUERY_PLOT'
  }

  get contentsFit() {
    return true
  }

  boundingBox() {
    const left = this.boxPosition.x
    const top = this.boxPosition.y
    return new BoundingBox(left, left + this.width, top, top + this.height)
  }

  distanceFrom(point) {
    return this.boundingBox().contains(point) ? 0 : Infinity
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(...this.boxPosition.xy)

    // Draw Card Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 1
    ctx.rect(0, 0, this.width, this.height, 6, true, true)

    // Draw small header/title
    ctx.fillStyle = '#64748B'
    ctx.font = { fontWeight: 'bold', fontSize: 9, fontFamily: 'sans-serif' }
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillText('BIGQUERY QUERY', 10, 10)

    // Check state/status
    const status = this.bigQueryState.status
    if (status === 'loading') {
      ctx.fillStyle = '#94A3B8'
      ctx.font = { fontWeight: 'normal', fontSize: 10, fontFamily: 'sans-serif' }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Loading...', this.width / 2, this.height / 2 + 5)
    } else if (status === 'error') {
      ctx.fillStyle = '#EF4444'
      ctx.font = { fontWeight: 'normal', fontSize: 9, fontFamily: 'sans-serif' }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const errMsg = this.bigQueryState.error || 'Unknown error'
      // Draw wrapped or truncated error message
      if (errMsg.length > 25) {
        ctx.fillText(errMsg.substring(0, 24) + '...', this.width / 2, this.height / 2)
        ctx.fillText(errMsg.substring(24, 48), this.width / 2, this.height / 2 + 10)
      } else {
        ctx.fillText(errMsg, this.width / 2, this.height / 2 + 5)
      }
    } else if (status === 'success') {
      const dataPayload = this.bigQueryState.data || {}
      const rows = dataPayload.rows || []
      const schema = dataPayload.schema

      if (rows.length === 0) {
        ctx.fillStyle = '#94A3B8'
        ctx.font = { fontWeight: 'normal', fontSize: 10, fontFamily: 'sans-serif' }
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No data returned', this.width / 2, this.height / 2 + 5)
      } else {
        // Find indices for 't' and 'value' columns
        let tIdx = -1
        let vIdx = -1
        if (schema && schema.fields) {
          tIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 't')
          vIdx = schema.fields.findIndex(f => f.name.toLowerCase() === 'value')
        }
        if (tIdx === -1) tIdx = 0
        if (vIdx === -1) vIdx = 1

        let allPoints = []
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

        // Sort chronologically
        allPoints.sort((a, b) => a.t - b.t)

        if (allPoints.length === 0) {
          ctx.fillStyle = '#94A3B8'
          ctx.font = { fontWeight: 'normal', fontSize: 10, fontFamily: 'sans-serif' }
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('No numeric data', this.width / 2, this.height / 2 + 5)
          ctx.restore()
          return
        }

        const paddingLeft = 10
        const paddingRight = 10
        const paddingTop = 26
        const paddingBottom = 10
        const plotWidth = this.width - paddingLeft - paddingRight
        const plotHeight = this.height - paddingTop - paddingBottom

        const tMin = Math.min(...allPoints.map(p => p.t))
        const tMax = Math.max(...allPoints.map(p => p.t))
        let vMin = Math.min(...allPoints.map(p => p.v))
        let vMax = Math.max(...allPoints.map(p => p.v))

        if (vMin === vMax) {
          vMin -= 1
          vMax += 1
        } else {
          // Add 5% padding to y-axis
          const pad = (vMax - vMin) * 0.05
          vMin -= pad
          vMax += pad
        }

        const tDiff = tMax - tMin || 1
        const vDiff = vMax - vMin || 1

        const color = '#3B82F6' // Google blue

        // Draw translucent area under the line
        ctx.beginPath()
        allPoints.forEach((p, i) => {
          const x = paddingLeft + ((p.t - tMin) / tDiff) * plotWidth
          const y = paddingTop + plotHeight - ((p.v - vMin) / vDiff) * plotHeight
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        const lastX = paddingLeft + ((allPoints[allPoints.length - 1].t - tMin) / tDiff) * plotWidth
        const firstX = paddingLeft + ((allPoints[0].t - tMin) / tDiff) * plotWidth
        ctx.lineTo(lastX, paddingTop + plotHeight)
        ctx.lineTo(firstX, paddingTop + plotHeight)
        ctx.closePath()

        ctx.fillStyle = color + '26'
        ctx.fill()

        // Draw the series line
        ctx.beginPath()
        allPoints.forEach((p, i) => {
          const x = paddingLeft + ((p.t - tMin) / tDiff) * plotWidth
          const y = paddingTop + plotHeight - ((p.v - vMin) / vDiff) * plotHeight
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Draw latest value label in the upper right
        const latestVal = allPoints[allPoints.length - 1].v
        let formattedVal = latestVal.toFixed(2)
        if (latestVal > 1000000) {
          formattedVal = (latestVal / 1000000).toFixed(1) + 'M'
        } else if (latestVal > 1000) {
          formattedVal = (latestVal / 1000).toFixed(1) + 'K'
        }
        ctx.fillStyle = '#0F172A'
        ctx.font = { fontWeight: 'bold', fontSize: 11, fontFamily: 'sans-serif' }
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(formattedVal, this.width - 10, 9)

        // Draw Y-axis min/max
        ctx.fillStyle = '#94A3B8'
        ctx.font = { fontWeight: 'normal', fontSize: 7, fontFamily: 'sans-serif' }
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        let formattedMax = vMax.toFixed(1)
        if (vMax > 1000) formattedMax = (vMax / 1000).toFixed(1) + 'k'
        ctx.fillText(formattedMax, 10, paddingTop + 2)

        ctx.textBaseline = 'bottom'
        let formattedMin = vMin.toFixed(1)
        if (vMin > 1000) formattedMin = (vMin / 1000).toFixed(1) + 'k'
        ctx.fillText(formattedMin, 10, paddingTop + plotHeight - 2)
      }
    }

    ctx.restore()
  }

  drawSelectionIndicator(ctx) {
    const indicatorWidth = 10
    const boundingBox = this.boundingBox()
    ctx.save()
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)'
    ctx.lineWidth = indicatorWidth
    ctx.lineJoin = 'round'
    ctx.rect(boundingBox.left, boundingBox.top, boundingBox.width, boundingBox.height, 0, false, true)
    ctx.restore()
  }
}
