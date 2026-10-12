// _headers-equivalent serving for the Wails shell, mirroring
// native/electron/serve.mjs and the shared native/headers.json spec.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type headerSpec struct {
	Global map[string]string `json:"global"`
	Rules  []struct {
		Pattern     string            `json:"pattern"`
		Headers     map[string]string `json:"headers"`
		ContentType string            `json:"contentType"`
	} `json:"rules"`
}

var contentTypes = map[string]string{
	".html":        "text/html; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".mjs":         "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".json":        "application/json",
	".map":         "application/json",
	".svg":         "image/svg+xml",
	".png":         "image/png",
	".ico":         "image/x-icon",
	".txt":         "text/plain; charset=utf-8",
	".webmanifest": "application/manifest+json",
	".woff2":       "font/woff2",
}

// matchesPattern implements the same three pattern kinds as serve.mjs:
// "*.ext" suffix, "/dir/*" prefix, otherwise exact match.
func matchesPattern(path, pattern string) bool {
	if strings.HasPrefix(pattern, "*.") {
		return strings.HasSuffix(path, pattern[1:])
	}
	if strings.HasSuffix(pattern, "/*") {
		prefix := pattern[:len(pattern)-1]
		return path == prefix[:len(prefix)-1] || strings.HasPrefix(path, prefix)
	}
	return path == pattern
}

func headersFor(path string, spec *headerSpec) map[string]string {
	headers := map[string]string{}
	for k, v := range spec.Global {
		headers[k] = v
	}
	for _, rule := range spec.Rules {
		if len(rule.Headers) > 0 && matchesPattern(path, rule.Pattern) {
			for k, v := range rule.Headers {
				headers[k] = v
			}
		}
	}
	return headers
}

func contentTypeFor(path string, spec *headerSpec) string {
	for _, rule := range spec.Rules {
		if rule.ContentType != "" && matchesPattern(path, rule.Pattern) {
			return rule.ContentType
		}
	}
	if t, ok := contentTypes[strings.ToLower(filepath.Ext(path))]; ok {
		return t
	}
	return "application/octet-stream"
}

// resolveInside maps a request path to a file inside root, or "" when the
// path escapes the root.
func resolveInside(root, urlPath string) string {
	decoded, err := url.PathUnescape(urlPath)
	if err != nil {
		return ""
	}
	normalizedRoot := filepath.Clean(root)
	relative := strings.TrimLeft(filepath.Clean(decoded), "/\\")
	if relative == "." || strings.HasSuffix(decoded, "/") {
		relative = filepath.Join(relative, "index.html")
	}
	candidate := filepath.Join(normalizedRoot, relative)
	if candidate != normalizedRoot && !strings.HasPrefix(candidate, normalizedRoot+string(os.PathSeparator)) {
		return ""
	}
	return candidate
}

// loadSite finds public_html/ and native/headers.json. Search order:
// $BROWSER_FEATURES_ROOT, then the working directory, then the executable's
// directory — so `go run`, `wails3 dev` and a built binary run from the repo
// checkout all work.
func loadSite() (string, *headerSpec, error) {
	candidates := []string{}
	if env := os.Getenv("BROWSER_FEATURES_ROOT"); env != "" {
		candidates = append(candidates, env)
	}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, wd, filepath.Join(wd, "..", ".."))
	}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates, dir, filepath.Join(dir, "..", ".."))
	}

	var repoRoot string
	for _, base := range candidates {
		public := filepath.Join(base, "public_html")
		headersFile := filepath.Join(base, "native", "headers.json")
		if info, err := os.Stat(public); err == nil && info.IsDir() {
			if _, err := os.Stat(headersFile); err == nil {
				repoRoot = base
				break
			}
		}
	}
	if repoRoot == "" {
		return "", nil, fmt.Errorf(
			"public_html/ and native/headers.json not found; run from the repo checkout or set BROWSER_FEATURES_ROOT")
	}

	data, err := os.ReadFile(filepath.Join(repoRoot, "native", "headers.json"))
	if err != nil {
		return "", nil, err
	}
	var spec headerSpec
	if err := json.Unmarshal(data, &spec); err != nil {
		return "", nil, fmt.Errorf("native/headers.json: %w", err)
	}
	return filepath.Join(repoRoot, "public_html"), &spec, nil
}

// newSiteHandler serves root with the shared header spec. GET and HEAD only;
// directory requests fall back to index.html like serve.mjs.
func newSiteHandler(root string, spec *headerSpec) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		path := r.URL.Path
		filePath := resolveInside(root, path)
		if filePath == "" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		info, err := os.Stat(filePath)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		for name, value := range headersFor(path, spec) {
			w.Header().Set(name, value)
		}
		// Set Content-Type explicitly so the .wasm rule beats sniffing.
		w.Header().Set("Content-Type", contentTypeFor(filePath, spec))
		http.ServeFile(w, r, filePath)
	})
}
