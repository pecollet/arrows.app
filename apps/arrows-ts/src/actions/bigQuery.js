import { retrieveBigQueryProjectId } from "./localStorage"
import { getAccessToken } from "../googleDriveAuth"

export const FETCH_BIGQUERY_DATA_START = "FETCH_BIGQUERY_DATA_START"
export const FETCH_BIGQUERY_DATA_SUCCESS = "FETCH_BIGQUERY_DATA_SUCCESS"
export const FETCH_BIGQUERY_DATA_FAILURE = "FETCH_BIGQUERY_DATA_FAILURE"

// Helper to extract BigQuery Project ID from SQL FROM clause
export const extractBigQueryProjectId = (sql, settingsProjectId) => {
  if (!sql) return settingsProjectId
  const cleanSql = sql.replace(/[`"']/g, '')
  const match = cleanSql.match(/from\s+([a-zA-Z0-9_\-.]+)/i)
  if (match) {
    const path = match[1]
    const parts = path.split('.')
    if (parts.length >= 3) {
      return parts[0]
    }
  }
  return settingsProjectId
}

export const fetchBigQueryData = (nodeId, sql) => async (dispatch, getState) => {
  dispatch({
    type: FETCH_BIGQUERY_DATA_START,
    nodeId,
    query: sql
  })

  try {
    const settingsProjectId = retrieveBigQueryProjectId()
    const projectId = extractBigQueryProjectId(sql, settingsProjectId)
    if (!projectId) {
      throw new Error("BigQuery Project ID is not configured in Settings and not explicit in the SQL query.")
    }

    // Retrieve the personal Google OAuth access token using Google Drive auth state
    const token = getAccessToken(getState())
    if (!token) {
      throw new Error("Google authorization required. Please authorize Google Drive / BigQuery first.")
    }

    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false
      })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`BigQuery returned status ${response.status}: ${response.statusText} ${errBody}`)
    }

    const resJson = await response.json()
    if (resJson.errors && resJson.errors.length > 0) {
      throw new Error(`BigQuery Error: ${resJson.errors[0].message}`)
    }

    dispatch({
      type: FETCH_BIGQUERY_DATA_SUCCESS,
      nodeId,
      query: sql,
      data: {
        rows: resJson.rows || [],
        schema: resJson.schema
      }
    })
  } catch (error) {
    dispatch({
      type: FETCH_BIGQUERY_DATA_FAILURE,
      nodeId,
      query: sql,
      error: error.message
    })
  }
}
