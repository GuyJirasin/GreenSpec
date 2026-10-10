$ErrorActionPreference = 'Stop'
$implementationRoot = $PSScriptRoot
function Invoke-ImplementationCheck {
    param([string]$Directory, [string[]]$Arguments)
    Push-Location -LiteralPath (Join-Path $implementationRoot $Directory)
    try {
        & npm.cmd @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Check failed in $Directory ($($Arguments -join ' '))" }
    } finally { Pop-Location }
}
Invoke-ImplementationCheck 'frontend' @('run','build')
Invoke-ImplementationCheck 'shared' @('test')
Invoke-ImplementationCheck 'qa' @('run','test:sql')
Invoke-ImplementationCheck 'qa' @('run','check:edges')
Invoke-ImplementationCheck 'qa' @('run','test:browser')
Invoke-ImplementationCheck 'qa' @('run','verify:originals')
Write-Host 'All available checks passed. Live Supabase runtime integration is a separate gate.'
