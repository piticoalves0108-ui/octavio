//go:build windows

package main

import (
	"fmt"
	"syscall"
	"unsafe"
)

var (
	shell32       = syscall.NewLazyDLL("shell32.dll")
	user32        = syscall.NewLazyDLL("user32.dll")
	shellExecuteW = shell32.NewProc("ShellExecuteW")
	messageBoxW   = user32.NewProc("MessageBoxW")
)

// abrirNoNavegador abre o arquivo com o programa padrão para .html (o navegador),
// do mesmo jeito que um clique duplo no Explorer. Se não houver programa associado
// ao .html, tenta os navegadores mais comuns pelo nome.
func abrirNoNavegador(arquivo string) error {
	r := shellExecute(arquivo, "")
	if r > 32 {
		return nil
	}
	for _, navegador := range []string{"msedge.exe", "chrome.exe", "firefox.exe"} {
		if shellExecute(navegador, `"`+arquivo+`"`) > 32 {
			return nil
		}
	}
	return fmt.Errorf("o Windows não conseguiu abrir o navegador (código %d).\nAbra este arquivo manualmente:\n%s", r, arquivo)
}

// shellExecute devolve o código do ShellExecuteW: acima de 32 é sucesso.
func shellExecute(alvo, parametros string) uintptr {
	verbo, _ := syscall.UTF16PtrFromString("open")
	pAlvo, err := syscall.UTF16PtrFromString(alvo)
	if err != nil {
		return 0
	}
	var pParametros *uint16
	if parametros != "" {
		if pParametros, err = syscall.UTF16PtrFromString(parametros); err != nil {
			return 0
		}
	}
	const swShowNormal = 1
	r, _, _ := shellExecuteW.Call(0, uintptr(unsafe.Pointer(verbo)), uintptr(unsafe.Pointer(pAlvo)), uintptr(unsafe.Pointer(pParametros)), 0, swShowNormal)
	return r
}

// avisar mostra uma caixa de mensagem (o programa não tem janela de console).
func avisar(texto string) {
	titulo, _ := syscall.UTF16PtrFromString("Porango Pneus")
	msg, _ := syscall.UTF16PtrFromString(texto)
	const mbIconWarning = 0x30
	messageBoxW.Call(0, uintptr(unsafe.Pointer(msg)), uintptr(unsafe.Pointer(titulo)), mbIconWarning)
}
