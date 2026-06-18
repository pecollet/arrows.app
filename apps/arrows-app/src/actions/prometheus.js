import { retrievePrometheusUrl, retrievePrometheusGcpServiceAccountData } from "./localStorage"

export const FETCH_PROMETHEUS_DATA_START = "FETCH_PROMETHEUS_DATA_START"
export const FETCH_PROMETHEUS_DATA_SUCCESS = "FETCH_PROMETHEUS_DATA_SUCCESS"
export const FETCH_PROMETHEUS_DATA_FAILURE = "FETCH_PROMETHEUS_DATA_FAILURE"

// Helper to sign JWT using Web Crypto API RS256 and exchange it for a GCP OAuth Access Token
async function getGcpAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson)
  if (!sa.private_key || !sa.client_email) {
    throw new Error("Invalid service account JSON: missing private_key or client_email")
  }

  const header = {
    alg: "RS256",
    typ: "JWT"
  }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600
  }

  // Base64URL encoding helper
  const base64UrlEncode = (strOrBuffer) => {
    let base64;
    if (typeof strOrBuffer === 'string') {
      base64 = btoa(unescape(encodeURIComponent(strOrBuffer)));
    } else {
      const bytes = new Uint8Array(strOrBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Parse PEM private key
  const pem = sa.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter));
  const cleanPem = pemContents.replace(/\s/g, "");
  const binaryDerString = atob(cleanPem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  // Import key
  const key = await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  // Sign message
  const encoder = new TextEncoder();
  const signatureBuffer = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(message)
  );

  const signature = base64UrlEncode(signatureBuffer);
  const jwt = `${message}.${signature}`;

  // Exchange for access token
  const response = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange Google JWT: ${response.statusText} - ${errorText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

export const fetchPrometheusData = (nodeId, query) => async (dispatch, getState) => {
  dispatch({
    type: FETCH_PROMETHEUS_DATA_START,
    nodeId,
    query
  })

  try {
    const baseUrl = retrievePrometheusUrl()
    if (!baseUrl) {
      throw new Error("Prometheus URL is not configured in Settings.")
    }

    const saData = retrievePrometheusGcpServiceAccountData()
    const headers = {
      "Accept": "application/json"
    }

    if (saData && saData.trim() !== "") {
      try {
        const token = await getGcpAccessToken(saData)
        headers["Authorization"] = `Bearer ${token}`
      } catch (e) {
        throw new Error(`GCP Authentication failed: ${e.message}`)
      }
    }

    const end = Math.floor(Date.now() / 1000)
    const start = end - 3600 // 1 hour ago
    const step = 15 // 15s interval (240 points)

    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&step=${step}`

    const response = await fetch(url, {
      method: "GET",
      headers
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`Prometheus returned status ${response.status}: ${response.statusText} ${errBody}`)
    }

    const resJson = await response.json()
    if (resJson.status !== "success" || !resJson.data || !resJson.data.result) {
      throw new Error(`Prometheus query status is ${resJson.status || "unknown"}`)
    }

    dispatch({
      type: FETCH_PROMETHEUS_DATA_SUCCESS,
      nodeId,
      query,
      data: resJson.data.result
    })
  } catch (error) {
    dispatch({
      type: FETCH_PROMETHEUS_DATA_FAILURE,
      nodeId,
      query,
      error: error.message
    })
  }
}
