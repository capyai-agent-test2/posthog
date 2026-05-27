package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func stubNodeTagExists(t *testing.T, fn func(string) bool) {
	t.Helper()

	original := nodeTagExists
	nodeTagExists = fn
	t.Cleanup(func() {
		nodeTagExists = original
	})
}

func TestNewEnvConfigDefaultsNodeTagToVersion(t *testing.T) {
	t.Setenv("POSTHOG_NODE_TAG", "")
	t.Setenv("REGISTRY_URL", "posthog/posthog")
	stubNodeTagExists(t, func(tag string) bool { return tag == "sha-test123" })

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
	t.Setenv("REGISTRY_URL", "posthog/posthog")
	stubNodeTagExists(t, func(tag string) bool { return false })

	config, err := NewEnvConfig("example.com", "sha-test123")
	if err != nil {
		t.Fatalf("NewEnvConfig returned error: %v", err)
	}

	if config.PosthogNodeTag != "pr-123" {
		t.Fatalf("expected explicit node tag to be preserved, got %q", config.PosthogNodeTag)
	}
}

func TestNewEnvConfigFallsBackToLatestWhenVersionTagMissing(t *testing.T) {
	t.Setenv("POSTHOG_NODE_TAG", "")
	t.Setenv("REGISTRY_URL", "posthog/posthog")
	stubNodeTagExists(t, func(tag string) bool { return false })

	config, err := NewEnvConfig("example.com", "sha-test123")
	if err != nil {
		t.Fatalf("NewEnvConfig returned error: %v", err)
	}

	if config.PosthogNodeTag != "latest" {
		t.Fatalf("expected missing version tag to fall back to latest, got %q", config.PosthogNodeTag)
	}
}

func TestNewEnvConfigSkipsDockerHubProbeForCustomRegistry(t *testing.T) {
	t.Setenv("POSTHOG_NODE_TAG", "")
	t.Setenv("REGISTRY_URL", "ghcr.io/example/posthog")
	stubNodeTagExists(t, func(tag string) bool {
		t.Fatalf("expected no Docker Hub probe for custom registry, got tag %q", tag)
		return false
	})

	config, err := NewEnvConfig("example.com", "sha-test123")
	if err != nil {
		t.Fatalf("NewEnvConfig returned error: %v", err)
	}

	if config.PosthogNodeTag != "latest" {
		t.Fatalf("expected custom registry without explicit node tag to fall back to latest, got %q", config.PosthogNodeTag)
	}
}

func TestUpdateEnvForUpgradeAddsMissingNodeTag(t *testing.T) {
	tempDir := t.TempDir()
	envPath := filepath.Join(tempDir, ".env")
	stubNodeTagExists(t, func(tag string) bool { return tag == "sha-new123" })
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

	envContents := "POSTHOG_SECRET=test\nDOMAIN=example.com\nREGISTRY_URL=posthog/posthog\nENCRYPTION_SALT_KEYS=0123456789abcdef0123456789abcdef\nPOSTHOG_APP_TAG=old-tag\n"
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

func TestUpdateEnvForUpgradeReplacesEmptyNodeTagWithoutDuplicates(t *testing.T) {
	tempDir := t.TempDir()
	envPath := filepath.Join(tempDir, ".env")
	stubNodeTagExists(t, func(tag string) bool { return false })
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

	envContents := "POSTHOG_SECRET=test\nDOMAIN=example.com\nREGISTRY_URL=posthog/posthog\nENCRYPTION_SALT_KEYS=0123456789abcdef0123456789abcdef\nPOSTHOG_APP_TAG=old-tag\nPOSTHOG_NODE_TAG=\n"
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

	if got := ReadEnvValue("POSTHOG_NODE_TAG"); got != "latest" {
		t.Fatalf("expected empty node tag to fall back to latest, got %q", got)
	}

	if count := strings.Count(string(updatedEnv), "POSTHOG_NODE_TAG="); count != 1 {
		t.Fatalf("expected exactly one node tag entry after backfill, got %d", count)
	}
}
