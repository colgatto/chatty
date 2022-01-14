const fs = require('fs');
const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
const KEY = fs.readFileSync(__dirname + '/.keys/data.key').toString();

const keyMaker = () => Buffer.from(crypto.createHash('sha256').update('c1t' + KEY + 'ch4tty').digest('hex'), 'hex');

const encrypt = (text) => {
	const iv = crypto.randomBytes(16);
	let cipher = crypto.createCipheriv(ALGO, keyMaker(), iv);
	let encrypted = cipher.update(Buffer.from(text).toString('base64'));
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return encrypted.toString('hex') + ':' + iv.toString('hex');
}

const decrypt = (text) => {
	let t = text.split(':');
	let iv = Buffer.from(t[1], 'hex');
	let encryptedText = Buffer.from(t[0], 'hex');
	let decipher = crypto.createDecipheriv(ALGO, keyMaker(), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	let dd = Buffer.from(decrypted.toString(), 'base64').toString('ascii');
	return dd;
}

module.exports = {
	encrypt,
	decrypt
}