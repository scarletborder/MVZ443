package main

import (
	"embed"
	"flag"
	"fmt"
	"log"
	"mvzserver/app"
	"mvzserver/config"
	"mvzserver/constants"
	"mvzserver/utils"
	"os"
	"path/filepath"
	"strconv"
)

func init() {
	// 设置GetCertsFS函数以返回嵌入的证书文件系统
	utils.GetCertsFS = func() embed.FS {
		return CertsFS
	}
}

func main() {
	// 定义命令行参数
	useCert := flag.Bool("s", false, "启用通过 Let's Encrypt 自动管理证书")
	useSelfCert := flag.String("c", "", "启用自签名证书,例如 `/etc/letsencrypt/live/scarletborder.cn`")
	usePort := flag.Int("p", 28080, "指定监听端口")
	showVersion := flag.Bool("v", false, "显示版本信息和数据目录")
	newLocalCerts := flag.Bool("new-local-certs", false, "生成新的本地自签名证书并替换数据目录中的现有证书")
	flag.Parse()

	// 如果请求生成新的本地证书
	if *newLocalCerts {
		dataDir, err := config.GetDataDirectory(constants.AppName)
		if err != nil {
			log.Fatalf("Failed to get data directory: %v", err)
		}
		
		certsDir := filepath.Join(dataDir, "certs")
		fmt.Printf("正在生成新的本地证书到: %s\n", certsDir)
		
		if err := utils.GenerateNewCerts(certsDir); err != nil {
			log.Fatalf("Failed to generate new certificates: %v", err)
		}
		
		fmt.Println("新证书生成完成！")
		os.Exit(0)
	}

	// 如果请求显示版本信息
	if *showVersion {
		dataDir, err := config.GetDataDirectory(constants.AppName)
		if err != nil {
			log.Fatalf("Failed to get data directory: %v", err)
		}
		fmt.Printf("%s v%s\n", constants.AppName, constants.Version)
		fmt.Printf("Data Directory: %s\n", dataDir)
		os.Exit(0)
	}

	// 初始化环境配置
	if err := config.InitializeEnv(constants.AppName); err != nil {
		log.Fatalf("Failed to initialize environment: %v", err)
	}

	// 从环境变量获取配置，但命令行参数优先级更高
	var finalPort int
	defaultPort := 28080 // 默认端口
	
	// 如果命令行参数不是默认值，则使用命令行参数
	if *usePort != defaultPort {
		finalPort = *usePort
	} else if envPort := os.Getenv(config.EnvPort); envPort != "" {
		// 命令行参数是默认值时，尝试使用环境变量
		if port, err := strconv.Atoi(envPort); err == nil {
			finalPort = port
		} else {
			finalPort = defaultPort
		}
	} else {
		// 都没有设置时使用默认值
		finalPort = defaultPort
	}

	appConfig := app.AppConfig{
		UseCert:     *useCert,
		UseSelfCert: *useSelfCert,
		UsePort:     finalPort,
	}

	app := app.NewApp(appConfig)
	if app == nil {
		log.Fatal("Failed to create app")
	}
	app.Run()
}
