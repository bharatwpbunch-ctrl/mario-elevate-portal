import * as mammoth from "mammoth"

/**
 * Extracts raw text from a DOCX file using mammoth.js in the browser.
 */
export async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
