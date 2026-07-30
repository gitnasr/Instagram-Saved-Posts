import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";
import path from "path";

const MODEL_PATH = path.join(process.cwd(), "node_modules/@vladmandic/face-api/model");

let modelsReady: Promise<void> | null = null;

function loadModels(): Promise<void> {
  if (!modelsReady) {
    modelsReady = (async () => {
      await tf.setBackend("wasm");
      await tf.ready();
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    })();
  }
  return modelsReady;
}

export interface DetectedFace {
  bbox: { x: number; y: number; width: number; height: number };
  descriptor: number[];
}

async function detectFacesInBuffer(buffer: Buffer): Promise<DetectedFace[]> {
  await loadModels();

  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, info.channels],
    "int32"
  );

  try {
    const results = await faceapi
      .detectAllFaces(tensor as never)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return results.map((r) => ({
      bbox: {
        x: r.detection.box.x,
        y: r.detection.box.y,
        width: r.detection.box.width,
        height: r.detection.box.height,
      },
      descriptor: Array.from(r.descriptor as Float32Array),
    }));
  } finally {
    tensor.dispose();
  }
}

/** All faces (128-d descriptor + bbox each) found in an image at a stable HTTPS URL. */
export async function detectFacesFromUrl(url: string): Promise<DetectedFace[]> {
  const resp = await fetch(url);
  const buffer = Buffer.from(await resp.arrayBuffer());
  return detectFacesInBuffer(buffer);
}

/** All faces (128-d descriptor + bbox each) found in an in-memory image buffer (search-query uploads). */
export async function detectFacesFromBuffer(buffer: Buffer): Promise<DetectedFace[]> {
  return detectFacesInBuffer(buffer);
}
