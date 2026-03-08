const { BlobServiceClient } = require('@azure/storage-blob');

let blobServiceClient;
let containerClient;

function getContainerClient() {
  if (!containerClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER
    );
  }
  return containerClient;
}

async function uploadFile(blobName, buffer, contentType) {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blockBlobClient.url;
}

async function downloadFile(blobName) {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);
  return downloadResponse;
}

async function deleteFile(blobName) {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.delete();
}

async function generateSasUrl(blobName, expiresInMinutes = 60) {
  const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const sasUrl = blockBlobClient.url;
  return sasUrl;
}

module.exports = { uploadFile, downloadFile, deleteFile, generateSasUrl, getContainerClient };
