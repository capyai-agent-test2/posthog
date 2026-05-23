package core

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/andybalholm/brotli"
)

func setupGeoIPTestPaths(t *testing.T) func() {
	t.Helper()

	origURL := geoIPURL
	origShareDir := shareDir
	origMMDBFile := mmdbFile
	origJSONFile := jsonFile

	tmpDir := t.TempDir()
	shareDir = filepath.Join(tmpDir, "share")
	mmdbFile = filepath.Join(shareDir, "GeoLite2-City.mmdb")
	jsonFile = filepath.Join(shareDir, "GeoLite2-City.json")

	return func() {
		geoIPURL = origURL
		shareDir = origShareDir
		mmdbFile = origMMDBFile
		jsonFile = origJSONFile
	}
}

func TestDownloadGeoIP(t *testing.T) {
	t.Run("downloads and decompresses database without system brotli", func(t *testing.T) {
		cleanup := setupGeoIPTestPaths(t)
		defer cleanup()

		var compressed bytes.Buffer
		writer := brotli.NewWriter(&compressed)
		if _, err := writer.Write([]byte("mmdb test payload")); err != nil {
			t.Fatalf("failed to write compressed payload: %v", err)
		}
		if err := writer.Close(); err != nil {
			t.Fatalf("failed to close compressed payload: %v", err)
		}

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write(compressed.Bytes())
		}))
		defer server.Close()

		geoIPURL = server.URL

		if err := DownloadGeoIP(); err != nil {
			t.Fatalf("expected download to succeed, got: %v", err)
		}

		gotMMDB, err := os.ReadFile(mmdbFile)
		if err != nil {
			t.Fatalf("failed to read downloaded mmdb: %v", err)
		}
		if string(gotMMDB) != "mmdb test payload" {
			t.Fatalf("expected decompressed payload, got %q", string(gotMMDB))
		}

		gotJSON, err := os.ReadFile(jsonFile)
		if err != nil {
			t.Fatalf("failed to read GeoIP metadata: %v", err)
		}
		if !strings.Contains(string(gotJSON), `"date": "`) {
			t.Fatalf("expected metadata file with date, got %q", string(gotJSON))
		}
	})

	t.Run("removes partial file when decompression fails", func(t *testing.T) {
		cleanup := setupGeoIPTestPaths(t)
		defer cleanup()

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte("not brotli"))
		}))
		defer server.Close()

		geoIPURL = server.URL

		err := DownloadGeoIP()
		if err == nil {
			t.Fatal("expected decompression error")
		}
		if !strings.Contains(err.Error(), "failed to decompress GeoIP database") {
			t.Fatalf("expected decompression error, got: %v", err)
		}
		if FileExists(mmdbFile) {
			t.Fatalf("expected partial mmdb file to be removed")
		}
	})
}
