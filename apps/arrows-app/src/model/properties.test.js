import {combineProperties, interpolatePromQL} from "./properties";

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