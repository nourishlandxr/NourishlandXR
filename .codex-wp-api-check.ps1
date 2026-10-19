$wpUser = Read-Host 'WordPress username for the account with the CODEX app password'
$securePass = Read-Host 'WordPress Application Password (input is masked)' -AsSecureString
$ptr = [IntPtr]::Zero
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $plainPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${wpUser}:${plainPass}"))
    $headers = @{ Authorization = "Basic $basic" }
    $result = Invoke-RestMethod -Uri 'https://nourishland.org/wp-json/wp/v2/users/me?context=edit' -Headers $headers -Method Get -TimeoutSec 30
    [pscustomobject]@{ connected = $true; id = $result.id; username = $result.slug; name = $result.name; roles = ($result.roles -join ',') } | ConvertTo-Json -Compress
} catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    [pscustomobject]@{ connected = $false; status = $status; message = $_.Exception.Message } | ConvertTo-Json -Compress
} finally {
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    Remove-Variable plainPass,basic,headers,securePass -ErrorAction SilentlyContinue
}
