import pcloud from "pcloud-sdk-js";

// Helper to call pCloud API with region fallback using the SDK
export async function pcloudApi(method: string, params: any) {
  const client = pcloud.createClient('DUMMY_TOKEN' /* OAuth token is not required for public folders */);
  const servers = ["api.pcloud.com", "eapi.pcloud.com"];
  let lastRes: any;

  for (const apiServer of servers) {
    try {
      if (method === "getpubthumblink" || method === "getpubthumbslinks") {
        // pcloud-sdk-js validates method names and throws if unknown.
        // getpubthumblink(s) is not in the allowlist, so we use fetch directly.
        const url = new URL(`https://${apiServer}/${method}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.result !== 0) {
          throw data;
        }
        return data;
      } else {
        // Using SDK's client.api which handles auth and URL building
        const res = await client.api(method, { params, apiServer });
        return res;
      }
    } catch (err: any) {
      lastRes = err;
      // 7001 is "Invalid link 'code'", happens if region is wrong for publinks
      if (err.result === 7001 || err.result === 500) {
        console.warn(`pCloud API error ${err.result} on ${apiServer}, trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw lastRes;
}
