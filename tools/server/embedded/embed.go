package embedded

import (
	"embed"
)

//go:embed ../certs/*
var CertsFS embed.FS
