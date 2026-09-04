import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";
import path from "path";

const MODEL_PATH = path.join(process.cwd(), "node_modules/@vladmandic/face-api/model");
const MAX_FACE_IMAGE_PIXELS = 16_000_000; // 16 MP decode bomb guard

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

/** 128-d face-recognition descriptors for every face found in an in-memory image buffer. */
export async function detectFacesFromBuffer(buffer: Buffer): Promise<number[][]> {
  await loadModels();

  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_FACE_IMAGE_PIXELS })
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

    return results.map((r) => Array.from(r.descriptor as Float32Array));
  } finally {
    tensor.dispose();
  }
}
