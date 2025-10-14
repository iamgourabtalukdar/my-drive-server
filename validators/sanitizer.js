import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

export function sanitizeInput(input) {
  // Ensure we only process strings
  if (typeof input !== "string") {
    return input;
  }

  return purify.sanitize(input);
}

export default purify;
