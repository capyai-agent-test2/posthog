use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Component, Path, PathBuf},
};

use anyhow::Result;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use regex::{Captures, Regex};
use sha2::{Digest, Sha256, Sha384, Sha512};
use tracing::{debug, info};
use walkdir::WalkDir;

use crate::utils::files::SourceFile;

fn tag_regex() -> Regex {
    Regex::new(r"(?is)<(?P<tag>[a-z][a-z0-9:-]*)\b(?P<attrs>[^>]*)>").expect("valid tag regex")
}

fn attr_regex() -> Regex {
    Regex::new(
        r#"(?is)\b(?P<name>[a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:(?P<quote>["'])(?P<quoted>[^"']*)(?:["'])|(?P<bare>[^\s>]+))"#,
    )
        .expect("valid attr regex")
}

fn integrity_regex() -> Regex {
    Regex::new(
        r#"(?is)(?P<prefix>\s)integrity\s*=\s*(?:(?P<quote>["'])(?P<quoted>[^"']*)(?:["'])|(?P<bare>[^\s>]+))"#,
    )
        .expect("valid integrity regex")
}

fn hash_for_algorithm(algorithm: &str, bytes: &[u8]) -> Option<String> {
    let digest = match algorithm {
        "sha256" => Sha256::digest(bytes).to_vec(),
        "sha384" => Sha384::digest(bytes).to_vec(),
        "sha512" => Sha512::digest(bytes).to_vec(),
        _ => return None,
    };
    Some(format!("{algorithm}-{}", STANDARD.encode(digest)))
}

fn recompute_integrity(existing: &str, bytes: &[u8]) -> Option<String> {
    let mut updated = Vec::new();
    let mut changed = false;

    for token in existing.split_whitespace() {
        let Some((algorithm, _)) = token.split_once('-') else {
            updated.push(token.to_string());
            continue;
        };
        let Some(new_token) = hash_for_algorithm(algorithm, bytes) else {
            updated.push(token.to_string());
            continue;
        };
        changed = changed || new_token != token;
        updated.push(new_token);
    }

    changed.then(|| updated.join(" "))
}

fn is_local_asset_url(url: &str) -> bool {
    !url.is_empty()
        && !url.starts_with("http://")
        && !url.starts_with("https://")
        && !url.starts_with("//")
        && !url.starts_with("data:")
}

fn normalize_url_path(url: &str) -> &str {
    url.split(['?', '#']).next().unwrap_or(url)
}

fn normalized_public_path_prefix(public_path_prefix: Option<&str>) -> Option<String> {
    public_path_prefix
        .map(|prefix| prefix.trim_matches('/'))
        .filter(|prefix| !prefix.is_empty())
        .map(ToString::to_string)
}

fn candidate_asset_urls(
    asset_path: &Path,
    root: &Path,
    public_path_prefix: Option<&str>,
) -> BTreeSet<String> {
    let mut candidates = BTreeSet::new();

    let base = if root.is_dir() {
        root
    } else {
        root.parent().unwrap_or(root)
    };
    if let Ok(relative) = asset_path.strip_prefix(base) {
        let relative = relative.to_string_lossy().replace('\\', "/");
        candidates.insert(relative.clone());
        candidates.insert(format!("/{relative}"));
        if let Some(prefix) = normalized_public_path_prefix(public_path_prefix) {
            candidates.insert(format!("{prefix}/{relative}"));
            candidates.insert(format!("/{prefix}/{relative}"));
        }
    }

    candidates
}

fn root_base(root: &Path) -> &Path {
    if root.is_dir() {
        root
    } else {
        root.parent().unwrap_or(root)
    }
}

fn normalize_relative_path(path: &Path) -> Option<String> {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() {
                    return None;
                }
            }
            Component::RootDir => {}
            Component::Prefix(_) => return None,
        }
    }

    Some(normalized.to_string_lossy().replace('\\', "/"))
}

fn resolve_asset_key(asset_url: &str, html_path: &Path, root: &Path) -> Option<String> {
    let normalized_url = normalize_url_path(asset_url);
    if normalized_url.starts_with('/') {
        return normalize_relative_path(Path::new(normalized_url.trim_start_matches('/')));
    }

    let html_dir = html_path.parent().unwrap_or(root_base(root));
    let html_relative_dir = html_dir.strip_prefix(root_base(root)).ok()?;
    normalize_relative_path(&html_relative_dir.join(normalized_url))
}

fn rewrite_integrity_attributes(
    html: &str,
    html_path: &Path,
    root: &Path,
    known_assets: &BTreeMap<String, Vec<u8>>,
) -> (String, usize) {
    let mut updated_count = 0;
    let rewritten = tag_regex().replace_all(html, |tag_caps: &Captures| {
        let Some(attrs) = tag_caps.name("attrs") else {
            return tag_caps[0].to_string();
        };
        let tag = &tag_caps[0];

        let mut src_or_href = None;
        let mut integrity = None;
        for attr_caps in attr_regex().captures_iter(attrs.as_str()) {
            let name = attr_caps
                .name("name")
                .map(|m| m.as_str().to_ascii_lowercase())
                .unwrap_or_default();
            let value = attr_caps
                .name("quoted")
                .or_else(|| attr_caps.name("bare"))
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();
            match name.as_str() {
                "src" | "href" => src_or_href = Some(value),
                "integrity" => integrity = Some(value),
                _ => {}
            }
        }

        let Some(asset_url) = src_or_href else {
            return tag.to_string();
        };
        let Some(existing_integrity) = integrity else {
            return tag.to_string();
        };
        if !is_local_asset_url(&asset_url) {
            return tag.to_string();
        }

        let Some(asset_key) = resolve_asset_key(&asset_url, html_path, root) else {
            return tag.to_string();
        };
        let Some(asset_bytes) = known_assets.get(&asset_key) else {
            return tag.to_string();
        };
        let Some(new_integrity) = recompute_integrity(&existing_integrity, asset_bytes) else {
            return tag.to_string();
        };

        updated_count += 1;
        integrity_regex()
            .replace(tag, |integrity_caps: &Captures| {
                let prefix = integrity_caps
                    .name("prefix")
                    .map(|m| m.as_str())
                    .unwrap_or(" ");
                if let Some(quote) = integrity_caps.name("quote").map(|m| m.as_str()) {
                    format!("{prefix}integrity={quote}{new_integrity}{quote}")
                } else {
                    format!("{prefix}integrity={new_integrity}")
                }
            })
            .to_string()
    });

    (rewritten.into_owned(), updated_count)
}

fn update_html_integrity_for_root(
    root: &Path,
    source_paths: &[PathBuf],
    public_path_prefix: Option<&str>,
) -> Result<usize> {
    let mut known_assets = BTreeMap::new();
    for source_path in source_paths {
        if source_path.strip_prefix(root).is_err() {
            continue;
        }
        let bytes = std::fs::read(source_path)?;
        for candidate in candidate_asset_urls(source_path, root, public_path_prefix) {
            known_assets.insert(candidate, bytes.clone());
        }
    }

    if known_assets.is_empty() {
        return Ok(0);
    }

    let mut updated_files = 0;
    let scan_root = if root.is_dir() {
        root.to_path_buf()
    } else {
        root.parent().unwrap_or(root).to_path_buf()
    };
    for entry in WalkDir::new(scan_root)
        .into_iter()
        .filter_map(|entry| entry.ok())
    {
        let path = entry.path();
        if !entry.file_type().is_file() || path.extension().is_none_or(|ext| ext != "html") {
            continue;
        }

        let file = SourceFile::<String>::load(&path.to_path_buf())?;
        let (rewritten, updated_count) =
            rewrite_integrity_attributes(&file.content, path, root, &known_assets);
        if updated_count == 0 || rewritten == file.content {
            continue;
        }

        debug!(
            "updated {} integrity attribute(s) in {}",
            updated_count,
            path.display()
        );
        SourceFile::new(path.to_path_buf(), rewritten).save(None)?;
        updated_files += 1;
    }

    Ok(updated_files)
}

pub fn update_html_integrity_for_sources(
    roots: &[PathBuf],
    source_paths: &[PathBuf],
    public_path_prefix: Option<&str>,
) -> Result<usize> {
    let mut updated_files = 0;
    for root in roots {
        updated_files += update_html_integrity_for_root(root, source_paths, public_path_prefix)?;
    }

    if updated_files > 0 {
        info!("updated integrity hashes in {updated_files} html file(s)");
    }
    Ok(updated_files)
}

#[cfg(test)]
mod tests {
    use super::{candidate_asset_urls, rewrite_integrity_attributes, STANDARD};
    use base64::Engine as _;
    use sha2::{Digest, Sha512};
    use std::{collections::BTreeMap, path::Path};

    #[test]
    fn rewrites_matching_integrity_hashes() {
        let original = b"console.log('before');";
        let updated = b"console.log('after');";
        let original_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(original)));
        let expected_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(updated)));
        let html = format!(
            r#"<script type="module" crossorigin src="/assets/app.js" integrity="{original_hash}"></script>"#
        );

        let mut assets = BTreeMap::new();
        assets.insert("assets/app.js".to_string(), updated.to_vec());

        let (rewritten, count) = rewrite_integrity_attributes(
            &html,
            Path::new("/tmp/dist/index.html"),
            Path::new("/tmp/dist"),
            &assets,
        );
        assert_eq!(count, 1);
        assert!(rewritten.contains(&expected_hash));
        assert!(!rewritten.contains(&original_hash));
    }

    #[test]
    fn ignores_external_assets() {
        let html =
            r#"<script src="https://cdn.example.com/app.js" integrity="sha512-old"></script>"#;
        let mut assets = BTreeMap::new();
        assets.insert("https://cdn.example.com/app.js".to_string(), b"x".to_vec());

        let (rewritten, count) = rewrite_integrity_attributes(
            html,
            Path::new("/tmp/dist/index.html"),
            Path::new("/tmp/dist"),
            &assets,
        );
        assert_eq!(count, 0);
        assert_eq!(rewritten, html);
    }

    #[test]
    fn rewrites_relative_asset_urls() {
        let original = b"console.log('before');";
        let updated = b"console.log('after');";
        let original_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(original)));
        let expected_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(updated)));
        let html =
            format!(r#"<script src="../assets/app.js" integrity="{original_hash}"></script>"#);

        let mut assets = BTreeMap::new();
        assets.insert("assets/app.js".to_string(), updated.to_vec());
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let root = tempdir.path();
        std::fs::create_dir_all(root.join("nested")).expect("Failed to create nested directory");
        let html_path = root.join("nested/index.html");

        let (rewritten, count) = rewrite_integrity_attributes(&html, &html_path, root, &assets);
        assert_eq!(count, 1);
        assert!(rewritten.contains(&expected_hash));
        assert!(!rewritten.contains(&original_hash));
    }

    #[test]
    fn candidate_asset_urls_include_public_path_prefix() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let root = tempdir.path().join("dist");
        let asset = root.join("assets/app.js");
        std::fs::create_dir_all(asset.parent().unwrap()).expect("Failed to create asset directory");
        std::fs::write(&asset, "console.log('x');").expect("Failed to write JS asset");

        let candidates = candidate_asset_urls(&asset, &root, Some("/static/"));

        assert!(candidates.contains("assets/app.js"));
        assert!(candidates.contains("/assets/app.js"));
        assert!(candidates.contains("static/assets/app.js"));
        assert!(candidates.contains("/static/assets/app.js"));
    }

    #[test]
    fn rewrites_integrity_without_touching_data_integrity() {
        let original_hash = "sha512-old";
        let expected_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(b"updated")));
        let html = format!(
            r#"<script data-integrity="keep-me" integrity="{original_hash}" src="/assets/app.js"></script>"#
        );

        let mut assets = BTreeMap::new();
        assets.insert("assets/app.js".to_string(), b"updated".to_vec());

        let (rewritten, count) = rewrite_integrity_attributes(
            &html,
            Path::new("/tmp/dist/index.html"),
            Path::new("/tmp/dist"),
            &assets,
        );
        assert_eq!(count, 1);
        assert!(rewritten.contains(r#"data-integrity="keep-me""#));
        assert!(rewritten.contains(&format!(r#"integrity="{expected_hash}""#)));
    }

    #[test]
    fn rewrites_unquoted_integrity_attributes() {
        let expected_hash = format!("sha512-{}", STANDARD.encode(Sha512::digest(b"updated")));
        let html = r#"<script src=/assets/app.js integrity=sha512-old></script>"#;

        let mut assets = BTreeMap::new();
        assets.insert("assets/app.js".to_string(), b"updated".to_vec());

        let (rewritten, count) = rewrite_integrity_attributes(
            html,
            Path::new("/tmp/dist/index.html"),
            Path::new("/tmp/dist"),
            &assets,
        );
        assert_eq!(count, 1);
        assert!(rewritten.contains("src=/assets/app.js"));
        assert!(rewritten.contains(&format!("integrity={expected_hash}")));
    }
}
