package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
)

// 使用给定的密钥字符串加密数据
// 返回十六进制编码的加密字符串
func Encrypt(plaintext string, keyString string) (string, error) {
	// 1. 将密钥字符串哈希成32字节的AES-256密钥
	key := sha256.Sum256([]byte(keyString))

	// 2. 创建AES密码块
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	// 3. 创建GCM模式的AEAD
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// 4. 创建一个随机的Nonce
	// Nonce的长度对于GCM是固定的
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// 5. 加密数据
	// Seal函数会加密并认证plaintext，然后将nonce附加在结果前面
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// 6. 将结果编码为十六进制字符串，方便传输和存储
	return hex.EncodeToString(ciphertext), nil
}

// 使用给定的密钥字符串解密数据
// 输入为十六进制编码的加密字符串
func Decrypt(ciphertextHex string, keyString string) (string, error) {
	// 1. 将密钥字符串哈希成32字节的AES-256密钥 (必须和加密时完全一样)
	key := sha256.Sum256([]byte(keyString))

	// 将十六进制字符串解码回字节
	ciphertext, err := hex.DecodeString(ciphertextHex)
	if err != nil {
		return "", err
	}

	// 2. 创建AES密码块
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	// 3. 创建GCM模式的AEAD
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// 4. 从加密数据中分离Nonce和真正的密文
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, actualCiphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// 5. 解密数据
	// Open函数会验证并解密数据
	plaintext, err := gcm.Open(nil, nonce, actualCiphertext, nil)
	if err != nil {
		// 如果密钥错误或数据被篡改，这里会返回错误
		return "", err
	}

	return string(plaintext), nil
}
