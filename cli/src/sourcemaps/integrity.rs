use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Path, PathBuf},
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
    Regex::new(r#"(?is)\b(?P<name>[a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?P<quote>["'])(?P<value>[^"']*)(?:["'])"#)
        .expect("valid attr regex")
}

fn integrity_regex() -> Regex {
    Regex::new(r#"(?is)\bintegrity\s*=\s*(?P<quote>["'])(?P<value>[^"']*)(?:["'])"#)
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

fn candidate_asset_urls(asset_path: &Path, root: &Path) -> BTreeSet<String> {
    let mut candidates = BTreeSet::new();
    candidates.insert(
        asset_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
    );

    let base = if root.is_dir() {
        root
    } else {
        root.parent().unwrap_or(root)
    };
    if let Ok(relative) = asset_path.strip_prefix(base) {
        let relative = relative.to_string_lossy().replace('\\', "/");
        candidates.insert(relative.clone());
        candidates.insert(format!("/{relative}"));
    }

    candidates
}

fn rewrite_integrity_attributes(
    html: &str,
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
                .name("value")
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

        let normalized_url = normalize_url_path(&asset_url);
        let Some(asset_bytes) = known_assets.get(normalized_url) else {
            return tag.to_string();
        };
        let Some(new_integrity) = recompute_integrity(&existing_integrity, asset_bytes) else {
            return tag.to_string();
        };

        updated_count += 1;
        integrity_regex()
            .replace(tag, |integrity_caps: &Captures| {
                let quote = integrity_caps
                    .name("quote")
                    .map(|m| m.as_str())
                    .unwrap_or("\"");
                format!("integrity={quote}{new_integrity}{quote}")
            })
            .to_string()
    });

    (rewritten.into_owned(), updated_count)
}

fn update_html_integrity_for_root(root: &Path, source_paths: &[PathBuf]) -> Result<usize> {
    let mut known_assets = BTreeMap::new();
    for source_path in source_paths {
        if source_path.strip_prefix(root).is_err() {
            continue;
        }
        let bytes = std::fs::read(source_path)?;
        for candidate in candidate_asset_urls(source_path, root) {
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
        let (rewritten, updated_count) = rewrite_integrity_attributes(&file.content, &known_assets);
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
) -> Result<usize> {
    let mut updated_files = 0;
    for root in roots {
        updated_files += update_html_integrity_for_root(root, source_paths)?;
    }

    if updated_files > 0 {
        info!("updated integrity hashes in {updated_files} html file(s)");
    }
    Ok(updated_files)
}

#[cfg(test)]
mod tests {
    use super::{rewrite_integrity_attributes, STANDARD};
    use base64::Engine as _;
    use sha2::{Digest, Sha512};
    use std::collections::BTreeMap;

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
        assets.insert("/assets/app.js".to_string(), updated.to_vec());

        let (rewritten, count) = rewrite_integrity_attributes(&html, &assets);
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

        let (rewritten, count) = rewrite_integrity_attributes(html, &assets);
        assert_eq!(count, 0);
        assert_eq!(rewritten, html);
    }
}
