// crypto là gì ?
// là module chuẩn built-in của nodejs
// Nó dùng để:

// Hash password (bcrypt, sha256…)

// Mã hóa / giải mã dữ liệu (AES, RSA…)

// Ký & verify chữ ký số (JWT, OAuth…)

// -> Mã hóa Access Token / Refresh Token trước khi lưu DB

// ************ tài liệu NodeJS Crypto API ***************
//Node.js crypto aes-256-cbc
// https://stackoverflow.com/questions/52212430/am-i-doing-aes-256-encryption-and-decryption-node-js-correctly

import crypto from 'crypto';
import { InternalServerException } from '../exceptions/index.js';

const ALGORITHM = 'aes-256-cbc';
//  AES = Advanced Encryption Standard
//  256 = độ dài key (32 bytes)
//  CBC = Cipher Block Chaining (chuẩn công nghiệp)

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;
// Là số ngẫu nhiên để làm mỗi lần mã hóa khác nhau
// AES block size = 16 bytes

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
	console.error('FATAL ERROR: ENCRYPTION_KEY in .env must be exactly 32 characters!');
	process.exit(1); // Dừng server ngay nếu key không an toàn
}

export const encryptionUtils = {
	/**
	 * Mã hóa văn bản
	 * @param {string} text - Văn bản cần mã hóa (Ví dụ: Access Token)
	 * @returns {string} Chuỗi mã hóa dạng "iv:content" (Hex)
	 */

	encrypt: (text) => {
		try {
			if (!text) return null;
			// Sinh 16 byte random
			// 1. Tạo IV ngẫu nhiên (Mỗi lần mã hóa sẽ ra chuỗi khác nhau dù cùng nội dung -> Bảo mật cao)
			const iv = crypto.randomBytes(IV_LENGTH);

			// 2. Tạo Cipher
			const cipher = crypto.createCipheriv(
				ALGORITHM,
				Buffer.from(ENCRYPTION_KEY),
				iv,
			);
			// Tạo máy mã hóa
			// algorithm: aes-256-cbc
			// key: secret key
			// iv: vector khởi tạo

			// 3. Mã hóa
			let encrypted = cipher.update(text);
			encrypted = Buffer.concat([encrypted, cipher.final()]);
			// Dữ liệu được mã hóa theo từng block
			// final() xử lý block cuối

			// 4. Trả về dạng: iv:encryptedData (Để lúc giải mã biết dùng IV nào)
			return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
		} catch (error) {
			console.error('Encryption Error:', error);
			throw new InternalServerException('Lỗi mã hóa dữ liệu bảo mật.');
		}
	},

	/**
	 * Giải mã văn bản
	 * @param {string} text - Chuỗi mã hóa dạng "iv:content"
	 * @returns {string} Văn bản gốc
	 */
	decrypt: (text) => {
		try {
			if (!text) return null;

			// 1. Tách IV và Content
			//Tách iv và encryptedData
			const textParts = text.split(':');
			//Lấy IV gốc đã dùng khi encrypt
			const iv = Buffer.from(textParts.shift(), 'hex');
			//Lấy dữ liệu mã hóa
			const encryptedText = Buffer.from(textParts.join(':'), 'hex');

			// 2. Tạo Decipher
			//Dùng CÙNG algorithm + key + iv
			// Sai 1 cái → giải mã lỗi ngay
			const decipher = crypto.createDecipheriv(
				ALGORITHM,
				Buffer.from(ENCRYPTION_KEY),
				iv,
			);

			// 3. Giải mã
			//Hoàn nguyên lại token gốc
			let decrypted = decipher.update(encryptedText);
			decrypted = Buffer.concat([decrypted, decipher.final()]);

			//Trả về Access Token ban đầu
			return decrypted.toString();
		} catch (error) {
			console.error('Decryption Error:', error);
			// Thường lỗi này do Key sai hoặc Data bị lỗi
			throw new InternalServerException('Lỗi giải mã dữ liệu bảo mật.');
		}
	},
};
