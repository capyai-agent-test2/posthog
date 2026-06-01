use crate::{
    api::{auth, errors::FlagError},
    router::State as AppState,
};
use axum::{
    debug_handler,
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    response::{IntoResponse, Json, Response},
};
use base64::{engine::general_purpose::URL_SAFE, Engine};
use common_types::TeamId;
use serde::Deserialize;
use serde_json::Value;
use sqlx::types::Json as SqlxJson;
use std::sync::Arc;
use tracing::warn;

const REDACTED_PAYLOAD_VALUE: &str = "\"********* (encrypted)\"";

#[derive(Debug, Deserialize)]
pub struct RemoteConfigPath {
    project_id: i32,
    flag_key: String,
}

#[derive(Debug, sqlx::FromRow)]
struct RemoteConfigFlag {
    filters: SqlxJson<Value>,
    has_encrypted_payloads: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AuthMethod {
    PersonalApiKey,
    SecretApiKey,
}

#[debug_handler]
pub async fn remote_config(
    State(state): State<AppState>,
    Path(path): Path<RemoteConfigPath>,
    headers: HeaderMap,
    method: Method,
) -> Result<Response, FlagError> {
    if method != Method::GET {
        return Ok(StatusCode::METHOD_NOT_ALLOWED.into_response());
    }

    let auth_method = authenticate_remote_config(&state, path.project_id, &headers).await?;

    let Some(flag) = fetch_remote_config_flag(&state, path.project_id, &path.flag_key).await?
    else {
        return Ok(StatusCode::NOT_FOUND.into_response());
    };

    let payload = flag
        .filters
        .get("payloads")
        .and_then(Value::as_object)
        .and_then(|payloads| payloads.get("true"))
        .cloned()
        .unwrap_or(Value::Null);

    if !flag.has_encrypted_payloads {
        return Ok(Json(payload).into_response());
    }

    let response_payload = if auth_method == AuthMethod::PersonalApiKey {
        decrypt_payload(&state.config.secret_key, &payload)?
    } else {
        Value::String(REDACTED_PAYLOAD_VALUE.to_string())
    };

    Ok(Json(response_payload).into_response())
}

fn flag_service(state: &AppState) -> crate::flags::flag_service::FlagService {
    crate::flags::flag_service::FlagService::new(
        state.redis_client.clone(),
        state.database_pools.non_persons_reader.clone(),
        state.team_hypercache_reader.clone(),
        state.flags_hypercache_reader.clone(),
        state.flag_definitions_cache.clone(),
        state.team_negative_cache.clone(),
        *state.config.skip_pg_team_fallback,
    )
}

async fn fetch_remote_config_flag(
    state: &AppState,
    project_id: i32,
    flag_key: &str,
) -> Result<Option<RemoteConfigFlag>, FlagError> {
    let pool = &state.database_pools.non_persons_reader;

    let query = if let Ok(flag_id) = flag_key.parse::<i32>() {
        sqlx::query_as::<_, RemoteConfigFlag>(
            r#"
            SELECT f.filters, COALESCE(f.has_encrypted_payloads, false) AS has_encrypted_payloads
            FROM posthog_featureflag f
            INNER JOIN posthog_team t ON f.team_id = t.id
            WHERE t.project_id = $1
              AND f.id = $2
              AND f.is_remote_configuration IS TRUE
            LIMIT 1
            "#,
        )
        .bind(project_id)
        .bind(flag_id)
    } else {
        sqlx::query_as::<_, RemoteConfigFlag>(
            r#"
            SELECT f.filters, COALESCE(f.has_encrypted_payloads, false) AS has_encrypted_payloads
            FROM posthog_featureflag f
            INNER JOIN posthog_team t ON f.team_id = t.id
            WHERE t.project_id = $1
              AND f.key = $2
              AND f.is_remote_configuration IS TRUE
            LIMIT 1
            "#,
        )
        .bind(project_id)
        .bind(flag_key)
    };

    query.fetch_optional(pool.as_ref()).await.map_err(|e| {
        warn!(error = %e, "Failed to fetch remote config flag");
        FlagError::DatabaseError(e, Some("Failed to fetch remote config flag".to_string()))
    })
}

async fn authenticate_remote_config(
    state: &AppState,
    project_id: i32,
    headers: &HeaderMap,
) -> Result<AuthMethod, FlagError> {
    if let Some(token) = auth::extract_team_secret_token(headers) {
        let team = fetch_project_team(state, project_id).await?;
        auth::validate_secret_api_token_for_team(state, &token, team.id).await?;
        return Ok(AuthMethod::SecretApiKey);
    }

    if let Some(key) = auth::extract_personal_api_key(headers)? {
        let team = fetch_project_team(state, project_id).await?;
        let pak_id =
            auth::validate_personal_api_key_with_scopes_for_team(state, &key, &team).await?;

        if !*state.config.skip_writes {
            let redis = state.redis_client.clone();
            let pg_writer: Arc<dyn common_database::Client + Send + Sync> =
                state.database_pools.non_persons_writer.clone();
            drop(crate::api::pak_usage::record_pak_last_used(redis, pg_writer, pak_id).await);
        }

        return Ok(AuthMethod::PersonalApiKey);
    }

    Err(FlagError::NoAuthenticationProvided)
}

async fn fetch_project_team(
    state: &AppState,
    project_id: i32,
) -> Result<crate::team::team_models::Team, FlagError> {
    let team_id = sqlx::query_scalar::<_, TeamId>(
        r#"
        SELECT id
        FROM posthog_team
        WHERE project_id = $1
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(project_id)
    .fetch_optional(state.database_pools.non_persons_reader.as_ref())
    .await
    .map_err(|e| {
        warn!(error = %e, "Failed to fetch remote config project team");
        FlagError::DatabaseError(
            e,
            Some("Failed to fetch remote config project team".to_string()),
        )
    })?
    .ok_or(FlagError::RowNotFound)?;

    flag_service(state).get_team_by_id(team_id).await
}

fn decrypt_payload(secret_key: &str, payload: &Value) -> Result<Value, FlagError> {
    let Some(encrypted_payload) = payload.as_str() else {
        return Ok(Value::Null);
    };

    let fernet = fernet::Fernet::new(&fernet_key(secret_key)).ok_or_else(|| {
        FlagError::Internal("Failed to initialize remote config payload decryptor".to_string())
    })?;

    let decrypted = fernet.decrypt(encrypted_payload).map_err(|e| {
        FlagError::Internal(format!("Failed to decrypt remote config payload: {e}"))
    })?;

    String::from_utf8(decrypted)
        .map(Value::String)
        .map_err(|e| FlagError::Internal(format!("Failed to decode remote config payload: {e}")))
}

fn fernet_key(secret_key: &str) -> String {
    let key_bytes = secret_key.as_bytes();
    let mut padded_key = vec![0; 32usize.saturating_sub(key_bytes.len())];
    padded_key.extend_from_slice(key_bytes);
    padded_key.truncate(32);
    URL_SAFE.encode(padded_key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fernet_key_pads_short_secret_key() {
        assert_eq!(
            fernet_key("secret"),
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABzZWNyZXQ="
        );
    }

    #[test]
    fn test_fernet_key_truncates_long_secret_key() {
        assert_eq!(
            fernet_key("123456789012345678901234567890123"),
            "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
        );
    }
}
