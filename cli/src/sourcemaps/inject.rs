use anyhow::{bail, Result};
use std::{
    collections::BTreeSet,
    path::{Path, PathBuf},
};
use tracing::info;
use walkdir::{DirEntry, WalkDir};

use crate::{
    api::releases::{Release, ReleaseBuilder},
    sourcemaps::{
        args::{FileSelectionArgs, ReleaseArgs},
        content::SourceMapFile,
        integrity::update_html_integrity_for_sources,
        source_pairs::{read_pairs, SourcePair},
    },
    utils::{files::FileSelection, git::get_git_info},
};

#[derive(clap::Args)]
pub struct InjectArgs {
    #[clap(flatten)]
    pub file_selection: FileSelectionArgs,

    /// If your bundler adds a public path prefix to sourcemap URLs,
    /// we need to ignore it while searching for them
    /// For use alongside e.g. esbuilds "publicPath" config setting.
    #[arg(short, long)]
    pub public_path_prefix: Option<String>,

    #[clap(flatten)]
    pub release: ReleaseArgs,
}

impl InjectArgs {
    pub fn validate(&self) -> Result<()> {
        self.file_selection.validate()
    }
}

pub fn inject_impl(
    args: &InjectArgs,
    matcher: impl Fn(&DirEntry) -> bool + 'static,
    existing_release: Option<&Release>,
) -> Result<()> {
    let InjectArgs {
        file_selection,
        public_path_prefix,
        release,
    } = args;

    info!("injecting selection: {}", file_selection);

    let resolved_file_selection = file_selection.clone().resolve_stdin()?;
    let iterator = FileSelection::try_from(resolved_file_selection.clone())?;

    let mut pairs = read_pairs(
        iterator.into_iter().filter(|entry| matcher(entry)),
        public_path_prefix,
    );
    if pairs.is_empty() {
        bail!("no source files found");
    }

    let created_release_id = if let Some(r) = existing_release {
        Some(r.id.to_string())
    } else {
        let cwd = std::env::current_dir()?;
        get_release_for_maps(&cwd, release.clone(), pairs.iter().map(|p| &p.sourcemap))?
            .as_ref()
            .map(|r| r.id.to_string())
    };

    pairs = inject_pairs(pairs, created_release_id)?;

    // Write the source and sourcemaps back to disk
    for pair in &pairs {
        pair.save()?;
    }
    let updated_sources = pairs
        .iter()
        .map(|pair| pair.source.inner.path.clone())
        .collect::<Vec<_>>();
    let resolved_roots = resolved_file_selection
        .directory
        .iter()
        .filter_map(|path| path.canonicalize().ok())
        .map(|path| normalize_integrity_root(&path))
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    update_html_integrity_for_sources(&resolved_roots, &updated_sources)?;
    info!("injecting done");
    Ok(())
}

fn normalize_integrity_root(path: &Path) -> PathBuf {
    let mut current = if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent().unwrap_or(path).to_path_buf()
    };
    let fallback = current.clone();

    loop {
        if subtree_contains_html(&current) {
            return current;
        }
        let Some(parent) = current.parent() else {
            return fallback;
        };
        if parent == current {
            return fallback;
        }
        current = parent.to_path_buf();
    }
}

fn subtree_contains_html(path: &Path) -> bool {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .any(|entry| {
            entry.file_type().is_file() && entry.path().extension().is_some_and(|ext| ext == "html")
        })
}

pub fn inject_pairs(
    mut pairs: Vec<SourcePair>,
    created_release_id: Option<String>,
) -> Result<Vec<SourcePair>> {
    for pair in &mut pairs {
        let current_release_id = pair.get_release_id();
        // We only update release ids and chunk ids when the release id changed or is not present
        if current_release_id != created_release_id || pair.get_chunk_id().is_none() {
            pair.set_release_id(created_release_id.clone());

            let chunk_id = uuid::Uuid::now_v7().to_string();
            if let Some(previous_chunk_id) = pair.get_chunk_id() {
                pair.update_chunk_id(previous_chunk_id, chunk_id)?;
            } else {
                pair.add_chunk_id(chunk_id)?;
            }
        }
    }

    Ok(pairs)
}

pub fn get_release_for_maps<'a>(
    directory: &Path,
    release: ReleaseArgs,
    maps: impl IntoIterator<Item = &'a SourceMapFile>,
) -> Result<Option<Release>> {
    // We need to fetch or create a release if: the user specified one, any pair is missing one, or the user
    // forced release overriding
    let needs_release = release.name.is_some()
        || release.version.is_some()
        || maps.into_iter().any(|p| !p.has_release_id());

    let mut created_release = None;
    if needs_release {
        let mut builder: ReleaseBuilder = release.into();

        get_git_info(Some(directory.to_path_buf()))?.map(|info| builder.with_git(info));

        if builder.can_create() {
            created_release = Some(builder.fetch_or_create()?);
        }
    }

    Ok(created_release)
}

#[cfg(test)]
mod tests {
    use super::normalize_integrity_root;

    #[test]
    fn normalize_integrity_root_expands_file_inputs_to_html_root() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let dist = tempdir.path().join("dist");
        let assets = dist.join("assets");
        std::fs::create_dir_all(&assets).expect("Failed to create asset directory");
        std::fs::write(dist.join("index.html"), "<html></html>").expect("Failed to write HTML");
        std::fs::write(assets.join("app.js"), "console.log('x');").expect("Failed to write JS");

        let normalized = normalize_integrity_root(&assets.join("app.js"));
        assert_eq!(normalized, dist);
    }
}
