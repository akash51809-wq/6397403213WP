const path = require('path');
const crypto = require('crypto');

// Allowed MIME types mapped to canonical extensions
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  // Audio
  'audio/ogg': ['.ogg'],
  'audio/opus': ['.opus', '.ogg'],
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.m4a'],
  'audio/aac': ['.aac'],
  'audio/wav': ['.wav'],
  // Video
  'video/mp4': ['.mp4'],
  'video/3gpp': ['.3gp'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z']
};

// Explicit blacklist for executable, script, and dangerous extensions
const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.com', '.msi', '.scr', '.vbs', '.vbe',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.php', '.phtml', '.php3', '.php4',
  '.php5', '.phps', '.pl', '.py', '.pyc', '.pyw', '.rb', '.cgi', '.jar', '.jsp',
  '.asp', '.aspx', '.cer', '.csr', '.hta', '.ps1', '.ps2', '.dll', '.sys', '.drv',
  '.so', '.app', '.dmg', '.deb', '.rpm', '.iso', '.img', '.html', '.htm', '.xhtml',
  '.shtml', '.svg', '.xml', '.swf', '.wasm'
]);

// Explicit blacklist for dangerous MIME types
const FORBIDDEN_MIMES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'application/x-msdos-program',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/x-php',
  'application/x-httpd-php',
  'text/html',
  'text/xml',
  'image/svg+xml'
]);

/**
 * Validates a base64 encoded string and checks for dangerous content
 * @param {string} base64String - Raw or data-URL base64 string
 * @param {object} options
 * @param {number} options.maxSizeBytes - Maximum allowed decoded size in bytes (default 15MB)
 * @param {string} options.claimedMimeType - MIME type provided by client
 * @param {string} options.claimedFileName - Filename provided by client
 * @param {string} options.prefix - Prefix for generated random filename (default 'out')
 * @returns {{ valid: boolean, buffer?: Buffer, mimeType?: string, safeFilename?: string, fileSize?: number, error?: string }}
 */
function validateAndProcessMediaUpload(base64String, options = {}) {
  const maxSizeBytes = options.maxSizeBytes || (15 * 1024 * 1024); // default 15MB
  const claimedMime = String(options.claimedMimeType || '').trim().toLowerCase();
  const rawFileName = String(options.claimedFileName || 'file').trim();
  const prefix = String(options.prefix || 'out').replace(/[^a-zA-Z0-9_-]/g, '');

  let buffer;
  let headerMime = null;

  if (Buffer.isBuffer(base64String)) {
    buffer = base64String;
  } else if (typeof base64String === 'string') {
    // 1. Extract base64 payload and detected header MIME if available
    let cleanBase64 = base64String;
    const dataUrlMatch = base64String.match(/^data:([a-zA-Z0-9_\-\.\/]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      headerMime = dataUrlMatch[1].toLowerCase();
      cleanBase64 = dataUrlMatch[2];
    } else if (cleanBase64.includes('base64,')) {
      const parts = cleanBase64.split('base64,');
      cleanBase64 = parts[1];
    }

    // Remove whitespace/newlines from base64
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    // 2. Validate base64 structure and characters
    if (!cleanBase64 || cleanBase64.length === 0) {
      return { valid: false, error: 'अमान्य फ़ाइल: डेटा खाली है।' };
    }

    // Quick sanity check for valid base64 character set
    if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64) || cleanBase64.length % 4 !== 0) {
      return { valid: false, error: 'अमान्य फ़ाइल एन्कोडिंग: Malformed base64 payload.' };
    }

    // 3. Approximate size check before decoding
    const estimatedSize = Math.floor((cleanBase64.length * 3) / 4);
    if (estimatedSize > maxSizeBytes * 1.05) {
      return { valid: false, error: `फ़ाइल का आकार सीमा (${Math.round(maxSizeBytes / (1024 * 1024))}MB) से अधिक है।` };
    }

    // 4. Decode base64 to buffer safely
    try {
      buffer = Buffer.from(cleanBase64, 'base64');
    } catch (decErr) {
      return { valid: false, error: 'फ़ाइल डिकोड करने में त्रुटि: ' + decErr.message };
    }
  } else {
    return { valid: false, error: 'अमान्य फ़ाइल डेटा: Buffer या Base64 स्ट्रिंग आवश्यक है।' };
  }

  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'अमान्य फ़ाइल: डिकोड किया गया डेटा खाली है।' };
  }

  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `फ़ाइल का आकार (${Math.round(buffer.length / (1024 * 1024))}MB) अधिकतम सीमा (${Math.round(maxSizeBytes / (1024 * 1024))}MB) से अधिक है।` };
  }

  // 5. Check extension of claimed file name
  const rawExt = path.extname(rawFileName).toLowerCase();
  if (rawExt && FORBIDDEN_EXTENSIONS.has(rawExt)) {
    return { valid: false, error: `सुरक्षा प्रतिबंध: ${rawExt} प्रकार की निष्पादन योग्य (executable/script) फ़ाइलें प्रतिबंधित हैं।` };
  }

  // 6. Deep inspection for executable signatures and magic bytes
  // MZ header for Windows PE (.exe, .dll, .sys)
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'सुरक्षा प्रतिबंध: Windows Executable (.exe/PE) फ़ाइलें पूर्णतः प्रतिबंधित हैं।' };
  }
  // Linux ELF header
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'सुरक्षा प्रतिबंध: Linux Binary Executable (ELF) फ़ाइलें पूर्णतः प्रतिबंधित हैं।' };
  }
  // Script shebang (#!)
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { valid: false, error: 'सुरक्षा प्रतिबंध: Script/Shell फ़ाइलें पूर्णतः प्रतिबंधित हैं।' };
  }
  // Text script inspection (PHP, HTML, JS) in first 1024 bytes
  const headerSlice = buffer.slice(0, 1024).toString('utf8', 0, Math.min(buffer.length, 1024)).toLowerCase();
  if (headerSlice.includes('<?php') || headerSlice.includes('<script') || headerSlice.includes('<html') || headerSlice.includes('onload=')) {
    return { valid: false, error: 'सुरक्षा प्रतिबंध: HTML/PHP/Script सामग्री वाली फ़ाइलें प्रतिबंधित हैं।' };
  }

  // 7. Resolve and validate MIME type
  const effectiveMime = (headerMime || claimedMime || 'application/octet-stream').toLowerCase();
  if (FORBIDDEN_MIMES.has(effectiveMime)) {
    return { valid: false, error: `सुरक्षा प्रतिबंध: ${effectiveMime} MIME प्रकार प्रतिबंधित है।` };
  }

  // 8. Resolve safe extension
  let safeExt = null;
  if (ALLOWED_MIME_TYPES[effectiveMime]) {
    const allowedExts = ALLOWED_MIME_TYPES[effectiveMime];
    safeExt = (rawExt && allowedExts.includes(rawExt)) ? rawExt : allowedExts[0];
  } else if (rawExt && !FORBIDDEN_EXTENSIONS.has(rawExt) && /^\.[a-zA-Z0-9]{1,8}$/.test(rawExt)) {
    // If MIME is octet-stream or generic, check if the extension matches an allowed type
    for (const [m, exts] of Object.entries(ALLOWED_MIME_TYPES)) {
      if (exts.includes(rawExt)) {
        safeExt = rawExt;
        break;
      }
    }
  }

  if (!safeExt) {
    return { valid: false, error: `अमान्य फ़ाइल प्रकार (${effectiveMime || rawExt})। केवल अधिकृत छवियां, ऑडियो, वीडियो और दस्तावेज़ स्वीकार्य हैं।` };
  }

  // 9. Generate cryptographically safe random filename (prevents directory traversal & collisions)
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const safeFilename = `${prefix}_${Date.now()}_${randomSuffix}${safeExt}`;

  return {
    valid: true,
    buffer,
    mimeType: effectiveMime === 'application/octet-stream' ? Object.keys(ALLOWED_MIME_TYPES).find(m => ALLOWED_MIME_TYPES[m].includes(safeExt)) || effectiveMime : effectiveMime,
    ext: safeExt,
    safeFilename,
    fileSize: buffer.length,
    originalName: path.basename(rawFileName).replace(/[^a-zA-Z0-9_\-\. ]/g, '')
  };
}

module.exports = {
  validateAndProcessMediaUpload,
  ALLOWED_MIME_TYPES,
  FORBIDDEN_EXTENSIONS,
  FORBIDDEN_MIMES
};
