import { DriveSavedForecast } from '../types/commodity';

/**
 * Saves a prediction dossier/report to Google Drive using the multipart upload endpoint.
 */
export async function saveForecastReportToDrive(
  accessToken: string,
  params: {
    fileName: string;
    content: string;
    mimeType: string;
    description: string;
  }
): Promise<DriveSavedForecast> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: params.fileName,
    mimeType: params.mimeType,
    description: params.description,
    properties: {
      app: 'CommodiCast',
      type: 'CommodityPredictionDossier',
    },
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${params.mimeType}\r\n\r\n` +
    params.content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size,webViewLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API upload error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    createdTime: data.createdTime,
    modifiedTime: data.modifiedTime,
    size: data.size,
    webViewLink: data.webViewLink,
    description: data.description,
  };
}

/**
 * Lists previously created CommodiCast prediction reports and dossiers from Google Drive.
 */
export async function listSavedForecastsFromDrive(
  accessToken: string
): Promise<DriveSavedForecast[]> {
  const query = encodeURIComponent("trashed = false and (name contains 'CommodiCast' or description contains 'CommodiCast')");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=40&orderBy=createdTime%20desc&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,description)`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list files from Google Drive (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Permanently deletes a file from Google Drive.
 * WARNING: The caller MUST always display a user confirmation dialog prior to calling this!
 */
export async function deleteForecastFromDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete file from Google Drive (${response.status}): ${errorText}`);
  }
}

/**
 * Retrieves the raw text or JSON content of a file from Google Drive.
 */
export async function getForecastFileContent(
  accessToken: string,
  fileId: string
): Promise<string> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file content (${response.status})`);
  }

  return response.text();
}
