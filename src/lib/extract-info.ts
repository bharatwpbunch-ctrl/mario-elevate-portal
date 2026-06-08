export function parseResumeText(text: string) {
  // 1. Email Regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i
  const emailMatch = text.match(emailRegex)
  const email = emailMatch ? emailMatch[1] : ""

  // 2. Phone Regex (Matches international and 10 digit formats loosely)
  const phoneRegex = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/
  const phoneMatch = text.match(phoneRegex)
  const phone = phoneMatch ? phoneMatch[0] : ""

  // 3. Name Heuristic
  // We look at the first few lines, find the first one that is 2-4 words long and consists mostly of letters.
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
  
  let name = ""
  for (const line of lines.slice(0, 10)) { // look at first 10 non-empty lines
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes("resume") || lowerLine.includes("curriculum vitae") || lowerLine.includes("cv") || lowerLine.includes("page")) {
      continue
    }
    // Simple check: 2-4 words, mostly letters
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z\s]+$/.test(line)) {
      name = line
      break
    }
  }

  // Fallback: if we didn't find a nice 2-4 word string, just use the very first line as a fallback if it exists and isn't too long.
  if (!name && lines.length > 0 && lines[0].length < 50) {
    name = lines[0]
  }

  return { email, phone, name }
}
