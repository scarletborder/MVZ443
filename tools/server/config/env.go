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
		// 创建 certs 目录
		if err := os.MkdirAll(certsDir, 0755); err != nil {
			return fmt.Errorf("failed to create certs directory: %w", err)
		}

		// 复制嵌入的证书文件到数据目录
		if err := utils.ExtractEmbeddedCerts(certsDir); err != nil {
			return fmt.Errorf("failed to extract certs: %w", err)
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
