package core

import (
	"strings"
	"testing"
)

func TestDockerInstallCommands(t *testing.T) {
	commands := dockerInstallCommands()

	if len(commands) == 0 {
		t.Fatal("expected docker install commands")
	}

	joinedCommands := make([]string, 0, len(commands))
	for _, cmd := range commands {
		joinedCommands = append(joinedCommands, strings.Join(cmd, " "))
	}

	joined := strings.Join(joinedCommands, "\n")

	if strings.Contains(joined, "apt-key") {
		t.Fatalf("expected docker install commands to avoid apt-key, got %q", joined)
	}

	if !strings.Contains(joined, "/etc/apt/keyrings/docker.gpg") {
		t.Fatalf("expected docker install commands to configure docker keyring, got %q", joined)
	}

	if !strings.Contains(joined, "signed-by=/etc/apt/keyrings/docker.gpg") {
		t.Fatalf("expected docker install commands to use signed-by repository config, got %q", joined)
	}
}
