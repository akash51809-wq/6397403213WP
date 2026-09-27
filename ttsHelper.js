const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  console.warn('[ttsHelper] ffmpeg-static not found:', e.message);
}

/**
 * Split text into chunks suitable for Google TTS API (max ~180 characters per request)
 */
function chunkText(text, maxLen = 180) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const words = clean.split(/\s+/);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [clean.substring(0, maxLen)];
}

/**
 * Fetch Google TTS MP3 buffer directly via HTTP
 */
async function fetchGoogleTTSHttp(chunk, lang = 'hi') {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    },
    timeout: 10000
  });
  return Buffer.from(response.data);
}

/**
 * Convert any audio buffer (MP3, WAV, etc.) to WhatsApp's native Voice Note format (OGG Opus, Mono 48kHz).
 * This format plays natively on ALL devices:
 * - Android (Samsung, Xiaomi, Vivo, Realme, OnePlus, etc.)
 * - iOS (iPhone / iPad)
 * - WhatsApp Web & Desktop
 *
 * @param {Buffer} inputBuffer
 * @param {string} [outputFilePath]
 * @returns {Promise<{ buffer: Buffer, mimetype: string, filePath?: string }>}
 */
async function convertAudioToWhatsAppVoice(inputBuffer, outputFilePath = null) {
  if (!ffmpegPath || !inputBuffer || inputBuffer.length === 0) {
    return {
      buffer: inputBuffer,
      mimetype: 'audio/ogg; codecs=opus',
      filePath: outputFilePath
    };
  }

  return new Promise((resolve) => {
    try {
      // WhatsApp Voice Note Specification:
      // Codec: libopus, Channels: 1 (mono), Sample rate: 48000Hz, Container: ogg
      const proc = spawn(ffmpegPath, [
        '-y',
        '-i', 'pipe:0',
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-ar', '48000',
        '-ac', '1',
        '-avoid_negative_ts', 'make_zero',
        '-f', 'ogg',
        'pipe:1'
      ], { stdio: ['pipe', 'pipe', 'pipe'] });

      const chunks = [];
      proc.stdout.on('data', (c) => chunks.push(c));

      let stderr = '';
      proc.stderr.on('data', (c) => {
        stderr += c.toString();
      });

      proc.on('error', (err) => {
        console.warn('[ttsHelper] FFmpeg process error:', err.message);
        resolve({
          buffer: inputBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          filePath: outputFilePath
        });
      });

      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const oggBuffer = Buffer.concat(chunks);
          if (outputFilePath) {
            try {
              const dir = path.dirname(outputFilePath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(outputFilePath, oggBuffer);
            } catch (fsErr) {
              console.warn('[ttsHelper] Error saving converted ogg file:', fsErr.message);
            }
          }
          resolve({
            buffer: oggBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            filePath: outputFilePath
          });
        } else {
          console.warn(`[ttsHelper] FFmpeg conversion warning (code ${code}):`, stderr.slice(-200));
          resolve({
            buffer: inputBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            filePath: outputFilePath
          });
        }
      });

      proc.stdin.on('error', () => {});
      proc.stdin.write(inputBuffer);
      proc.stdin.end();
    } catch (e) {
      console.warn('[ttsHelper] convertAudioToWhatsAppVoice exception:', e.message);
      resolve({
        buffer: inputBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        filePath: outputFilePath
      });
    }
  });
}

/**
 * Robust text-to-speech converter
 * Generates an MP3 buffer from input text using Google Text-to-Speech.
 *
 * @param {string} text 
 * @param {string} lang e.g. 'hi', 'en', 'gu', 'bn', 'ur', 'mr', 'ta', 'te'
 * @param {string} [outputFilePath]
 * @returns {Promise<{ buffer: Buffer, filePath?: string }>}
 */
async function generateTTS(text, lang = 'hi', outputFilePath = null) {
  const cleanText = String(text || '').trim();
  const targetLang = String(lang || 'hi').trim().toLowerCase();

  if (!cleanText) {
    throw new Error('Voice conversion ke liye text anivarya hai.');
  }

  // Split text into safe chunks (max ~180 chars) to prevent Google TTS truncation
  const textChunks = chunkText(cleanText, 180);
  const audioParts = [];

  for (const chunk of textChunks) {
    try {
      const partBuffer = await fetchGoogleTTSHttp(chunk, targetLang);
      if (partBuffer && partBuffer.length > 0) {
        audioParts.push(partBuffer);
      }
    } catch (err) {
      console.warn(`[ttsHelper] HTTP chunk failed for lang=${targetLang}, trying en fallback:`, err.message);
      // Fallback try with English or retry
      try {
        const fallbackBuf = await fetchGoogleTTSHttp(chunk, 'en');
        if (fallbackBuf && fallbackBuf.length > 0) {
          audioParts.push(fallbackBuf);
        }
      } catch (fbErr) {
        console.error('[ttsHelper] Fallback chunk failed:', fbErr.message);
      }
    }
  }

  const finalBuffer = Buffer.concat(audioParts);

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error('Google Voice conversion failed: could not retrieve audio data.');
  }

  if (outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputFilePath, finalBuffer);
  }

  return {
    buffer: finalBuffer,
    filePath: outputFilePath
  };
}

/**
 * End-to-end Text-to-Speech to WhatsApp Universal Voice Note
 * Generates TTS and converts to OGG Opus (Mono, 48kHz) for 100% universal mobile + desktop compatibility.
 *
 * @param {string} text
 * @param {string} [lang]
 * @param {string} [oggFilePath]
 * @returns {Promise<{ buffer: Buffer, mimetype: string, mp3Buffer: Buffer, filePath?: string }>}
 */
async function generateWhatsAppVoiceNote(text, lang = 'hi', oggFilePath = null) {
  const { buffer: mp3Buffer } = await generateTTS(text, lang);
  const { buffer: oggBuffer, mimetype, filePath } = await convertAudioToWhatsAppVoice(mp3Buffer, oggFilePath);

  return {
    buffer: oggBuffer,
    mimetype: mimetype || 'audio/ogg; codecs=opus',
    mp3Buffer,
    filePath
  };
}

module.exports = {
  generateTTS,
  convertAudioToWhatsAppVoice,
  generateWhatsAppVoiceNote,
  chunkText
};
