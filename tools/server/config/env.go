package config

import (
	"fmt"
	"mvzserver/utils"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

// 环境变量键名常量
const (
	EnvPort         = "MVZ_PORT"
	EnvCerts        = "MVZ_CERTS"
	EnvAllowedHosts = "MVZ_ALLOWED_HOSTS"
)

const EnvTemplate = `# MVZ443 Server 环境配置文件

# 服务器端口
MVZ_PORT=28080

# 允许的域名列表（用逗号分隔）
MVZ_ALLOWED_HOSTS=scarletborder.cn

# 证书缓存目录（绝对路径）
MVZ_CERTS=/path/to/data/dir/certs

# 其他配置可以在这里添加`

// InitializeEnv 初始化环境配置
func InitializeEnv(appName string) error {
	// 获取应用数据目录
	dataDir, err := utils.GetApplicationDataDirectory(appName)
	if err != nil {
		return fmt.Errorf("failed to get data directory: %w", err)
	}

	envPath := filepath.Join(dataDir, ".env")
	certsDir := filepath.Join(dataDir, "certs")

	// 检查 .env 文件是否存在，如果不存在则创建
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		// 只有当 certs 目录不存在或为空时，才创建并提取嵌入的证书
		needExtractCerts := false
		if _, err := os.Stat(certsDir); os.IsNotExist(err) {
			// certs 目录不存在，需要创建并提取证书
			if err := os.MkdirAll(certsDir, 0755); err != nil {
				return fmt.Errorf("failed to create certs directory: %w", err)
			}
			needExtractCerts = true
		} else {
			// certs 目录存在，检查是否为空
			entries, err := os.ReadDir(certsDir)
			if err != nil {
				return fmt.Errorf("failed to read certs directory: %w", err)
			}
			if len(entries) == 0 {
				needExtractCerts = true
			}
		}

		// 只有在需要时才提取证书
		if needExtractCerts {
			if err := utils.ExtractEmbeddedCerts(certsDir); err != nil {
				return fmt.Errorf("failed to extract certs: %w", err)
			}
			fmt.Printf("已从嵌入文件提取证书到: %s\n", certsDir)
		} else {
			fmt.Printf("检测到已存在证书文件，跳过证书提取: %s\n", certsDir)
		}

		// 创建 .env 文件
		envContent := strings.ReplaceAll(EnvTemplate, "/path/to/data/dir/certs", certsDir)
		if err := os.WriteFile(envPath, []byte(envContent), 0644); err != nil {
			return fmt.Errorf("failed to create .env file: %w", err)
		}
	}

	// 加载 .env 文件到环境变量
	if err := godotenv.Load(envPath); err != nil {
		return fmt.Errorf("failed to load .env file: %w", err)
	}

	return nil
}

// GetEnvOrDefault 获取环境变量或返回默认值
func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetAllowedHosts 获取允许的域名列表
func GetAllowedHosts() []string {
	hosts := GetEnvOrDefault(EnvAllowedHosts, "scarletborder.cn")
	return strings.Split(hosts, ",")
}

// GetDataDirectory 获取数据目录路径
func GetDataDirectory(appName string) (string, error) {
	return utils.GetApplicationDataDirectory(appName)
}
