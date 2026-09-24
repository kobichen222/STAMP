declare module 'imagetracerjs' {
  const ImageTracer: { imagedataToSVG: (img: ImageData, opts?: Record<string, unknown>) => string };
  export default ImageTracer;
}
