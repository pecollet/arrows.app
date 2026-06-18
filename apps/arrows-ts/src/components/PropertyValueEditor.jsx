import React, {Component} from 'react';

export class PropertyValueEditor extends Component {

  handleChange = (e) => {
    this.props.onSetPropertyValue(e.target.value)
  }

  render() {
    const padding = 10
    if (this.props.propertyKey === 'type') {
      const options = [
        'metric',
        'neo4j setting',
        'server config',
        'client config',
        'query log'
      ]
      return (
        <select
          value={this.props.text}
          onKeyDown={this.props.onKeyDown}
          onChange={this.handleChange}
          style={{
            position: 'absolute',
            padding: 0,
            left: this.props.left,
            top: this.props.top,
            width: this.props.width + padding,
            height: this.props.font.fontSize * 1.2,
            outline: 'none',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            ...this.props.font,
            lineHeight: 1.2,
            cursor: 'pointer'
          }}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    return (
      <input
        value={this.props.text}
        onKeyDown={this.props.onKeyDown}
        onChange={this.handleChange}
        style={{
          position: 'absolute',
          padding: 0,
          left: this.props.left,
          top: this.props.top,
          width: this.props.width + padding,
          height: this.props.font.fontSize * 1.2,
          outline: 'none',
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          ...this.props.font,
          lineHeight: 1.2
        }}
      >
      </input>
    )
  }
}