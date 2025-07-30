package main

import (
	"flag"
	"log"
	"mvzserver/app"
)

func main() {
	// 定义命令行参数, -p 表示使用 cert 自动获取证书的模式
	useCert := flag.Bool("s", false, "启用通过 Let's Encrypt 自动管理证书")
	useSelfCert := flag.String("c", "", "启用自签名证书,例如 `/etc/letsencrypt/live/scarletborder.cn`")
	usePort := flag.Int("p", 28080, "指定监听端口")
	flag.Parse()

	appConfig := app.AppConfig{
		UseCert:     *useCert,
		UseSelfCert: *useSelfCert,
		UsePort:     *usePort,
	}

	app := app.NewApp(appConfig)
	if app == nil {
		log.Fatal("Failed to create app")
	}
	app.Run()
}
