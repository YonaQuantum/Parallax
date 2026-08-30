import { cleanHeaders } from "../pipeline/utils.mjs";

export async function fetchJson(url, token, userAgent) {
  const response = await fetch(url, {
    headers: cleanHeaders({
      "accept": "application/vnd.github+json",
      "authorization": token ? `Bearer ${token}` : undefined,
      "user-agent": userAgent
    })
  });

  if (!response.ok) {
    throw new Error(`${url.host} ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function fetchText(url, userAgent) {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`${url.host} ${response.status}: ${await response.text()}`);
  }

  return response.text();
}
