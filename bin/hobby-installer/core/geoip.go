package core

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/andybalholm/brotli"
)

var (
	geoIPURL = "https://mmdbcdn.posthog.net/"
	shareDir = "./share"
	mmdbFile = "./share/GeoLite2-City.mmdb"
	jsonFile = "./share/GeoLite2-City.json"
)

func DownloadGeoIP() error {
	logger := GetLogger()
	logger.Debug("DownloadGeoIP: shareDir=%s, mmdbFile=%s", shareDir, mmdbFile)

	if err := os.MkdirAll(shareDir, 0755); err != nil {
		logger.Debug("Failed to create share directory: %v", err)
		return fmt.Errorf("failed to create share directory: %w", err)
	}

	if FileExists(mmdbFile) {
		logger.Debug("GeoIP database already exists at %s", mmdbFile)
		logger.WriteString("GeoIP database already exists\n")
		return nil
	}

	logger.WriteString("Downloading GeoIP database...\n")
	logger.Debug("Downloading from %s", geoIPURL)
	resp, err := http.Get(geoIPURL)
	if err != nil {
		logger.Debug("GeoIP download failed: %v", err)
		return fmt.Errorf("failed to download GeoIP database: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		logger.Debug("GeoIP download returned HTTP %d", resp.StatusCode)
		return fmt.Errorf("failed to download GeoIP database: unexpected HTTP %d", resp.StatusCode)
	}

	output, err := os.Create(mmdbFile)
	if err != nil {
		logger.Debug("Failed to create GeoIP database file: %v", err)
		return fmt.Errorf("failed to create GeoIP database file: %w", err)
	}

	if _, err := io.Copy(output, brotli.NewReader(resp.Body)); err != nil {
		_ = output.Close()
		_ = os.Remove(mmdbFile)
		logger.Debug("GeoIP decompression failed: %v", err)
		return fmt.Errorf("failed to decompress GeoIP database: %w", err)
	}
	if err := output.Close(); err != nil {
		logger.Debug("Failed to close GeoIP database file: %v", err)
		return fmt.Errorf("failed to close GeoIP database file: %w", err)
	}
	logger.WriteString("GeoIP database downloaded\n")

	jsonContent := fmt.Sprintf(`{"date": "%s"}`, time.Now().Format("2006-01-02"))
	if err := os.WriteFile(jsonFile, []byte(jsonContent), 0644); err != nil {
		logger.Debug("Failed to write GeoIP metadata: %v", err)
		return fmt.Errorf("failed to write GeoIP metadata: %w", err)
	}

	if err := os.Chmod(mmdbFile, 0644); err != nil {
		return fmt.Errorf("failed to set permissions on GeoIP database: %w", err)
	}
	if err := os.Chmod(jsonFile, 0644); err != nil {
		return fmt.Errorf("failed to set permissions on GeoIP metadata: %w", err)
	}

	return nil
}

func GeoIPExists() bool {
	return FileExists(mmdbFile)
}
