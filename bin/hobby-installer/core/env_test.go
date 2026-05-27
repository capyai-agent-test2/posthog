package core

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewEnvConfigDefaultsNodeTagToVersion(t *testing.T) {
	t.Setenv("POSTHOG_NODE_TAG", "")

	config, err := NewEnvConfig("example.com", "sha-test123")
	if err != nil {
		t.Fatalf("NewEnvConfig returned error: %v", err)
	}

	if config.PosthogNodeTag != "sha-test123" {
		t.Fatalf("expected node tag to default to version, got %q", config.PosthogNodeTag)
	}
}

func TestNewEnvConfigRespectsExplicitNodeTag(t *testing.T) {
	t.Setenv("POSTHOG_NODE_TAG", "pr-123")

	config, err := NewEnvConfig("example.com", "sha-test123")
	if err != nil {
		t.Fatalf("NewEnvConfig returned error: %v", err)
	}

	if config.PosthogNodeTag != "pr-123" {
		t.Fatalf("expected explicit node tag to be preserved, got %q", config.PosthogNodeTag)
	}
}

func TestUpdateEnvForUpgradeAddsMissingNodeTag(t *testing.T) {
	tempDir := t.TempDir()
	envPath := filepath.Join(tempDir, ".env")
	originalWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd returned error: %v", err)
	}
	t.Cleanup(func() {
		if chdirErr := os.Chdir(originalWD); chdirErr != nil {
			t.Fatalf("failed to restore working directory: %v", chdirErr)
		}
	})

	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("Chdir returned error: %v", err)
	}

	envContents := "POSTHOG_SECRET=test\nDOMAIN=example.com\nENCRYPTION_SALT_KEYS=0123456789abcdef0123456789abcdef\nPOSTHOG_APP_TAG=old-tag\n"
	if err := os.WriteFile(envPath, []byte(envContents), 0600); err != nil {
		t.Fatalf("WriteFile returned error: %v", err)
	}

	if err := UpdateEnvForUpgrade("sha-new123"); err != nil {
		t.Fatalf("UpdateEnvForUpgrade returned error: %v", err)
	}

	updatedEnv, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatalf("ReadFile returned error: %v", err)
	}

	if string(updatedEnv) == envContents {
		t.Fatalf("expected .env to be updated")
	}

	if got := ReadEnvValue("POSTHOG_NODE_TAG"); got != "sha-new123" {
		t.Fatalf("expected missing node tag to be backfilled from version, got %q", got)
	}
}
