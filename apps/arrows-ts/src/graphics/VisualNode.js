import {getStyleSelector} from "../selectors/style";
import {NodeLabelsOutsideNode} from "./NodeLabelsOutsideNode";
import {NodeCaptionInsideNode} from "./NodeCaptionInsideNode";
import {NodeBackground} from "./NodeBackground";
import {PropertiesOutside} from "./PropertiesOutside";
import {neighbourPositions} from "../model/Graph";
import BoundingBox from "./utils/BoundingBox";
import {NodeCaptionOutsideNode} from "./NodeCaptionOutsideNode";
import {NodePropertiesInside} from "./NodePropertiesInside";
import {bisect} from "./bisect";
import {NodeLabelsInsideNode} from "./NodeLabelsInsideNode";
import {NodeCaptionFillNode} from "./NodeCaptionFillNode";
import {NodeIconInside} from "./NodeIconInside";
import {IconOutside} from "./IconOutside";
import {distribute} from "./circumferentialDistribution";
import {orientationAngles, orientationFromAngle, orientationFromName} from "./circumferentialTextAlignment";
import {Vector} from "../model/Vector";
import {ComponentStack} from "./ComponentStack";
import {PrometheusPlot} from "./PrometheusPlot";
import {ConstantPlot} from "./ConstantPlot";
import {BigQueryPlot} from "./BigQueryPlot";

const typeColorMap = {
  'metric': '#E1F5FE',       // very light blue
  'query log': '#E8F5E9',     // very light green
  'neo4j setting': '#FFFDE7', // very light yellow/amber
  'server config': '#FFF3E0', // very light orange
  'client config': '#F3E5F5', // very light purple/violet
  'variable': '#E0F7FA',      // light cyan
  'treatment': '#E3F2FD',     // light blue
  'symptom': '#FBE9E7'        // light orange/red
}

const typePalette = [
  '#E8F5E9', // green
  '#FFF3E0', // orange
  '#E1F5FE', // blue
  '#F3E5F5', // purple
  '#FFFDE7', // yellow
  '#E0F7FA', // cyan
  '#FBE9E7', // deep orange
  '#EDE7F6', // deep purple
  '#F1F8E9'  // light green
]

function getColorForType(type) {
  if (!type) return '#ffffff'
  const normalized = type.toLowerCase().trim()
  if (typeColorMap[normalized]) {
    return typeColorMap[normalized]
  }
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % typePalette.length
  return typePalette[index]
}

export default class VisualNode {
  constructor(node, graph, selected, editing, measureTextContext, imageCache, prometheusState, bigQueryState) {
    this.node = node
    this.selected = selected
    this.editing = editing

    const baseStyle = styleAttribute => getStyleSelector(node, styleAttribute)(graph)
    const style = styleAttribute => {
      if (styleAttribute === 'border-color') {
        if (node.labels && node.labels.includes('Treatment')) {
          return '#2E86DE' // Nice blue
        }
        if (node.labels && node.labels.includes('Symptom')) {
          return '#F36924' // Nice orange
        }
      }
      if (styleAttribute === 'node-color') {
        const type = node.properties && node.properties.type
        if (type) {
          return getColorForType(type)
        }
      }
      return baseStyle(styleAttribute)
    }

    this.internalRadius = style('radius')
    this.radius = this.internalRadius + style('border-width')
    this.outsideComponentRadius = this.radius + style('node-margin')
    this.fitRadius = this.internalRadius - style('node-padding')
    this.background = new NodeBackground(node.position, this.internalRadius, editing, style, imageCache)
    const neighbourObstacles = neighbourPositions(node, graph).map(position => {
      return { angle: position.vectorFrom(node.position).angle() }
    })

    this.internalVerticalOffset = 0
    this.internalScaleFactor = undefined
    this.insideComponents = new ComponentStack()
    this.outsideComponents = new ComponentStack()

    const captionPosition = style('caption-position')
    const labelPosition = style('label-position')
    const propertyPosition = style('property-position')
    const iconImage = style('node-icon-image')
    const iconPosition = style('icon-position')
    const hasIcon = !!iconImage
    const hasCaption = !!node.caption
    const hasLabels = node.labels.length > 0
    const visualProperties = { ...node.properties }
    delete visualProperties.promQL
    delete visualProperties.SQL
    delete visualProperties.value
    Object.keys(visualProperties).forEach(key => {
      if (key.startsWith('param_')) {
        delete visualProperties[key]
      }
    })
    const hasProperties = false

    const outsidePosition = style('outside-position')
    switch (outsidePosition) {
      case 'auto':
        this.outsideOrientation = orientationFromAngle(distribute(orientationAngles, neighbourObstacles))
        break

      default:
        this.outsideOrientation = orientationFromName(outsidePosition)
    }

    if (hasIcon) {
      switch (iconPosition) {
        case 'inside':
          this.insideComponents.push(this.icon = new NodeIconInside('node-icon-image', editing, style, imageCache))
          break;
        default:
          this.outsideComponents.push(this.icon = new IconOutside('node-icon-image', this.outsideOrientation, editing, style, imageCache))
      }
    }

    const caption = node.caption || ''
    if (hasCaption) {
      switch (captionPosition) {
        case 'inside':
          if ((hasLabels && labelPosition === 'inside') ||
            (hasProperties && propertyPosition === 'inside') ||
            (hasIcon && iconPosition === 'inside')) {
            this.insideComponents.push(this.caption =
              new NodeCaptionInsideNode(caption, editing, style, measureTextContext))
          } else {
            this.internalScaleFactor = bisect((factor) => {
              this.caption = new NodeCaptionFillNode(caption, this.fitRadius / factor, editing, style, measureTextContext)
              return this.caption.contentsFit
            }, 1, 1e-6)
            this.insideComponents.push(this.caption)
          }
          break
        default:
          this.outsideComponents.push(this.caption = new NodeCaptionOutsideNode(
            caption, this.outsideOrientation, editing, style, measureTextContext))
          break
      }
    }

    if (hasLabels) {
      switch (labelPosition) {
        case 'inside':
          this.insideComponents.push(this.labels = new NodeLabelsInsideNode(
            node.labels, editing, style, measureTextContext))
          break

        default:
          this.outsideComponents.push(this.labels = new NodeLabelsOutsideNode(
            node.labels, this.outsideOrientation, editing, style, measureTextContext))
      }
    }

    if (hasProperties) {
      switch (propertyPosition) {
        case 'inside':
          this.insideComponents.push(this.properties = new NodePropertiesInside(
            visualProperties, editing, style, measureTextContext))
          break

        default:
          this.outsideComponents.push(this.properties = new PropertiesOutside(
            visualProperties, this.outsideOrientation, editing, style, measureTextContext))
      }
    }

    const promQL = node.properties && node.properties.promQL
    if (promQL) {
      this.outsideComponents.push(this.prometheusPlot = new PrometheusPlot(
        node.id, prometheusState, this.outsideOrientation, style))
    }

    const isConfigNode = (node.labels && (
      node.labels.includes('neo4j setting') ||
      node.labels.includes('server config') ||
      node.labels.includes('client config')
    )) || (node.properties && ['neo4j setting', 'server config', 'client config'].includes(node.properties.type))

    if (isConfigNode && node.properties && Object.prototype.hasOwnProperty.call(node.properties, 'value')) {
      const typeLabel = (node.properties.type || node.labels.find(l => ['neo4j setting', 'server config', 'client config'].includes(l)) || 'CONFIG VALUE')
      this.outsideComponents.push(this.constantPlot = new ConstantPlot(
        node.id, node.properties.value, typeLabel, this.outsideOrientation, style))
    }

    const sql = node.properties && node.properties.SQL
    if (sql) {
      this.outsideComponents.push(this.bigQueryPlot = new BigQueryPlot(
        node.id, bigQueryState, this.outsideOrientation, style))
    }

    if (this.internalScaleFactor === undefined) {
      this.internalVerticalOffset = -this.insideComponents.totalHeight() / 2
      this.internalScaleFactor = this.insideComponents.everythingFits(this.internalVerticalOffset, this.fitRadius) ?
        1 : this.insideComponents.scaleToFit(this.internalVerticalOffset, this.fitRadius)
    }

    const outsideVerticalOffset = (() => {
      const height = this.outsideComponents.totalHeight()
      switch (this.outsideOrientation.vertical) {
        case 'top':
          return -height
        case 'center':
          return -height / 2
        case 'bottom':
          return 0
      }
    })()
    this.outsideOffset = new Vector(1, 0)
      .rotate(this.outsideOrientation.angle)
      .scale(this.outsideComponentRadius)
      .plus(new Vector(0, outsideVerticalOffset))
  }

  get id() {
    return this.node.id
  }

  get position() {
    return this.node.position
  }

  get status() {
    return this.node.status
  }

  get superNodeId() {
    return this.node.superNodeId
  }

  get type() {
    return this.node.type
  }

  get initialPositions() {
    return this.node.initialPositions
  }

  draw(ctx) {
    if (this.status === 'combined') {
      return
    }

    ctx.save('node')

    if (this.selected) {
      this.background.drawSelectionIndicator(ctx)

      ctx.save()
      ctx.translate(...this.position.xy)
      ctx.translate(...this.outsideOffset.dxdy)

      this.outsideComponents.drawSelectionIndicator(ctx)

      ctx.restore()
    }

    this.background.draw(ctx)

    ctx.save()
    ctx.translate(...this.position.xy)

    ctx.save()
    ctx.scale(this.internalScaleFactor);
    ctx.translate(0, this.internalVerticalOffset);

    this.insideComponents.draw(ctx)

    ctx.restore()

    ctx.save()
    ctx.translate(...this.outsideOffset.dxdy)

    this.outsideComponents.draw(ctx)

    ctx.restore()

    ctx.restore()
    ctx.restore()
  }

  boundingBox() {
    let box = new BoundingBox(
      this.position.x - this.radius,
      this.position.x + this.radius,
      this.position.y - this.radius,
      this.position.y + this.radius
    )

    if (this.outsideComponents.isEmpty()) {
      return box
    }

    return box.combine(this.outsideComponents.boundingBox()
      .translate(this.position.vectorFromOrigin())
      .translate(this.outsideOffset))
  }

  distanceFrom(point) {
    const localPoint = point.translate(this.position.vectorFromOrigin().invert())
    const outsidePoint = localPoint.translate(this.outsideOffset.invert())
    return Math.min(
      this.position.vectorFrom(point).distance(),
      this.outsideComponents.distanceFrom(outsidePoint)
    )
  }

  componentAtPoint(point) {
    const localPoint = point.translate(this.position.vectorFromOrigin().invert())
    const outsidePoint = localPoint.translate(this.outsideOffset.invert())
    for (const offsetComponent of this.outsideComponents.offsetComponents) {
      const componentPoint = outsidePoint.translate(new Vector(0, -offsetComponent.top))
      if (offsetComponent.component.distanceFrom(componentPoint) === 0) {
        return offsetComponent.component
      }
    }
    return null
  }
}