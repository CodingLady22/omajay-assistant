import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "@/db/client";

const BUCKET_NAME = "contract_pdfs";

function bucket(): GridFSBucket {
  return new GridFSBucket(getDb(), { bucketName: BUCKET_NAME });
}

export async function uploadPdf(filename: string, buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // contentType is deprecated at the top level of a GridFS file document —
    // this driver version only accepts it inside `metadata`.
    const uploadStream = bucket().openUploadStream(filename, { metadata: { contentType: "application/pdf" } });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id.toString()));
    uploadStream.end(buffer);
  });
}

export async function downloadPdf(fileId: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    const downloadStream = bucket().openDownloadStream(new ObjectId(fileId));
    downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function deletePdf(fileId: string): Promise<void> {
  await bucket().delete(new ObjectId(fileId));
}
