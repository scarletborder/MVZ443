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

// 文件名映射：英文文件名 -> 中文文件名
var fileNameMapping = map[string]string{
	"online_turtorial.md":  "联机教程.md",
	"0.0.4bupdate.md":      "0.0.4b更新说明.md",
	"chapter1edx.md":       "第一章怪物情报.md",
	"save_system_guide.md": "存档系统指南.md",
}

type FileStat struct {
	Name    string    `json:"name"`
	File    string    `json:"file"`
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

		fileName := entry.Name()
		chineseName, exists := fileNameMapping[fileName]
		if !exists {
			// 如果没有映射，使用原文件名作为中文名
			chineseName = fileName
		}

		fileStats = append(fileStats, FileStat{
			Name:    chineseName,
			File:    fileName,
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
