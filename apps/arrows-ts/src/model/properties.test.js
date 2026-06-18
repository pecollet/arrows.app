import {combineProperties, setProperty, renameProperty, removeProperty, interpolatePromQL} from "./properties";

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

describe('interpolatePromQL', () => {
  it('replaces single parameter in query', () => {
    const query = 'rate(http_requests_total{job="$param_job"}[5m])'
    const properties = { param_job: 'api-server', other_prop: 'val' }
    expect(interpolatePromQL(query, properties)).toBe('rate(http_requests_total{job="api-server"}[5m])')
  })

  it('replaces multiple parameters in query', () => {
    const query = 'rate(http_requests_total{job="$param_job", status="$param_status"}[5m])'
    const properties = { param_job: 'api-server', param_status: '200' }
    expect(interpolatePromQL(query, properties)).toBe('rate(http_requests_total{job="api-server", status="200"}[5m])')
  })

  it('does not replace non-existent parameters', () => {
    const query = 'rate(http_requests_total{job="$param_job", env="$param_env"}[5m])'
    const properties = { param_job: 'api-server' }
    expect(interpolatePromQL(query, properties)).toBe('rate(http_requests_total{job="api-server", env="$param_env"}[5m])')
  })

  it('does not replace non-param variables', () => {
    const query = 'rate(http_requests_total{job="$job"}[5m])'
    const properties = { param_job: 'api-server', job: 'not-replaced' }
    expect(interpolatePromQL(query, properties)).toBe('rate(http_requests_total{job="$job"}[5m])')
  })

  it('gracefully handles missing parameters or empty queries', () => {
    expect(interpolatePromQL('', {})).toBe('')
    expect(interpolatePromQL('rate(http_requests_total[5m])', null)).toBe('rate(http_requests_total[5m])')
  })
})