import axios from "axios";
import { IUploadParams } from "./interfaces";
import { serializeParams, getUrlName } from "./url";
import { truncateName } from "./string";
import { apimInstances } from "./apim";
import { Logger } from "./logger";
import { v4 as uuidv4 } from 'uuid';

function getApiUri(env = "prod", auth = false, region = "trial") {
  if (apimInstances[env]) {
    return auth
      ? `${apimInstances[env].base}${apimInstances[env].auth}/${region}`
      : `${apimInstances[env].base}${apimInstances[env].operation}/${region}`;
  } else {
    return apimInstances.prod.base;
  }
}

export async function getAccountAccessToken(
  apiKey: string,
  accountId: string,
  env: string = "prod",
  region: string = "trial"
) {
  const apiBase = getApiUri(env, true, region);
  const url = `${apiBase}/Accounts/${accountId}/AccessToken?allowEdit=true`;
  Logger.log(`Getting access token: ${url}`);
  return axios.get(url, {
    headers: {
      "x-ms-client-request-id": uuidv4(),
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  });
}

export async function getAccountVideos(
  token: string,
  accountId: string,
  env: string = "prod",
  region: string = "trial"
) {
  const apiBase = getApiUri(env, false, region);
  const url = `${apiBase}/Accounts/${accountId}/videos`;
  Logger.log(`Calling VI API with URL: ${url}`);
  return axios.get(url, {
    headers: {
      "x-ms-client-request-id": uuidv4(),
      authorization: `Bearer ${token}`,
    },
  });
}

// VI API Call
export async function uploadVideo(
  accountId: string,
  accessToken: string,
  env: string,
  region: string,
  params: IUploadParams
) {
  try {
    // Get all upload params
    const uploadParams: IUploadParams = params;
  
    // Clear name
    uploadParams.name = truncateName(params.name || getUrlName(params.videoUrl));
  
    // Call api
    const apiBase = getApiUri(env, false, region);
    
    // Cleanup
    delete uploadParams['apiKey'];
    delete uploadParams.accountId;
    delete uploadParams.accessToken;

    // Call
    const urlParams = serializeParams(uploadParams);
    let url = `${apiBase}/Accounts/${accountId}/Videos/?${urlParams}`;
  
    Logger.log(`Uploading ${uploadParams.name}`);
    Logger.log(`Calling VI API with URL: POST ${url}`);
    return axios.post(url, null, {
      headers: {
        "x-ms-client-request-id": uuidv4(),
        Authorization: `Bearer ${accessToken}`
       },
    });
    
  } catch (error) {
    return error;
  }
}
