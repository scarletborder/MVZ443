package main

import (
	"embed"
)

//go:embed certs/*
var CertsFS embed.FS
