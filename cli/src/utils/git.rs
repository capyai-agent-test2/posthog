use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_name: Option<String>,
    pub branch: String,
    pub commit_id: String,
}

#[derive(Debug, Clone)]
struct GitPaths {
    git_dir: PathBuf,
    common_git_dir: PathBuf,
}

pub fn get_git_info(dir: Option<PathBuf>) -> Result<Option<GitInfo>> {
    if let Some(info) = get_git_info_from_github() {
        return Ok(Some(info));
    }

    if let Some(info) = get_git_info_from_vercel() {
        return Ok(Some(info));
    }

    let git_paths = match find_git_paths(dir) {
        Some(paths) => paths,
        None => return Ok(None),
    };

    let remote_url = get_remote_url_from_paths(&git_paths);
    let repo_name = get_repo_name_from_paths(&git_paths);
    let branch =
        get_branch_name(&git_paths.git_dir).context("Failed to determine current branch")?;
    let commit = get_commit_sha(&git_paths, &branch).context("Failed to determine commit sha")?;

    Ok(Some(GitInfo {
        remote_url,
        repo_name,
        branch,
        commit_id: commit,
    }))
}

fn get_git_info_from_github() -> Option<GitInfo> {
    get_env_variable("GITHUB_ACTIONS")?;

    let branch = get_env_variable("GITHUB_REF_NAME")?;
    let commit_id = get_env_variable("GITHUB_SHA")?;
    let repository = get_env_variable("GITHUB_REPOSITORY")?;
    let server_url = get_env_variable("GITHUB_SERVER_URL")?;

    let repo_name = repository.split('/').next_back().map(|s| s.to_string());
    let remote_url = Some(format!("{server_url}/{repository}.git"));

    Some(GitInfo {
        remote_url,
        repo_name,
        branch,
        commit_id,
    })
}

fn get_git_info_from_vercel() -> Option<GitInfo> {
    get_env_variable("VERCEL")?;

    let branch = get_env_variable("VERCEL_GIT_COMMIT_REF")?;
    let commit_id = get_env_variable("VERCEL_GIT_COMMIT_SHA")?;
    let repo_slug = get_env_variable("VERCEL_GIT_REPO_SLUG")?;

    let remote_url = build_vercel_remote_url(&repo_slug);

    Some(GitInfo {
        remote_url,
        repo_name: Some(repo_slug),
        branch,
        commit_id,
    })
}

fn build_vercel_remote_url(repo_slug: &String) -> Option<String> {
    let provider = get_env_variable("VERCEL_GIT_PROVIDER")?;
    let owner = get_env_variable("VERCEL_GIT_REPO_OWNER")?;

    let base_url = match provider.as_str() {
        "github" => "https://github.com",
        "gitlab" => "https://gitlab.com",
        "bitbucket" => "https://bitbucket.org",
        _ => return None,
    };

    Some(format!("{base_url}/{owner}/{repo_slug}.git"))
}

fn find_git_paths(dir: Option<PathBuf>) -> Option<GitPaths> {
    let mut current_dir = dir.unwrap_or(std::env::current_dir().ok()?);

    loop {
        let git_dir = current_dir.join(".git");
        if git_dir.is_dir() {
            return Some(GitPaths {
                git_dir: git_dir.clone(),
                common_git_dir: git_dir,
            });
        }

        if git_dir.is_file() {
            let resolved_git_dir = resolve_git_file(&git_dir)?;
            let common_git_dir = get_common_git_dir(&resolved_git_dir);

            return Some(GitPaths {
                git_dir: resolved_git_dir,
                common_git_dir,
            });
        }

        if !current_dir.pop() {
            return None;
        }
    }
}

fn resolve_git_file(git_file: &Path) -> Option<PathBuf> {
    let content = fs::read_to_string(git_file).ok()?;
    let git_dir = content.trim().strip_prefix("gitdir: ")?.trim();
    let git_dir_path = Path::new(git_dir);

    if git_dir_path.is_absolute() {
        Some(git_dir_path.to_path_buf())
    } else {
        Some(git_file.parent()?.join(git_dir_path))
    }
}

fn get_common_git_dir(git_dir: &Path) -> PathBuf {
    let Ok(common_dir) = fs::read_to_string(git_dir.join("commondir")) else {
        return git_dir.to_path_buf();
    };

    let common_dir = common_dir.trim();
    let common_dir_path = Path::new(common_dir);

    if common_dir_path.is_absolute() {
        common_dir_path.to_path_buf()
    } else {
        git_dir.join(common_dir_path)
    }
}

pub fn get_remote_url(git_dir: &Path) -> Option<String> {
    get_remote_url_from_paths(&GitPaths {
        git_dir: git_dir.to_path_buf(),
        common_git_dir: git_dir.to_path_buf(),
    })
}

fn get_remote_url_from_paths(git_paths: &GitPaths) -> Option<String> {
    for config_path in git_config_paths(git_paths) {
        let config_content = match fs::read_to_string(config_path) {
            Ok(content) => content,
            Err(_) => continue,
        };

        for line in config_content.lines() {
            let line = line.trim();
            if line.starts_with("url = ") {
                let url = line.trim_start_matches("url = ").trim();
                let normalized = if url.ends_with(".git") {
                    url.to_string()
                } else {
                    format!("{url}.git")
                };
                return Some(normalized);
            }
        }
    }

    None
}

pub fn get_repo_name(git_dir: &Path) -> Option<String> {
    get_repo_name_from_paths(&GitPaths {
        git_dir: git_dir.to_path_buf(),
        common_git_dir: git_dir.to_path_buf(),
    })
}

fn get_repo_name_from_paths(git_paths: &GitPaths) -> Option<String> {
    for config_path in git_config_paths(git_paths) {
        let config_content = match fs::read_to_string(config_path) {
            Ok(content) => content,
            Err(_) => continue,
        };

        for line in config_content.lines() {
            let line = line.trim();
            if line.starts_with("url = ") {
                let url = line.trim_start_matches("url = ");
                if let Some(repo_name) = url.split('/').next_back() {
                    let clean_name = repo_name.trim_end_matches(".git");
                    return Some(clean_name.to_string());
                }
            }
        }
    }

    if let Some(parent) = git_paths.common_git_dir.parent() {
        if let Some(name) = parent.file_name() {
            return Some(name.to_string_lossy().to_string());
        }
    }

    None
}

fn git_config_paths(git_paths: &GitPaths) -> [PathBuf; 3] {
    [
        git_paths.git_dir.join("config"),
        git_paths.git_dir.join("config.worktree"),
        git_paths.common_git_dir.join("config"),
    ]
}

fn get_branch_name(git_dir: &Path) -> Result<String> {
    // First try to read from HEAD file
    let head_path = git_dir.join("HEAD");
    let mut head_content = String::new();
    fs::File::open(&head_path)
        .with_context(|| format!("Failed to open HEAD file at {head_path:?}"))?
        .read_to_string(&mut head_content)
        .context("Failed to read HEAD file")?;

    // Parse HEAD content
    if head_content.starts_with("ref: refs/heads/") {
        Ok(head_content
            .trim_start_matches("ref: refs/heads/")
            .trim()
            .to_string())
    } else if head_content.trim().len() == 40 || head_content.trim().len() == 64 {
        Ok("HEAD-detached".to_string())
    } else {
        anyhow::bail!("Unrecognized HEAD format")
    }
}

fn get_commit_sha(git_paths: &GitPaths, branch: &str) -> Result<String> {
    if branch == "HEAD-detached" {
        // For detached HEAD, read directly from HEAD
        let head_path = git_paths.git_dir.join("HEAD");
        let mut head_content = String::new();
        fs::File::open(&head_path)
            .with_context(|| format!("Failed to open HEAD file at {head_path:?}"))?
            .read_to_string(&mut head_content)
            .context("Failed to read HEAD file")?;

        return Ok(head_content.trim().to_string());
    }

    for ref_path in [
        git_paths.git_dir.join("refs/heads").join(branch),
        git_paths.common_git_dir.join("refs/heads").join(branch),
    ] {
        if ref_path.exists() {
            let mut commit_id = String::new();
            fs::File::open(&ref_path)
                .with_context(|| format!("Failed to open branch reference at {ref_path:?}"))?
                .read_to_string(&mut commit_id)
                .context("Failed to read branch reference file")?;

            return Ok(commit_id.trim().to_string());
        }
    }

    anyhow::bail!("Could not determine commit ID")
}

fn get_env_variable(name: &str) -> Option<String> {
    let env_variable = std::env::var(name).ok()?.trim().to_string();
    match env_variable.as_ref() {
        "" => None,
        _ => Some(env_variable),
    }
}

#[cfg(test)]
mod tests {
    use super::get_git_info;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn get_git_info_supports_worktrees() {
        let temp_dir = tempdir().expect("tempdir");
        let repo_root = temp_dir.path().join("repo");
        let worktree_root = temp_dir.path().join("repo-worktree");
        let common_git_dir = repo_root.join(".git");
        let worktree_git_dir = common_git_dir.join("worktrees/feature");
        let branch_name = "feature-branch";
        let commit_sha = "1234567890abcdef1234567890abcdef12345678";

        fs::create_dir_all(common_git_dir.join("refs/heads")).expect("create common git refs");
        fs::create_dir_all(&worktree_git_dir).expect("create worktree git dir");
        fs::create_dir_all(&worktree_root).expect("create worktree root");

        fs::write(
            worktree_root.join(".git"),
            format!("gitdir: {}\n", worktree_git_dir.display()),
        )
        .expect("write worktree git file");
        fs::write(
            worktree_git_dir.join("HEAD"),
            format!("ref: refs/heads/{branch_name}\n"),
        )
        .expect("write worktree head");
        fs::write(worktree_git_dir.join("commondir"), "../..\n").expect("write commondir");
        fs::write(
            common_git_dir.join("config"),
            "[remote \"origin\"]\n    url = git@github.com:PostHog/posthog.git\n",
        )
        .expect("write config");
        fs::write(
            common_git_dir.join("refs/heads").join(branch_name),
            commit_sha,
        )
        .expect("write branch ref");

        let git_info = get_git_info(Some(worktree_root)).expect("get git info");
        let git_info = git_info.expect("git info should exist");

        assert_eq!(
            git_info.remote_url.as_deref(),
            Some("git@github.com:PostHog/posthog.git")
        );
        assert_eq!(git_info.repo_name.as_deref(), Some("posthog"));
        assert_eq!(git_info.branch, branch_name);
        assert_eq!(git_info.commit_id, commit_sha);
    }
}
