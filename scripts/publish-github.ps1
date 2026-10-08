param([Parameter(Mandatory=$true)][string]$RepositoryUrl)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if ($RepositoryUrl -notmatch '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?/?$') {
    throw 'Supply the HTTPS URL of your dedicated GitHub repository.'
}
$remotes = @(git remote)
if ($remotes -notcontains 'origin') { git remote add origin $RepositoryUrl }
elseif ((git remote get-url origin).TrimEnd('/') -ne $RepositoryUrl.TrimEnd('/')) {
    throw 'Origin points to a different repository. Inspect git remote -v before changing it.'
}
git push -u origin HEAD
if ($LASTEXITCODE -ne 0) {
    throw 'Push did not complete. Authenticate with GitHub when prompted. If README history differs, use a fresh clone and copy project source; do not force-push.'
}
Write-Output 'Uploaded. Add your friend in GitHub Settings > Collaborators, then share the repository link.'
