import {Point} from "../model/Point"
import BoundingBox from "./utils/BoundingBox"

export class ConstantPlot {
  constructor(nodeId, value, label, orientation, style) {
    this.nodeId = nodeId
    this.valueStr = value || '0'
    this.label = label || 'CONFIG VALUE'
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
    return 'CONSTANT_PLOT'
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
    ctx.fillText(this.label.toUpperCase(), 10, 10)

    const V = parseFloat(this.valueStr)
    if (isNaN(V)) {
      // Non-numeric value - draw elegantly as text in the center
      ctx.fillStyle = '#0F172A'
      ctx.font = { fontWeight: 'normal', fontSize: 11, fontFamily: 'sans-serif' }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const truncated = this.valueStr.length > 25 ? this.valueStr.substring(0, 22) + '...' : this.valueStr
      ctx.fillText(truncated, this.width / 2, this.height / 2 + 5)
    } else {
      // Numeric value - draw as timeline chart!
      const paddingLeft = 10
      const paddingRight = 10
      const paddingTop = 26
      const paddingBottom = 10
      const plotWidth = this.width - paddingLeft - paddingRight
      const plotHeight = this.height - paddingTop - paddingBottom

      // Determine smart vMin and vMax
      let vMin = 0
      let vMax = 1
      if (V > 0) {
        vMin = 0
        vMax = V * 1.2
      } else if (V < 0) {
        vMin = V * 1.2
        vMax = 0
      } else {
        vMin = -1
        vMax = 1
      }
      const vDiff = vMax - vMin

      // Map the constant value V to the y coordinate
      const yVal = paddingTop + plotHeight - ((V - vMin) / vDiff) * plotHeight

      // Draw translucent area under the line
      ctx.beginPath()
      ctx.moveTo(paddingLeft, yVal)
      ctx.lineTo(paddingLeft + plotWidth, yVal)
      ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight)
      ctx.lineTo(paddingLeft, paddingTop + plotHeight)
      ctx.closePath()

      // Area fill
      ctx.fillStyle = '#10B98126' // translucent emerald green
      ctx.fill()

      // Draw horizontal line
      ctx.beginPath()
      ctx.moveTo(paddingLeft, yVal)
      ctx.lineTo(paddingLeft + plotWidth, yVal)
      ctx.strokeStyle = '#10B981'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Draw latest value label in the upper right
      let formattedVal = V.toFixed(2)
      if (Math.abs(V) > 1000000) {
        formattedVal = (V / 1000000).toFixed(1) + 'M'
      } else if (Math.abs(V) > 1000) {
        formattedVal = (V / 1000).toFixed(1) + 'K'
      } else if (Number.isInteger(V)) {
        formattedVal = V.toString()
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
      if (Math.abs(vMax) > 1000) formattedMax = (vMax / 1000).toFixed(1) + 'k'
      ctx.fillText(formattedMax, 10, paddingTop + 2)

      ctx.textBaseline = 'bottom'
      let formattedMin = vMin.toFixed(1)
      if (Math.abs(vMin) > 1000) formattedMin = (vMin / 1000).toFixed(1) + 'k'
      ctx.fillText(formattedMin, 10, paddingTop + plotHeight - 2)
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
