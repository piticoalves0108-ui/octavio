//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

// Fora do Windows (usado para testar): abre com o programa padrão do sistema.
// Com PORANGO_SO_EXTRAIR=1, só mostra onde extraiu.
func abrirNoNavegador(arquivo string) error {
	if os.Getenv("PORANGO_SO_EXTRAIR") == "1" {
		fmt.Println(arquivo)
		return nil
	}
	programa := "xdg-open"
	if runtime.GOOS == "darwin" {
		programa = "open"
	}
	return exec.Command(programa, arquivo).Start()
}

func avisar(texto string) {
	fmt.Fprintln(os.Stderr, texto)
}
