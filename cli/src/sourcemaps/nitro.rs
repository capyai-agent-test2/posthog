use anyhow::{Context, Result};
use base64::Engine;
use serde_json::{Map, Value};
use sha1::Sha1;
use sha2::Digest;
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    time::SystemTime,
};

use crate::sourcemaps::source_pairs::SourcePair;

const ASSET_MAP_PREFIX: &str = "const assets = ";

pub fn rewrite_asset_maps_for_pairs(pairs: &[SourcePair]) -> Result<()> {
    for manifest_path in find_manifest_paths(pairs)? {
        rewrite_asset_map(&manifest_path)?;
    }

    Ok(())
}

fn find_manifest_paths(pairs: &[SourcePair]) -> Result<HashSet<PathBuf>> {
    let mut manifest_paths = HashSet::new();

    for pair in pairs {
        for candidate in [&pair.source.inner.path, &pair.sourcemap.inner.path] {
            if let Some(output_dir) = find_output_dir(candidate)? {
                for relative_manifest_path in [
                    Path::new("server/chunks/nitro/nitro.mjs"),
                    Path::new("server/index.mjs"),
                ] {
                    let manifest_path = output_dir.join(relative_manifest_path);
                    if manifest_path.exists() {
                        manifest_paths.insert(manifest_path);
                    }
                }
            }
        }
    }

    Ok(manifest_paths)
}

fn find_output_dir(path: &Path) -> Result<Option<PathBuf>> {
    let canonical_path = path
        .canonicalize()
        .with_context(|| format!("failed to canonicalize {}", path.display()))?;

    let mut current = canonical_path.parent();
    while let Some(dir) = current {
        if dir.file_name().is_some_and(|name| name == "public") {
            return Ok(dir.parent().map(Path::to_path_buf));
        }
        current = dir.parent();
    }

    Ok(None)
}

fn rewrite_asset_map(manifest_path: &Path) -> Result<()> {
    let content = fs::read_to_string(manifest_path)
        .with_context(|| format!("failed to read {}", manifest_path.display()))?;
    let Some((asset_map_start, asset_map_end)) = find_asset_map_bounds(&content) else {
        return Ok(());
    };

    let asset_map = &content[asset_map_start + ASSET_MAP_PREFIX.len()..=asset_map_end];
    let mut assets: Map<String, Value> = serde_json::from_str(asset_map)
        .with_context(|| format!("failed to parse asset map in {}", manifest_path.display()))?;

    let public_dir = find_server_dir(manifest_path)
        .and_then(Path::parent)
        .map(|path| path.join("public"))
        .filter(|path| path.exists());
    let Some(public_dir) = public_dir else {
        return Ok(());
    };

    for (asset_path, asset_entry) in assets.iter_mut() {
        let Some(asset_object) = asset_entry.as_object_mut() else {
            continue;
        };
        let Some(asset_file_path) = resolve_asset_file_path(&public_dir, asset_object, asset_path)
        else {
            continue;
        };
        if !asset_file_path.exists() {
            continue;
        }

        let asset_bytes = fs::read(&asset_file_path)
            .with_context(|| format!("failed to read {}", asset_file_path.display()))?;
        let asset_metadata = fs::metadata(&asset_file_path)
            .with_context(|| format!("failed to stat {}", asset_file_path.display()))?;

        asset_object.insert(
            "etag".to_string(),
            Value::String(create_nitro_etag(&asset_bytes)),
        );
        asset_object.insert(
            "mtime".to_string(),
            Value::String(to_iso_millis(asset_metadata.modified()?)),
        );
        asset_object.insert(
            "size".to_string(),
            Value::Number(serde_json::Number::from(asset_bytes.len() as u64)),
        );
    }

    let asset_map_suffix_start = content[asset_map_end..]
        .find(';')
        .map(|offset| asset_map_end + offset + 1)
        .context("failed to find nitro asset map terminator")?;
    let updated_asset_map = format!(
        "{ASSET_MAP_PREFIX}{};",
        serde_json::to_string_pretty(&assets)?
    );
    let updated_content = format!(
        "{}{}{}",
        &content[..asset_map_start],
        updated_asset_map,
        &content[asset_map_suffix_start..]
    );
    fs::write(manifest_path, updated_content)
        .with_context(|| format!("failed to write {}", manifest_path.display()))?;

    Ok(())
}

fn find_asset_map_bounds(content: &str) -> Option<(usize, usize)> {
    let start = content.find(ASSET_MAP_PREFIX)?;
    let asset_start = start + ASSET_MAP_PREFIX.len();

    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (offset, character) in content[asset_start..].char_indices() {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }
            if character == '\\' {
                escaped = true;
            } else if character == '"' {
                in_string = false;
            }
            continue;
        }

        match character {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some((start, asset_start + offset));
                }
            }
            _ => {}
        }
    }

    None
}

fn find_server_dir(path: &Path) -> Option<&Path> {
    let mut current = path.parent();
    while let Some(dir) = current {
        if dir.file_name().is_some_and(|name| name == "server") {
            return Some(dir);
        }
        current = dir.parent();
    }

    None
}

fn resolve_asset_file_path(
    public_dir: &Path,
    asset_object: &Map<String, Value>,
    asset_path: &str,
) -> Option<PathBuf> {
    if let Some(relative_path) = asset_object
        .get("path")
        .and_then(Value::as_str)
        .and_then(|path| path.strip_prefix("../public/"))
    {
        return Some(public_dir.join(relative_path));
    }

    Some(public_dir.join(asset_path.trim_start_matches('/')))
}

fn create_nitro_etag(asset_bytes: &[u8]) -> String {
    let mut digest = Sha1::new();
    digest.update(asset_bytes);
    let encoded = base64::engine::general_purpose::STANDARD.encode(digest.finalize());
    format!(
        "\"{:x}-{}\"",
        asset_bytes.len(),
        encoded.trim_end_matches('=')
    )
}

fn to_iso_millis(value: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(value)
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn rewrites_existing_nitro_asset_entries() {
        let temp_dir = tempdir().expect("failed to create temp dir");
        let output_dir = temp_dir.path().join(".output");
        let public_dir = output_dir.join("public/_nuxt");
        let nitro_dir = output_dir.join("server/chunks/nitro");
        fs::create_dir_all(&public_dir).expect("failed to create public dir");
        fs::create_dir_all(&nitro_dir).expect("failed to create nitro dir");

        let source_path = public_dir.join("app.js");
        let map_path = public_dir.join("app.js.map");
        fs::write(
            &source_path,
            "console.log('mutated app chunk')\n//# chunkId=123\n",
        )
        .expect("failed to write source");
        fs::write(
            &map_path,
            r#"{"version":3,"sources":[],"names":[],"mappings":""}"#,
        )
        .expect("failed to write sourcemap");

        let source_metadata = fs::metadata(&source_path).expect("failed to stat source");
        let source_mtime = chrono::DateTime::<chrono::Utc>::from(
            source_metadata
                .modified()
                .expect("failed to read source mtime"),
        )
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let source_size = source_metadata.len();
        let source_etag =
            create_nitro_etag(&fs::read(&source_path).expect("failed to read source for etag"));

        let manifest_path = nitro_dir.join("nitro.mjs");
        fs::write(
            &manifest_path,
            r#"const assets = {
  "/_nuxt/app.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4-old\"",
    "mtime": "2026-04-22T21:18:39.023Z",
    "size": 4,
    "path": "../public/_nuxt/app.js"
  },
  "/_nuxt/app.js.map": {
    "type": "application/json",
    "etag": "\"4-old\"",
    "mtime": "2026-04-22T21:18:39.023Z",
    "size": 4,
    "path": "../public/_nuxt/app.js.map"
  }
};
"#,
        )
        .expect("failed to write manifest");

        rewrite_asset_map(&manifest_path).expect("failed to rewrite manifest");

        let manifest = fs::read_to_string(&manifest_path).expect("failed to read manifest");
        let (asset_map_start, asset_map_end) =
            find_asset_map_bounds(&manifest).expect("failed to find asset map");
        let assets: Map<String, Value> = serde_json::from_str(
            &manifest[asset_map_start + ASSET_MAP_PREFIX.len()..=asset_map_end],
        )
        .expect("failed to parse rewritten asset map");
        let source_asset = assets
            .get("/_nuxt/app.js")
            .and_then(Value::as_object)
            .expect("failed to read source asset entry");
        assert_eq!(
            source_asset.get("etag").and_then(Value::as_str),
            Some(source_etag.as_str())
        );
        assert_eq!(
            source_asset.get("mtime").and_then(Value::as_str),
            Some(source_mtime.as_str())
        );
        assert_eq!(
            source_asset.get("size").and_then(Value::as_u64),
            Some(source_size)
        );
        assert_eq!(
            source_asset.get("type").and_then(Value::as_str),
            Some("text/javascript; charset=utf-8")
        );
    }
}
