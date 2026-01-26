import crypto from 'crypto';
import { InternalServerException } from '../exceptions/index.js';

// Cấu hình trong .env:
// ENCRYPTION_KEY=... (32 ký tự)
// ENCRYPTION_IV_LENGTH=16

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Demo
const IV_LENGTH = 16;

export const encryptionUtils = {
	encrypt: (text) => {
		try {
			if (!text) return null;
			const iv = crypto.randomBytes(IV_LENGTH);
			const cipher = crypto.createCipheriv(
				ALGORITHM,
				Buffer.from(ENCRYPTION_KEY),
				iv,
			);
			let encrypted = cipher.update(text);
			encrypted = Buffer.concat([encrypted, cipher.final()]);
			return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
		} catch (error) {
			console.error('Encrypt Error:', error);
			throw new InternalServerException();
		}
	},

	decrypt: (text) => {
		try {
			if (!text) return null;
			const textParts = text.split(':');
			const iv = Buffer.from(textParts.shift(), 'hex');
			const encryptedText = Buffer.from(textParts.join(':'), 'hex');
			const decipher = crypto.createDecipheriv(
				ALGORITHM,
				Buffer.from(ENCRYPTION_KEY),
				iv,
			);
			let decrypted = decipher.update(encryptedText);
			decrypted = Buffer.concat([decrypted, decipher.final()]);
			return decrypted.toString();
		} catch (error) {
			console.error('Decrypt Error:', error);
			throw new InternalServerException();
		}
	},
};
