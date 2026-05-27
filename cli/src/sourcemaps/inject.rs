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
        .collect::<BTreeSet<_>>()
        .into_iter()
        .map(|path| {
            let search_boundary = integrity_search_boundary(&path);
            let relevant_sources = updated_sources
                .iter()
                .filter(|source| source.starts_with(&path) || path.starts_with(source))
                .cloned()
                .collect::<Vec<_>>();
            normalize_integrity_root(
                &path,
                &relevant_sources,
                public_path_prefix.as_deref(),
                Some(search_boundary.as_path()),
            )
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    update_html_integrity_for_sources(
        &resolved_roots,
        &updated_sources,
        public_path_prefix.as_deref(),
    )?;
    info!("injecting done");
    Ok(())
}

fn normalize_integrity_root(
    path: &Path,
    relevant_sources: &[PathBuf],
    public_path_prefix: Option<&str>,
    search_boundary: Option<&Path>,
) -> PathBuf {
    let sources = if relevant_sources.is_empty() {
        vec![path.to_path_buf()]
    } else {
        relevant_sources.to_vec()
    };

    let mut current = if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent().unwrap_or(path).to_path_buf()
    };
    let fallback = current.clone();
    let mut best_match = None;

    loop {
        match subtree_html_reference_status(&current, &sources, public_path_prefix) {
            HtmlReferenceStatus::ContainsReference => best_match = Some(current.clone()),
            HtmlReferenceStatus::ContainsHtmlWithoutReference | HtmlReferenceStatus::NoHtml => {}
        }
        let Some(parent) = current.parent() else {
            return best_match.unwrap_or(fallback);
        };
        if parent == current {
            return best_match.unwrap_or(fallback);
        }
        if let Some(boundary) = search_boundary {
            if !parent.starts_with(boundary) {
                return best_match.unwrap_or(fallback);
            }
        }
        current = parent.to_path_buf();
    }
}

fn integrity_search_boundary(path: &Path) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir().and_then(|path| path.canonicalize()) {
        if path.starts_with(&cwd) {
            return cwd;
        }
    }

    if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent().unwrap_or(path).to_path_buf()
    }
}

enum HtmlReferenceStatus {
    NoHtml,
    ContainsHtmlWithoutReference,
    ContainsReference,
}

fn subtree_html_reference_status(
    root: &Path,
    asset_paths: &[PathBuf],
    public_path_prefix: Option<&str>,
) -> HtmlReferenceStatus {
    let candidates = asset_paths
        .iter()
        .filter_map(|asset_path| {
            let relative = asset_path
                .strip_prefix(root)
                .ok()
                .map(|path| path.to_string_lossy().replace('\\', "/"))?;
            let mut candidates = vec![relative.clone(), format!("/{relative}")];
            if let Some(prefix) = public_path_prefix
                .map(|prefix| prefix.trim_matches('/'))
                .filter(|prefix| !prefix.is_empty())
            {
                candidates.push(format!("{prefix}/{relative}"));
                candidates.push(format!("/{prefix}/{relative}"));
            }
            Some(candidates)
        })
        .flatten()
        .collect::<Vec<_>>();
    if candidates.is_empty() {
        return HtmlReferenceStatus::NoHtml;
    }

    let mut saw_html = false;
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_map(|entry| entry.ok())
    {
        if !entry.file_type().is_file()
            || !entry.path().extension().is_some_and(|ext| ext == "html")
        {
            continue;
        }

        saw_html = true;
        if std::fs::read_to_string(entry.path())
            .map(|html| candidates.iter().any(|candidate| html.contains(candidate)))
            .unwrap_or(false)
        {
            return HtmlReferenceStatus::ContainsReference;
        }
    }

    if saw_html {
        HtmlReferenceStatus::ContainsHtmlWithoutReference
    } else {
        HtmlReferenceStatus::NoHtml
    }
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
    use super::{integrity_search_boundary, normalize_integrity_root};

    #[test]
    fn normalize_integrity_root_expands_file_inputs_to_html_root() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let dist = tempdir.path().join("dist");
        let assets = dist.join("assets");
        std::fs::create_dir_all(&assets).expect("Failed to create asset directory");
        std::fs::write(
            dist.join("index.html"),
            r#"<script src="/assets/app.js"></script>"#,
        )
        .expect("Failed to write HTML");
        std::fs::write(assets.join("app.js"), "console.log('x');").expect("Failed to write JS");

        let normalized = normalize_integrity_root(
            &assets.join("app.js"),
            &[assets.join("app.js")],
            None,
            Some(tempdir.path()),
        );
        assert_eq!(normalized, dist);
    }

    #[test]
    fn normalize_integrity_root_prefers_highest_matching_ancestor() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let dist = tempdir.path().join("dist");
        let nested = dist.join("nested");
        let assets = nested.join("assets");
        std::fs::create_dir_all(&assets).expect("Failed to create asset directory");
        std::fs::write(
            dist.join("index.html"),
            r#"<script src="/nested/assets/app.js"></script>"#,
        )
        .expect("Failed to write parent HTML");
        std::fs::write(
            nested.join("index.html"),
            r#"<script src="/assets/app.js"></script>"#,
        )
        .expect("Failed to write nested HTML");
        std::fs::write(assets.join("app.js"), "console.log('x');").expect("Failed to write JS");

        let normalized = normalize_integrity_root(
            &assets.join("app.js"),
            &[assets.join("app.js")],
            None,
            Some(tempdir.path()),
        );
        assert_eq!(normalized, dist);
    }

    #[test]
    fn normalize_integrity_root_expands_directory_inputs_to_html_root() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let dist = tempdir.path().join("dist");
        let assets = dist.join("assets");
        std::fs::create_dir_all(&assets).expect("Failed to create asset directory");
        std::fs::write(
            dist.join("index.html"),
            r#"<script src="/assets/app.js"></script>"#,
        )
        .expect("Failed to write HTML");
        std::fs::write(assets.join("app.js"), "console.log('x');").expect("Failed to write JS");

        let normalized = normalize_integrity_root(
            &assets,
            &[assets.join("app.js")],
            None,
            Some(tempdir.path()),
        );
        assert_eq!(normalized, dist);
    }

    #[test]
    fn normalize_integrity_root_respects_search_boundary() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let project = tempdir.path().join("project");
        let dist = project.join("dist");
        let assets = dist.join("assets");
        std::fs::create_dir_all(&assets).expect("Failed to create asset directory");
        std::fs::write(
            tempdir.path().join("index.html"),
            r#"<script src="/project/dist/assets/app.js"></script>"#,
        )
        .expect("Failed to write outer HTML");
        std::fs::write(assets.join("app.js"), "console.log('x');").expect("Failed to write JS");

        let normalized = normalize_integrity_root(
            &assets.join("app.js"),
            &[assets.join("app.js")],
            None,
            Some(&project),
        );
        assert_eq!(normalized, assets);
    }

    #[test]
    fn integrity_search_boundary_falls_back_to_input_scope_outside_cwd() {
        let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
        let dir = tempdir.path().join("external/dist/assets");
        std::fs::create_dir_all(&dir).expect("Failed to create directory");
        let file = dir.join("app.js");
        std::fs::write(&file, "console.log('x');").expect("Failed to write JS");

        assert_eq!(integrity_search_boundary(&dir), dir);
        assert_eq!(integrity_search_boundary(&file), dir);
    }
}
