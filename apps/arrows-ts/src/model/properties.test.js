import {combineProperties, setProperty, renameProperty, removeProperty} from "./properties";

it('confirms properties from a single entity are self-consistent', () => {
  const entities = [
    {properties: {a: 'a', b: 'b', c: 'c1'}}
  ]
  expect(combineProperties(entities)).toEqual({
    a: {status: 'CONSISTENT', value: 'a'},
    b: {status: 'CONSISTENT', value: 'b'},
    c: {status: 'CONSISTENT', value: 'c1'}
  })
})

it('combines properties from different entities', () => {
  const entities = [
    {properties: {a: 'a', b: 'b', c: 'c1'}},
    {properties: {b: 'b', c: 'c2', d: 'd'}}
  ]
  expect(combineProperties(entities)).toEqual({
    a: {status: 'PARTIAL'},
    b: {status: 'CONSISTENT', value: 'b'},
    c: {status: 'INCONSISTENT'},
    d: {status: 'PARTIAL'}
  })
})

describe('node property adjustment logic', () => {
  const createNode = (properties) => ({
    caption: '',
    position: { x: 0, y: 0 },
    properties
  })

  it('always keeps/creates unit and name, and adds promQL if type is metric', () => {
    const node = createNode({ type: 'metric' })
    const updated = setProperty(node, 'type', 'metric')
    expect(updated.properties).toEqual({
      type: 'metric',
      unit: '',
      name: '',
      promQL: ''
    })
  })

  it('updates SQL and removes promQL/value when type changes to query log', () => {
    const node = createNode({ type: 'metric', promQL: 'rate(http_requests_total[5m])', unit: 'req/sec', name: 'HTTP Requests' })
    const updated = setProperty(node, 'type', 'query log')
    expect(updated.properties).toEqual({
      type: 'query log',
      unit: 'req/sec',
      name: 'HTTP Requests',
      SQL: ''
    })
  })

  it('updates value and removes promQL/SQL when type changes to server config', () => {
    const node = createNode({ type: 'metric', promQL: 'rate(http_requests_total[5m])', unit: 'req/sec', name: 'HTTP Requests' })
    const updated = setProperty(node, 'type', 'server config')
    expect(updated.properties).toEqual({
      type: 'server config',
      unit: 'req/sec',
      name: 'HTTP Requests',
      value: ''
    })
  })

  it('removes promQL, SQL, and value when type is deleted', () => {
    const node = createNode({ type: 'metric', promQL: 'rate(http_requests_total[5m])', unit: 'req/sec', name: 'HTTP Requests' })
    const updated = removeProperty(node, 'type')
    expect(updated.properties).toEqual({
      unit: 'req/sec',
      name: 'HTTP Requests'
    })
  })
})