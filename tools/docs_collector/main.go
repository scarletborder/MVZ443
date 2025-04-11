package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"
)

type FileStat struct {
	Name    string    `json:"name"`
	ModTime time.Time `json:"mod_time"`
}

func main() {
	var targetDir string

	// 处理命令行参数
	if len(os.Args) > 1 {
		targetDir = os.Args[1]
	} else {
		// 获取可执行文件路径并计算默认目录
		exePath, err := os.Executable()
		if err != nil {
			log.Fatal("无法获取可执行文件路径:", err)
		}
		exeDir := filepath.Dir(exePath)
		baseDir := filepath.Dir(filepath.Dir(exeDir)) // 上两级目录
		targetDir = filepath.Join(baseDir, "public", "docs")
	}

	// 验证目标目录存在
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		log.Fatalf("目标目录不存在: %s", targetDir)
	}

	// 读取并处理目录中的文件
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		log.Fatal("目录读取失败:", err)
	}

	var fileStats []FileStat
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".md" {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			log.Printf("跳过文件 %s: 无法获取文件信息 - %v", entry.Name(), err)
			continue
		}

		fileStats = append(fileStats, FileStat{
			Name:    entry.Name(),
			ModTime: info.ModTime().UTC(),
		})
	}

	// 按照ModTime从最晚到最早排序
	sort.Slice(fileStats, func(i, j int) bool {
		return fileStats[i].ModTime.After(fileStats[j].ModTime)
	})

	// 生成JSON数据
	jsonData, err := json.MarshalIndent(fileStats, "", "  ")
	if err != nil {
		log.Fatal("JSON编码失败:", err)
	}

	// 写入输出文件
	outputPath := filepath.Join(targetDir, "stat.json")
	if err := os.WriteFile(outputPath, jsonData, 0644); err != nil {
		log.Fatal("文件写入失败:", err)
	}

	// 输出结果
	fmt.Printf("成功处理 %d 个Markdown文件\n统计信息已保存至: %s\n", len(fileStats), outputPath)
}
