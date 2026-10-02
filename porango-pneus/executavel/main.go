// Executável da edição HTML do site da Porango Pneus.
//
// O site inteiro (a pasta html/) vai embutido no programa. Ao abrir:
//  1. extrai os arquivos para a pasta do usuário (só na primeira vez de cada versão);
//  2. abre o index.html no navegador padrão;
//  3. fecha. Não instala nada, não abre porta de rede, não precisa de internet.
//
// Gerado por `npm run exe` (scripts/executavel.mjs), que copia html/ para site/.
package main

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

//go:embed all:site
var site embed.FS

func main() {
	if err := executar(); err != nil {
		avisar("Não foi possível abrir o site da Porango Pneus.\n\n" + err.Error())
		os.Exit(1)
	}
}

func executar() error {
	versao, err := versaoDoSite()
	if err != nil {
		return err
	}
	base, err := os.UserCacheDir() // Windows: %LOCALAPPDATA%
	if err != nil {
		base = os.TempDir()
	}
	raiz := filepath.Join(base, "PorangoPneus")
	pasta := filepath.Join(raiz, versao)

	if _, err := os.Stat(filepath.Join(pasta, "index.html")); err != nil {
		if err := os.MkdirAll(raiz, 0o755); err != nil {
			return err
		}
		// extrai numa pasta provisória e só depois renomeia: nunca fica pela metade
		temp, err := os.MkdirTemp(raiz, "extraindo-")
		if err != nil {
			return err
		}
		if err := extrair(temp); err != nil {
			os.RemoveAll(temp)
			return err
		}
		if err := os.Rename(temp, pasta); err != nil {
			os.RemoveAll(temp)
			if _, errStat := os.Stat(filepath.Join(pasta, "index.html")); errStat != nil {
				return err
			}
		}
	}
	limparVersoesAntigas(raiz, versao)
	return abrirNoNavegador(filepath.Join(pasta, "index.html"))
}

// versaoDoSite identifica o conteúdo embutido (nomes + bytes), para que uma versão
// nova do executável nunca reaproveite arquivos de uma antiga.
func versaoDoSite() (string, error) {
	var nomes []string
	err := fs.WalkDir(site, "site", func(p string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			nomes = append(nomes, p)
		}
		return err
	})
	if err != nil {
		return "", err
	}
	if len(nomes) == 0 {
		return "", errors.New("o executável foi gerado sem os arquivos do site")
	}
	sort.Strings(nomes)
	h := sha256.New()
	for _, n := range nomes {
		io.WriteString(h, n+"\x00")
		f, err := site.Open(n)
		if err != nil {
			return "", err
		}
		_, err = io.Copy(h, f)
		f.Close()
		if err != nil {
			return "", err
		}
	}
	return "site-" + hex.EncodeToString(h.Sum(nil))[:12], nil
}

func extrair(destino string) error {
	return fs.WalkDir(site, "site", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel("site", filepath.FromSlash(p))
		alvo := filepath.Join(destino, rel)
		if d.IsDir() {
			return os.MkdirAll(alvo, 0o755)
		}
		origem, err := site.Open(path.Clean(p))
		if err != nil {
			return err
		}
		defer origem.Close()
		saida, err := os.Create(alvo)
		if err != nil {
			return err
		}
		if _, err := io.Copy(saida, origem); err != nil {
			saida.Close()
			return err
		}
		return saida.Close()
	})
}

// limparVersoesAntigas apaga o que sobrou de versões anteriores (se algo estiver
// em uso, fica para a próxima vez). Extrações em andamento (clique duplo) ficam.
func limparVersoesAntigas(raiz, atual string) {
	itens, err := os.ReadDir(raiz)
	if err != nil {
		return
	}
	for _, it := range itens {
		nome := it.Name()
		if !it.IsDir() || nome == atual {
			continue
		}
		velha := strings.HasPrefix(nome, "site-")
		if strings.HasPrefix(nome, "extraindo-") {
			if info, err := it.Info(); err == nil && time.Since(info.ModTime()) > time.Hour {
				velha = true
			}
		}
		if velha {
			os.RemoveAll(filepath.Join(raiz, nome))
		}
	}
}
