package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"embed"
	"encoding/pem"
	"fmt"
	"io/fs"
	"math/big"
	"mvzserver/constants"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/adrg/xdg"
)

// 获取本机上本软件的目录
const AppName = constants.AppName

// GetApplicationDataDirectory 获取应用程序数据目录的路径
// 这通常是存放用户特定数据（如数据库、配置、缓存等）的最佳位置。
// 它会自动适配 Windows, macOS, Linux。
func GetApplicationDataDirectory(appName string) (string, error) {
	// 修正：xdg.DataHome 是一个字符串变量，直接引用即可，不需要加 ()
	baseDir := xdg.DataHome

	// appDataDir 会是例如：
	// Windows: C:\Users\<username>\AppData\Local\MyAwesomeWailsApp
	// macOS: /Users/<username>/Library/Application Support/MyAwesomeWailsApp
	// Linux: ~/.local/share/MyAwesomeWailsApp
	appDataDir := filepath.Join(baseDir, appName)

	// 确保目录存在，如果不存在则创建
	// 0755 表示 rwx for owner, rx for group, rx for others
	// 或者 0700 (rwx for owner, no permissions for others) 如果数据非常私密
	if err := os.MkdirAll(appDataDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create application data directory %q: %w", appDataDir, err)
	}

	return appDataDir, nil
}

// ExtractEmbeddedCerts 提取嵌入的证书文件到指定目录
func ExtractEmbeddedCerts(targetDir string) error {
	return ExtractEmbeddedCertsFromFS(GetCertsFS(), targetDir)
}

// ExtractEmbeddedCertsFromFS 从指定的embed.FS提取证书文件到指定目录
func ExtractEmbeddedCertsFromFS(certsFS embed.FS, targetDir string) error {
	return fs.WalkDir(certsFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		// 读取嵌入的文件内容
		data, err := certsFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read embedded file %s: %w", path, err)
		}

		// 构造目标文件路径（去掉certs/前缀）
		targetPath := filepath.Join(targetDir, filepath.Base(path))

		// 写入文件
		if err := os.WriteFile(targetPath, data, 0644); err != nil {
			return fmt.Errorf("failed to write file %s: %w", targetPath, err)
		}

		return nil
	})
}

// GetCertsFS 获取证书文件系统的弱引用
// 这个函数需要在main包中被重写以返回实际的CertsFS
var GetCertsFS = func() embed.FS {
	panic("GetCertsFS not implemented - should be set in main package")
}

// GenerateNewCerts 生成新的自签名证书并保存到指定目录
func GenerateNewCerts(targetDir string) error {
	// 确保目标目录存在
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	// 生成私钥
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %w", err)
	}

	// 创建证书模板
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization:  []string{"MVZ443 Server"},
			Country:       []string{"CN"},
			Province:      []string{""},
			Locality:      []string{""},
			StreetAddress: []string{""},
			PostalCode:    []string{""},
		},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(365 * 24 * time.Hour), // 1年有效期
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.IPv4(127, 0, 0, 1), net.IPv6loopback},
		DNSNames:     []string{"localhost", "*.localhost"},
	}

	// 创建证书
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %w", err)
	}

	// 保存证书文件 (ssl.cert)
	certPath := filepath.Join(targetDir, "ssl.cert")
	certOut, err := os.Create(certPath)
	if err != nil {
		return fmt.Errorf("failed to create cert file: %w", err)
	}
	defer certOut.Close()

	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: certDER}); err != nil {
		return fmt.Errorf("failed to write certificate: %w", err)
	}

	// 保存私钥文件 (ssl.key)
	keyPath := filepath.Join(targetDir, "ssl.key")
	keyOut, err := os.Create(keyPath)
	if err != nil {
		return fmt.Errorf("failed to create key file: %w", err)
	}
	defer keyOut.Close()

	privateKeyDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %w", err)
	}

	if err := pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: privateKeyDER}); err != nil {
		return fmt.Errorf("failed to write private key: %w", err)
	}

	fmt.Printf("新证书已生成并保存到: %s\n", targetDir)
	fmt.Printf("证书文件: %s\n", certPath)
	fmt.Printf("私钥文件: %s\n", keyPath)
	fmt.Printf("证书有效期: %s 到 %s\n", template.NotBefore.Format("2006-01-02"), template.NotAfter.Format("2006-01-02"))

	return nil
}
