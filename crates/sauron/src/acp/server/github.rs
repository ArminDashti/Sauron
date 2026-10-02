use super::*;
use sauron_sdk_types::custom_requests::{
    GitHubAccountDto, GitHubIssueDto, GitHubPullDto, GitHubQuery, GitHubQueryData,
    GitHubQueryRequest, GitHubQueryResponse, GitHubRepoDto,
};
use serde::Deserialize;

pub(crate) const GITHUB_TOKEN_CONFIG_KEY: &str = "GITHUB_PERSONAL_ACCESS_TOKEN";
const GITHUB_API_BASE: &str = "https://api.github.com";
const DEFAULT_PER_PAGE: u32 = 30;
const MAX_PER_PAGE: u32 = 100;

#[derive(Debug, Deserialize)]
struct GitHubUserResponse {
    login: String,
    name: Option<String>,
    avatar_url: String,
    html_url: String,
}

#[derive(Debug, Deserialize)]
struct GitHubRepoResponse {
    id: i64,
    name: String,
    full_name: String,
    owner: GitHubOwnerResponse,
    description: Option<String>,
    html_url: String,
    private: bool,
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubOwnerResponse {
    login: String,
}

#[derive(Debug, Deserialize)]
struct GitHubIssueResponse {
    number: i64,
    title: String,
    html_url: String,
    state: String,
    user: Option<GitHubOwnerResponse>,
    updated_at: Option<String>,
    pull_request: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct GitHubPullResponse {
    number: i64,
    title: String,
    html_url: String,
    state: String,
    user: Option<GitHubOwnerResponse>,
    updated_at: Option<String>,
    draft: Option<bool>,
}

pub(crate) fn github_api_url(query: &GitHubQuery) -> Result<String, agent_client_protocol::Error> {
    let per_page = |value: Option<u32>| value.unwrap_or(DEFAULT_PER_PAGE).clamp(1, MAX_PER_PAGE);
    let page = |value: Option<u32>| value.unwrap_or(1).max(1);

    match query {
        GitHubQuery::Account => Ok(format!("{GITHUB_API_BASE}/user")),
        GitHubQuery::Repos {
            page: page_opt,
            per_page: per_page_opt,
        } => Ok(format!(
            "{GITHUB_API_BASE}/user/repos?sort=updated&direction=desc&per_page={}&page={}",
            per_page(*per_page_opt),
            page(*page_opt)
        )),
        GitHubQuery::Issues {
            owner,
            repo,
            page: page_opt,
            per_page: per_page_opt,
        } => {
            validate_owner_repo(owner, repo)?;
            Ok(format!(
                "{GITHUB_API_BASE}/repos/{}/{}/issues?state=open&per_page={}&page={}",
                owner,
                repo,
                per_page(*per_page_opt),
                page(*page_opt)
            ))
        }
        GitHubQuery::Pulls {
            owner,
            repo,
            page: page_opt,
            per_page: per_page_opt,
        } => {
            validate_owner_repo(owner, repo)?;
            Ok(format!(
                "{GITHUB_API_BASE}/repos/{}/{}/pulls?state=open&per_page={}&page={}",
                owner,
                repo,
                per_page(*per_page_opt),
                page(*page_opt)
            ))
        }
    }
}

fn validate_owner_repo(owner: &str, repo: &str) -> Result<(), agent_client_protocol::Error> {
    if owner.trim().is_empty() || repo.trim().is_empty() {
        return Err(
            agent_client_protocol::Error::invalid_params().data("owner and repo are required")
        );
    }
    if owner.contains('/') || repo.contains('/') || owner.contains(' ') || repo.contains(' ') {
        return Err(agent_client_protocol::Error::invalid_params()
            .data("owner and repo must be simple path segments"));
    }
    Ok(())
}

pub(crate) fn require_github_token(
    token: Result<String, crate::config::ConfigError>,
) -> Result<String, agent_client_protocol::Error> {
    match token {
        Ok(token) if !token.is_empty() => Ok(token),
        Ok(_) | Err(crate::config::ConfigError::NotFound(_)) => {
            Err(agent_client_protocol::Error::invalid_params()
                .data("GitHub is not connected. Sign in first."))
        }
        Err(e) => Err(agent_client_protocol::Error::internal_error().data(e.to_string())),
    }
}

impl SauronAcpAgent {
    pub(super) async fn on_github_query(
        &self,
        req: GitHubQueryRequest,
    ) -> Result<GitHubQueryResponse, agent_client_protocol::Error> {
        let config = self.config()?;
        let token = require_github_token(config.get_secret::<String>(GITHUB_TOKEN_CONFIG_KEY))?;

        let url = github_api_url(&req.query)?;
        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {token}"))
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "sauron-desktop")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()
            .await
            .internal_err()?;

        let status = response.status();
        if status.as_u16() == 401 {
            return Err(agent_client_protocol::Error::invalid_params()
                .data("GitHub authorization expired. Sign in again."));
        }
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(agent_client_protocol::Error::internal_error()
                .data(format!("GitHub API error ({status}): {body}")));
        }

        let data = match req.query {
            GitHubQuery::Account => {
                let user: GitHubUserResponse = response.json().await.internal_err()?;
                GitHubQueryData::Account {
                    account: GitHubAccountDto {
                        login: user.login,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        html_url: user.html_url,
                    },
                }
            }
            GitHubQuery::Repos { .. } => {
                let repos: Vec<GitHubRepoResponse> = response.json().await.internal_err()?;
                GitHubQueryData::Repos {
                    repos: repos
                        .into_iter()
                        .map(|repo| GitHubRepoDto {
                            id: repo.id,
                            name: repo.name,
                            full_name: repo.full_name,
                            owner_login: repo.owner.login,
                            description: repo.description,
                            html_url: repo.html_url,
                            private: repo.private,
                            updated_at: repo.updated_at,
                        })
                        .collect(),
                }
            }
            GitHubQuery::Issues { .. } => {
                let issues: Vec<GitHubIssueResponse> = response.json().await.internal_err()?;
                GitHubQueryData::Issues {
                    issues: issues
                        .into_iter()
                        .filter(|issue| issue.pull_request.is_none())
                        .map(|issue| GitHubIssueDto {
                            number: issue.number,
                            title: issue.title,
                            html_url: issue.html_url,
                            state: issue.state,
                            user_login: issue.user.map(|user| user.login),
                            updated_at: issue.updated_at,
                        })
                        .collect(),
                }
            }
            GitHubQuery::Pulls { .. } => {
                let pulls: Vec<GitHubPullResponse> = response.json().await.internal_err()?;
                GitHubQueryData::Pulls {
                    pulls: pulls
                        .into_iter()
                        .map(|pull| GitHubPullDto {
                            number: pull.number,
                            title: pull.title,
                            html_url: pull.html_url,
                            state: pull.state,
                            user_login: pull.user.map(|user| user.login),
                            updated_at: pull.updated_at,
                            draft: pull.draft.unwrap_or(false),
                        })
                        .collect(),
                }
            }
        };

        Ok(GitHubQueryResponse { data })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_url() {
        assert_eq!(
            github_api_url(&GitHubQuery::Account).unwrap(),
            "https://api.github.com/user"
        );
    }

    #[test]
    fn repos_url_defaults_and_clamps() {
        assert_eq!(
            github_api_url(&GitHubQuery::Repos {
                page: None,
                per_page: None,
            })
            .unwrap(),
            "https://api.github.com/user/repos?sort=updated&direction=desc&per_page=30&page=1"
        );
        assert_eq!(
            github_api_url(&GitHubQuery::Repos {
                page: Some(2),
                per_page: Some(500),
            })
            .unwrap(),
            "https://api.github.com/user/repos?sort=updated&direction=desc&per_page=100&page=2"
        );
    }

    #[test]
    fn issues_and_pulls_require_owner_repo() {
        let err = github_api_url(&GitHubQuery::Issues {
            owner: String::new(),
            repo: "repo".into(),
            page: None,
            per_page: None,
        })
        .unwrap_err();
        assert_eq!(
            err.code,
            agent_client_protocol::Error::invalid_params().code
        );

        assert_eq!(
            github_api_url(&GitHubQuery::Pulls {
                owner: "octocat".into(),
                repo: "hello".into(),
                page: Some(1),
                per_page: Some(10),
            })
            .unwrap(),
            "https://api.github.com/repos/octocat/hello/pulls?state=open&per_page=10&page=1"
        );
    }

    #[test]
    fn missing_token_errors_without_network() {
        let err = require_github_token(Err(crate::config::ConfigError::NotFound(
            "GITHUB_PERSONAL_ACCESS_TOKEN".into(),
        )))
        .unwrap_err();
        assert_eq!(
            err.code,
            agent_client_protocol::Error::invalid_params().code
        );
        assert!(format!("{:?}", err).contains("not connected") || err.data.is_some());

        let empty = require_github_token(Ok(String::new())).unwrap_err();
        assert_eq!(
            empty.code,
            agent_client_protocol::Error::invalid_params().code
        );
    }
}
